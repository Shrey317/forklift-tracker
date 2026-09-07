'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CameraScanner } from '@/components/forms/camera-scanner';
import { ForkliftSearch } from '@/components/forms/forklift-search';
import { parseScannedQrContent } from '@/lib/qr-parse';

export default function ScanPage() {
  const router = useRouter();
  const [scanError, setScanError] = useState<string | null>(null);

  function goToForklift(code: string) {
    router.push(`/forklift/${encodeURIComponent(code)}`);
  }

  function handleScan(raw: string) {
    const code = parseScannedQrContent(raw);
    if (!code) {
      // Locked Decision #20: a failed scan shows a clear retry state, and
      // the page/scanner keeps running rather than getting stuck — the
      // camera component itself doesn't stop on a bad read, so this is
      // just a transient message, not a dead end.
      setScanError("That QR code doesn't match a forklift. Try again, or search below.");
      return;
    }
    setScanError(null);
    goToForklift(code);
  }

  return (
    <main className="mx-auto flex h-full max-w-sm flex-col items-center gap-8 px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Scan a forklift</h1>

      <CameraScanner onScan={handleScan} />
      {scanError && (
        <p role="alert" className="text-sm text-danger">
          {scanError}
        </p>
      )}

      {/* Search is always visible, never hidden behind a toggle the
          camera has to fail before revealing — Section 25: camera
          permission denied, unsupported, or timed-out all land on the
          same clear fallback, and the person is never stuck on a dead
          camera view with no way forward. */}
      <div className="flex w-full items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        OR SEARCH
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <ForkliftSearch onSelect={goToForklift} />
    </main>
  );
}
