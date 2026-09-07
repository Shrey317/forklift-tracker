import { randomBytes } from 'node:crypto';

/**
 * Generates a QR token: 32 bytes from a cryptographically secure random
 * source, base64url-encoded (Locked Decision #39). Never client-supplied,
 * never derived from anything predictable — this is the only thing a QR
 * code ever encodes (wrapped in the deep-link URL, Locked Decision #31),
 * and it's what the field-flow route resolves /forklift/[code] by, so it
 * must be unguessable.
 */
export function generateQrToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The full deep-link URL a QR code encodes (Locked Decision #31). */
export function buildQrDeepLink(qrToken: string): string {
  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) {
    throw new Error('APP_BASE_URL is not configured — cannot build a QR deep link.');
  }
  return `${appBaseUrl.replace(/\/$/, '')}/forklift/${qrToken}`;
}
