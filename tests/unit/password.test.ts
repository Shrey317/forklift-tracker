import { describe, expect, it } from 'vitest';
import {
  DUMMY_HASH_FOR_TIMING_PARITY,
  hashPassword,
  verifyPassword,
} from '@/server/services/auth/password';

describe('password hashing (Section 21)', () => {
  const testPassword = 'HaHjniooamR7xxPyYvTAjQQe';

  it('encodes as scrypt$N$r$p$salt$hash with 6 parts', async () => {
    const hash = await hashPassword(testPassword);
    const parts = hash.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
  });

  it('verifies the correct password', async () => {
    const hash = await hashPassword(testPassword);
    expect(await verifyPassword(testPassword, hash)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword(testPassword);
    expect(await verifyPassword('wrong-password-entirely', hash)).toBe(false);
  });

  it('rejects an empty password', async () => {
    const hash = await hashPassword(testPassword);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt) but both still verify', async () => {
    const hash1 = await hashPassword(testPassword);
    const hash2 = await hashPassword(testPassword);
    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(testPassword, hash1)).toBe(true);
    expect(await verifyPassword(testPassword, hash2)).toBe(true);
  });

  it('never throws on a malformed stored hash — treats it as no-match', async () => {
    await expect(verifyPassword(testPassword, 'not-a-real-hash')).resolves.toBe(false);
    await expect(
      verifyPassword(testPassword, 'scrypt$16384$8$1$onlyonemorepart'),
    ).resolves.toBe(false);
  });

  // Regression test: Node's Buffer.from(x, 'hex') does not throw on
  // invalid hex — it silently decodes to a zero-length buffer, and
  // timingSafeEqual(empty, empty) is true. Without the explicit hex/length
  // validation in verifyPassword, THIS EXACT CASE authenticated as valid
  // for any password against a corrupted hash. Caught by testing, not
  // code review — kept here so it can never silently regress.
  it('rejects a stored hash with non-hex salt/hash fields, regardless of the password given', async () => {
    const corrupted = 'scrypt$16384$8$1$zzzznothex$zzzznothex';
    expect(await verifyPassword('literally anything', corrupted)).toBe(false);
    expect(await verifyPassword(testPassword, corrupted)).toBe(false);
  });

  it('rejects a stored hash whose decoded key length does not match KEY_LENGTH', async () => {
    const shortKey = `scrypt$16384$8$1$${'00'.repeat(16)}$${'00'.repeat(4)}`; // 4-byte key, not 64
    expect(await verifyPassword(testPassword, shortKey)).toBe(false);
  });

  it('the dummy timing-parity hash is well-formed and never verifies', async () => {
    expect(await verifyPassword('anything at all', DUMMY_HASH_FOR_TIMING_PARITY)).toBe(false);
  });
});
