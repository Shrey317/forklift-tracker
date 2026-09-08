'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

/**
 * Dashboard-scoped error boundary. Catches errors within the dashboard
 * layout without losing the user's session or navigation context.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: 'dashboard-error' });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <span className="text-xl">⚠</span>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          This page encountered an error. Your data has not been affected.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-md bg-blue-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
      >
        Try again
      </button>
    </div>
  );
}
