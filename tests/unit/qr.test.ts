import { describe, expect, it } from 'vitest';
import { generateQrToken, buildQrDeepLink } from '@/server/services/forklifts/qr-token';
import { generateQrCodePng } from '@/server/services/forklifts/qr-code';

describe('QR token generation (Locked Decision #39)', () => {
  it('produces a base64url string decoding to exactly 32 bytes', () => {
    const token = generateQrToken();
    const decoded = Buffer.from(token, 'base64url');
    expect(decoded).toHaveLength(32);
  });

  it('never repeats across calls', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateQrToken()));
    expect(tokens.size).toBe(200);
  });

  it('is URL-safe (no +, /, or = characters)', () => {
    const token = generateQrToken();
    expect(token).not.toMatch(/[+/=]/);
  });
});

describe('QR deep link (Locked Decision #31)', () => {
  const originalBaseUrl = process.env.APP_BASE_URL;

  it('encodes the full deep-link URL, not a bare token', () => {
    process.env.APP_BASE_URL = 'https://forklifts.example.com';
    const link = buildQrDeepLink('abc123');
    expect(link).toBe('https://forklifts.example.com/forklift/abc123');
    process.env.APP_BASE_URL = originalBaseUrl;
  });

  it('strips a trailing slash from APP_BASE_URL to avoid a double slash', () => {
    process.env.APP_BASE_URL = 'https://forklifts.example.com/';
    const link = buildQrDeepLink('abc123');
    expect(link).toBe('https://forklifts.example.com/forklift/abc123');
    process.env.APP_BASE_URL = originalBaseUrl;
  });

  it('throws clearly if APP_BASE_URL is not configured, rather than encoding a broken link', () => {
    delete process.env.APP_BASE_URL;
    expect(() => buildQrDeepLink('abc123')).toThrow();
    process.env.APP_BASE_URL = originalBaseUrl;
  });
});

describe('QR code PNG rendering', () => {
  const originalBaseUrl = process.env.APP_BASE_URL;

  it('renders a valid, non-trivial PNG', async () => {
    process.env.APP_BASE_URL = 'https://forklifts.example.com';
    const png = await generateQrCodePng('abc123');

    // PNG magic bytes
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.length).toBeGreaterThan(200); // not an empty/degenerate image

    process.env.APP_BASE_URL = originalBaseUrl;
  });
});
