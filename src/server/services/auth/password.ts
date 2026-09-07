import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// util.promisify(crypto.scrypt) only resolves to ONE of Node's overloaded
// scrypt signatures at the type level (the 3-arg form without options),
// rejecting the 4-arg (with-options) call this module needs even though it
// works correctly at runtime. An explicit wrapper sidesteps the ambiguity
// entirely rather than fighting promisify's overload inference.
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// scrypt cost parameters. N must be a power of 2. These are Node's own
// recommended defaults for interactive-login use (RFC 7914 §2 background):
// higher N would slow login noticeably; lower N weakens the hash. Encoded
// alongside the hash itself (Section 21) so a future tuning change can't
// silently break verification of passwords hashed under the old params.
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16; // minimum per Section 21

/**
 * Hashes a password with asynchronous scrypt (never scryptSync, which would
 * block the event loop on a serverless invocation). Encodes algorithm, cost
 * parameters, salt, and hash together in one string:
 *   scrypt$N$r$p$saltHex$hashHex
 * so verification never depends on parameters that live only in code and
 * could drift from what a given row was actually hashed with.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await scrypt(plaintext, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2, // scrypt's default maxmem is too low for N=16384
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Re-derives a hash from the submitted password using the stored salt and
 * parameters, then compares with crypto.timingSafeEqual. Buffer lengths are
 * checked BEFORE calling timingSafeEqual, because it throws on a length
 * mismatch rather than returning false — and an uncaught throw would leak
 * timing/behavioral information through the exception path itself
 * (Section 21). A malformed stored hash (wrong field count, bad hex) is
 * treated as "does not match" rather than propagating an error, for the
 * same reason.
 */
const HEX_PATTERN = /^[0-9a-f]+$/i;

export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
    if (!nStr || !rStr || !pStr || !saltHex || !hashHex) return false;

    const N = Number.parseInt(nStr, 10);
    const r = Number.parseInt(rStr, 10);
    const p = Number.parseInt(pStr, 10);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    if (N <= 0 || r <= 0 || p <= 0) return false;

    // Node's Buffer.from(x, 'hex') does NOT throw on invalid hex — it
    // silently stops at the first bad character and returns whatever it
    // managed to decode, which can be a zero-length buffer. Without this
    // check, a corrupted or tampered stored hash (garbage in the salt/hash
    // fields) would degenerate into comparing two empty buffers, and
    // timingSafeEqual(empty, empty) is true — meaning ANY password would
    // "verify" against a malformed hash. Reject non-hex input explicitly
    // before it ever reaches Buffer.from.
    if (!HEX_PATTERN.test(saltHex) || saltHex.length % 2 !== 0) return false;
    if (!HEX_PATTERN.test(hashHex) || hashHex.length % 2 !== 0) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const storedKey = Buffer.from(hashHex, 'hex');

    // Pin to the exact key length this module generates, rather than
    // trusting whatever length the stored value happens to decode to —
    // closes the same class of degenerate-short-key issue for any other
    // future caller of this function, not just the specific hex case above.
    if (storedKey.length !== KEY_LENGTH || salt.length === 0) return false;

    const derivedKey = await scrypt(plaintext, salt, storedKey.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    });

    if (derivedKey.length !== storedKey.length) return false;
    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

/**
 * A fixed, precomputed dummy hash used to run a real scrypt derivation even
 * when the submitted username doesn't exist — so an unknown-username login
 * takes the same time as a known-username-wrong-password login, and the
 * response timing itself can't reveal which usernames are real (this
 * complements, not replaces, the identical INVALID_CREDENTIALS response
 * body required by Locked Decision #35).
 */
export const DUMMY_HASH_FOR_TIMING_PARITY =
  'scrypt$16384$8$1$00000000000000000000000000000000$' + '0'.repeat(128);
