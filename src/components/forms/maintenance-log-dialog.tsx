'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './field';
import { StatusMessage } from './status-message';
import { ForkliftSelect } from './forklift-select';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';

interface MaintenanceLogDialogProps {
  open: boolean;
  /** undefined = create mode; provided = edit mode */
  existing?: {
    id: string;
    forkliftId: string;
    date: string;
    description: string;
    costZar: string | null;
    status: 'SCHEDULED' | 'COMPLETED';
  };
  onClose: () => void;
  onSaved: () => void;
}

export function MaintenanceLogDialog({ open, existing, onClose, onSaved }: MaintenanceLogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isEdit = !!existing;

  const [forkliftId, setForkliftId] = useState(existing?.forkliftId ?? '');
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(existing?.description ?? '');
  const [costZar, setCostZar] = useState(existing?.costZar ?? '');
  const [status, setStatus] = useState<'SCHEDULED' | 'COMPLETED'>(existing?.status ?? 'SCHEDULED');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setForkliftId(existing?.forkliftId ?? '');
      setDate(existing?.date ?? new Date().toISOString().slice(0, 10));
      setDescription(existing?.description ?? '');
      setCostZar(existing?.costZar ?? '');
      setStatus(existing?.status ?? 'SCHEDULED');
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
      const res = isEdit
        ? await fetch(`/api/maintenance-logs/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description,
              costZar: costZar || undefined,
              status,
              reason: reason.trim() || undefined,
            }),
          })
        : await fetch('/api/maintenance-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forkliftId, date, description, costZar: costZar || undefined, status }),
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
      aria-labelledby="maintenance-dialog-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="maintenance-dialog-title" className="text-lg font-semibold text-slate-900">
          {isEdit ? 'Edit maintenance entry' : 'Add maintenance entry'}
        </h2>

        {!isEdit && <ForkliftSelect value={forkliftId} onChange={setForkliftId} required />}
        {!isEdit && (
          <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="maintenance-description" className="text-sm font-medium text-slate-900">
            Description
          </label>
          <textarea
            id="maintenance-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>

        <Field
          label="Cost (ZAR)"
          type="number"
          step="0.01"
          value={costZar}
          onChange={(e) => setCostZar(e.target.value)}
          hint="Optional"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="maintenance-status" className="text-sm font-medium text-slate-900">
            Status
          </label>
          <select
            id="maintenance-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'SCHEDULED' | 'COMPLETED')}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {isEdit && (
          <Field
            label="Reason for this correction"
            hint="Optional, but recorded in the audit log"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}

        <StatusMessage status={error ? 'error' : null} message={error} />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={loading} disabled={!isEdit && !forkliftId}>
            {isEdit ? 'Save' : 'Add entry'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
