'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  toast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: 'success' | 'error') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* aria-live region: Section 25's "screen-reader announcement when a
          save succeeds or fails, not just a toast a sighted user happens
          to see" — the announcement and the visual toast are the same
          element here, not two separate mechanisms to keep in sync. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={
              t.type === 'error'
                ? 'pointer-events-auto rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg ring-1 ring-danger/50'
                : 'pointer-events-auto rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg'
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
