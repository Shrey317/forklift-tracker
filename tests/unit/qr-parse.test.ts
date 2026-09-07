import { describe, expect, it } from 'vitest';
import { parseScannedQrContent } from '@/lib/qr-parse';

describe('parseScannedQrContent (Locked Decision #31)', () => {
  it('extracts the qrToken from a well-formed deep link', () => {
    expect(parseScannedQrContent('https://forklifts.example.com/forklift/abc123XYZ')).toBe('abc123XYZ');
  });

  it('handles a trailing slash', () => {
    expect(parseScannedQrContent('https://forklifts.example.com/forklift/abc123/')).toBe('abc123');
  });

  it('handles a base64url token containing hyphens and underscores', () => {
    expect(parseScannedQrContent('https://forklifts.example.com/forklift/aB3-xY_9Qw')).toBe('aB3-xY_9Qw');
  });

  it('returns null for a URL that is not a forklift deep link', () => {
    expect(parseScannedQrContent('https://forklifts.example.com/admin/dashboard')).toBeNull();
  });

  it('returns null for a completely unrelated QR code (not even a URL)', () => {
    expect(parseScannedQrContent('this is just some random text')).toBeNull();
  });

  it('extracts the code from a /forklift/{code} path regardless of which domain scanned it', () => {
    // Deliberately does NOT check origin here. An adversarial QR pointing
    // at some other domain still only yields a candidate code string,
    // which then has to survive a real database lookup
    // (GET /api/forklifts/lookup) that exact-matches a 32-byte random
    // qrToken — an attacker can't predict a valid one, so this just
    // resolves to a normal NOT_FOUND downstream. Checking origin here
    // would add complexity without closing any actual risk.
    expect(parseScannedQrContent('https://totally-different-site.com/forklift/abc123')).toBe('abc123');
  });

  it('returns null for a nested or malformed path', () => {
    expect(parseScannedQrContent('https://forklifts.example.com/forklift/abc/extra')).toBeNull();
    expect(parseScannedQrContent('https://forklifts.example.com/forklift/')).toBeNull();
  });
});
