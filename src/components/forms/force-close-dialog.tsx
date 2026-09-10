'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './field';
import { StatusMessage } from './status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';
import { getTrackingUnit, formatReading } from '@/lib/format';

interface ForceCloseDialogProps {
  open: boolean;
  shift: { id: string; displayId: string; startingReading: string; trackingMode: string };
  onClose: () => void;
  onSaved: () => void;
}

/** Locked Decision #8: no automatic detection of forgotten shifts — this is the manual admin force-close. */
export function ForceCloseDialog({ open, shift, onClose, onSaved }: ForceCloseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [endingReading, setEndingReading] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setEndingReading('');
      setNotes('');
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/shifts/${shift.id}/force-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endingReading, notes: notes.trim() || undefined }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(getFriendlyErrorMessage(body.error?.code, body.error?.message ?? 'Something went wrong.'));
        return;
      }

      onSaved();
    } catch {
      setError('The system is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-md rounded-lg border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
      aria-labelledby="force-close-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="force-close-title" className="text-lg font-semibold text-slate-900">
          Force-close shift on {shift.displayId}
        </h2>
        <p className="text-sm text-slate-600">
          Started at {formatReading(shift.startingReading, shift.trackingMode)}. This ends the shift on the operator&apos;s behalf — use this
          for a shift that was never properly ended.
        </p>

        <Field
          label={`Ending reading (${getTrackingUnit(shift.trackingMode)})`}
          type="number"
          step="0.1"
          min={Number(shift.startingReading)}
          required
          value={endingReading}
          onChange={(e) => setEndingReading(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="force-close-notes" className="text-sm font-medium text-slate-900">
            Notes
          </label>
          <textarea
            id="force-close-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>

        <StatusMessage status={error ? 'error' : null} message={error} />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading}>
            Force-close
          </Button>
        </div>
      </div>
    </dialog>
  );
}
