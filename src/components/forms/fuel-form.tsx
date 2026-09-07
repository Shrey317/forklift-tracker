'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from './field';
import { StatusMessage } from './status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';

interface FuelFormProps {
  forkliftId: string;
  forkliftCode: string;
}

export function FuelForm({ forkliftId, forkliftCode }: FuelFormProps) {
  const router = useRouter();
  const [fuelAmountLiters, setFuelAmountLiters] = useState('');
  const [fuelCostZar, setFuelCostZar] = useState('');
  const [readingAtRefuel, setReadingAtRefuel] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setReadingError(null);

    try {
      const res = await fetch('/api/fuel-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forkliftId,
          fuelAmountLiters,
          fuelCostZar: fuelCostZar.trim() || undefined,
          readingAtRefuel,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        const code = body.error?.code as string | undefined;
        if (code === 'INVALID_READING') {
          setReadingError(getFriendlyErrorMessage(code, body.error?.message));
        } else {
          setError(getFriendlyErrorMessage(code, body.error?.message ?? 'Something went wrong.'));
        }
        return;
      }

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
        label="Fuel amount (litres)"
        name="fuelAmountLiters"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0.01}
        required
        value={fuelAmountLiters}
        onChange={(e) => setFuelAmountLiters(e.target.value)}
      />
      <Field
        label="Cost (ZAR)"
        name="fuelCostZar"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        value={fuelCostZar}
        onChange={(e) => setFuelCostZar(e.target.value)}
        hint="Optional"
      />
      <Field
        label="Reading at refuel (km)"
        name="readingAtRefuel"
        type="number"
        inputMode="decimal"
        step="0.1"
        min={0}
        required
        value={readingAtRefuel}
        onChange={(e) => setReadingAtRefuel(e.target.value)}
        error={readingError ?? undefined}
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
        Record fuel
      </Button>
    </form>
  );
}
