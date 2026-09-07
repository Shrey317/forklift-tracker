'use client';

import { useEffect, useRef } from 'react';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Uses the native <dialog> element's showModal(), which gives Section
 * 25's "keyboard-operable dialogs (including a working Escape-to-close
 * and returned focus)" for free at the browser level — a native <dialog>
 * traps focus and returns it to the triggering element on close without
 * any extra code, which is more robust than reimplementing that by hand.
 *
 * NOTE: not the shadcn/ui Dialog component Section 22 names — this
 * sandbox can't reach ui.shadcn.com's registry (confirmed by testing,
 * same class of limitation as Prisma's binary CDN). Same visual/
 * interaction contract, built on the platform primitive instead of
 * shadcn's Radix-based one.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault(); // we drive open/close via props, not the dialog's own cancel event
        onCancel();
      }}
      className="w-full max-w-sm rounded-lg border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="text-sm text-slate-600">
          {description}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
