'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './field';
import { StatusMessage } from './status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';
import { getTrackingUnit } from '@/lib/format';

interface EditShiftDialogProps {
  open: boolean;
  shift: { id: string; startingReading: string; endingReading: string | null; notes: string | null; trackingMode: string };
  onClose: () => void;
  onSaved: () => void;
}

export function EditShiftDialog({ open, shift, onClose, onSaved }: EditShiftDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [startingReading, setStartingReading] = useState(shift.startingReading);
  const [endingReading, setEndingReading] = useState(shift.endingReading ?? '');
  const [notes, setNotes] = useState(shift.notes ?? '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStartingReading(shift.startingReading);
      setEndingReading(shift.endingReading ?? '');
      setNotes(shift.notes ?? '');
      setReason('');
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetting form fields only when the dialog transitions open, not on every shift prop change
  }, [open]);

  async function handleSave() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startingReading,
          ...(endingReading ? { endingReading } : {}),
          notes,
          reason: reason.trim() || undefined,
        }),
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
      aria-labelledby="edit-shift-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="edit-shift-title" className="text-lg font-semibold text-slate-900">
          Edit shift
        </h2>

        <Field
          label={`Starting reading (${getTrackingUnit(shift.trackingMode)})`}
          type="number"
          step="0.1"
          value={startingReading}
          onChange={(e) => setStartingReading(e.target.value)}
        />
        {shift.endingReading !== null && (
          <Field
            label={`Ending reading (${getTrackingUnit(shift.trackingMode)})`}
            type="number"
            step="0.1"
            value={endingReading}
            onChange={(e) => setEndingReading(e.target.value)}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-shift-notes" className="text-sm font-medium text-slate-900">
            Notes
          </label>
          <textarea
            id="edit-shift-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <Field
          label="Reason for this correction"
          hint="Optional, but recorded in the audit log"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <StatusMessage status={error ? 'error' : null} message={error} />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Save
          </Button>
        </div>
      </div>
    </dialog>
  );
}
