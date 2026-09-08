'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from './field';
import { StatusMessage } from './status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';

import { useToast } from '@/components/ui/toast';

interface StartShiftFormProps {
  forkliftId: string;
  forkliftCode: string;
}

export function StartShiftForm({ forkliftId, forkliftCode }: StartShiftFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [startingReading, setStartingReading] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldError(null);

    try {
      const res = await fetch('/api/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forkliftId,
          startingReading,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        const code = body.error?.code as string | undefined;
        if (code === 'INVALID_READING') {
          setFieldError(getFriendlyErrorMessage(code, body.error?.message));
        } else {
          setError(getFriendlyErrorMessage(code, body.error?.message ?? 'Something went wrong.'));
        }
        return;
      }

      toast('Shift started successfully.', 'success');
      router.push(`/forklift/${forkliftCode}`);
      router.refresh();
    } catch {
      setError('The system is temporarily unavailable. Your data has not been saved. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Starting reading (km)"
        name="startingReading"
        type="number"
        inputMode="decimal"
        step="0.1"
        min={0}
        required
        value={startingReading}
        onChange={(e) => setStartingReading(e.target.value)}
        error={fieldError ?? undefined}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-slate-900">
          Notes <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          className="rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>

      <StatusMessage status={error ? 'error' : null} message={error} />

      <Button type="submit" loading={loading} className="w-full">
        Start shift
      </Button>
    </form>
  );
}
