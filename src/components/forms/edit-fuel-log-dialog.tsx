'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './field';
import { StatusMessage } from './status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';

interface EditFuelLogDialogProps {
  open: boolean;
  fuelLog: { id: string; fuelAmountLiters: string; fuelCostZar: string | null; readingAtRefuel: string; notes: string | null };
  onClose: () => void;
  onSaved: () => void;
}

export function EditFuelLogDialog({ open, fuelLog, onClose, onSaved }: EditFuelLogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fuelAmountLiters, setFuelAmountLiters] = useState(fuelLog.fuelAmountLiters);
  const [fuelCostZar, setFuelCostZar] = useState(fuelLog.fuelCostZar ?? '');
  const [readingAtRefuel, setReadingAtRefuel] = useState(fuelLog.readingAtRefuel);
  const [notes, setNotes] = useState(fuelLog.notes ?? '');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setFuelAmountLiters(fuelLog.fuelAmountLiters);
      setFuelCostZar(fuelLog.fuelCostZar ?? '');
      setReadingAtRefuel(fuelLog.readingAtRefuel);
      setNotes(fuelLog.notes ?? '');
      setReason('');
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on the open transition
  }, [open]);

  async function handleSave() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/fuel-logs/${fuelLog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelAmountLiters,
          fuelCostZar: fuelCostZar || undefined,
          readingAtRefuel,
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
      className="w-full max-w-md rounded-lg border border-slate-200 p-0 shadow-lg backdrop:bg-slate-900/40"
      aria-labelledby="edit-fuel-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="edit-fuel-title" className="text-lg font-semibold text-slate-900">
          Edit fuel entry
        </h2>

        <Field
          label="Fuel amount (litres)"
          type="number"
          step="0.01"
          value={fuelAmountLiters}
          onChange={(e) => setFuelAmountLiters(e.target.value)}
        />
        <Field
          label="Cost (ZAR)"
          type="number"
          step="0.01"
          value={fuelCostZar}
          onChange={(e) => setFuelCostZar(e.target.value)}
          hint="Optional"
        />
        <Field
          label="Reading at refuel (km)"
          type="number"
          step="0.1"
          value={readingAtRefuel}
          onChange={(e) => setReadingAtRefuel(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-fuel-notes" className="text-sm font-medium text-slate-900">
            Notes
          </label>
          <textarea
            id="edit-fuel-notes"
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
