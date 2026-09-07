import QRCode from 'qrcode';
import { buildQrDeepLink } from './qr-token';

/**
 * Renders a QR code PNG encoding {APP_BASE_URL}/forklift/{qrToken} — the
 * full deep-link URL, not a bare token (Locked Decision #31), so a scan
 * from any camera app lands on the right page, not just the in-app
 * scanner.
 */
export async function generateQrCodePng(qrToken: string): Promise<Buffer> {
  const deepLink = buildQrDeepLink(qrToken);
  return QRCode.toBuffer(deepLink, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
  });
}
