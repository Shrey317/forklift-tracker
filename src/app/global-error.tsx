'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

/**
 * Root-level error boundary. Catches uncaught errors in the entire
 * application (including the root layout). Shows a professional recovery
 * message — never exposes stack traces, database errors, or internal details.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: 'global-error' });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 font-sans text-slate-900">
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <span className="text-2xl">⚠</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              An unexpected error occurred. Your data has not been affected. Please try again, or
              contact your administrator if the problem persists.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-md bg-blue-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
