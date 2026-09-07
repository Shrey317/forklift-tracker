/**
 * Parses a scanned QR code's decoded content into the forklift `code`
 * (the qrToken) it should route to. The QR encodes the full deep-link URL
 * {APP_BASE_URL}/forklift/{qrToken} (Locked Decision #31), not a bare
 * token — so this function has to actually parse a URL, not just accept
 * whatever string the scanner handed back. Returns null for anything that
 * doesn't parse as a URL matching that exact shape, including a QR code
 * for something else entirely (a competitor's product barcode, a URL to
 * some other site) — the caller treats that as a scan error, not a route.
 */
export function parseScannedQrContent(scanned: string): string | null {
  let url: URL;
  try {
    url = new URL(scanned);
  } catch {
    return null;
  }

  const match = url.pathname.match(/^\/forklift\/([^/]+)\/?$/);
  const rawCode = match?.[1];
  if (!rawCode) return null;

  try {
    return decodeURIComponent(rawCode);
  } catch {
    return null;
  }
}
