'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

type ScannerState = 'starting' | 'scanning' | 'denied' | 'unsupported' | 'error';

QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

interface CameraScannerProps {
  onScan: (code: string) => void;
}

/**
 * Locked Decision #20 / Section 25: permission denied, unsupported, and
 * timed-out/errored all land on the same clear retry/manual-search
 * fallback — the parent page (scan/page.tsx) is what actually renders the
 * manual-search alternative; this component's job is just to report which
 * of those states it's in, honestly, rather than getting stuck silently.
 *
 * NOTE: this could not be run against a real camera/browser in the
 * sandbox this was built in (server-side Node has neither). Built
 * carefully against qr-scanner's documented API, but treat this as the
 * single highest-priority thing to manually verify on an actual phone
 * before relying on it — camera permission flows in particular vary
 * enough across browsers that this deserves a real device test.
 */
export function CameraScanner({ onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [state, setState] = useState<ScannerState>('starting');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!videoRef.current) return;

      const hasCamera = await QrScanner.hasCamera().catch(() => false);
      if (cancelled) return;
      if (!hasCamera) {
        setState('unsupported');
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!cancelled) onScan(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // rear camera — this is a warehouse floor tool, not a selfie scanner
        },
      );
      scannerRef.current = scanner;

      try {
        await scanner.start();
        if (!cancelled) setState('scanning');
      } catch (err) {
        if (cancelled) return;
        console.error('Camera start error:', err);
        const name = err instanceof DOMException ? err.name : (err instanceof Error ? err.name : '');
        setState(name === 'NotAllowedError' ? 'denied' : 'error');
      }
    }

    start();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onScan intentionally not in deps; re-subscribing would restart the camera on every parent re-render
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg bg-slate-900">
        {/* qr-scanner attaches its own video stream to this element directly */}
        <video ref={videoRef} className="w-full" muted playsInline aria-label="Camera preview for QR scanning" />
      </div>

      {state === 'starting' && <p className="text-sm text-slate-500">Starting camera…</p>}
      {state === 'denied' && (
        <p role="alert" className="text-sm text-danger">
          Camera access was denied. Use search below instead.
        </p>
      )}
      {state === 'unsupported' && (
        <p role="alert" className="text-sm text-danger">
          No camera is available on this device. Use search below instead.
        </p>
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm text-danger">
          Couldn&apos;t start the camera. Use search below instead.
        </p>
      )}
    </div>
  );
}
