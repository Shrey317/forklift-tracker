'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { StatusMessage } from '@/components/forms/status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';
import { useToast } from '@/components/ui/toast';

export default function NewForkliftPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNameError(null);

    try {
      const res = await fetch('/api/forklifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, manufacturer, model }),
      });
      const body = await res.json();

      if (!res.ok) {
        const code = body.error?.code as string | undefined;
        if (code === 'VALIDATION_FAILED') {
          setNameError('Name must be 3–80 characters; manufacturer and model are required.');
        } else {
          setError(getFriendlyErrorMessage(code, body.error?.message ?? 'Something went wrong.'));
        }
        return;
      }

      toast(`${body.data.displayId} created.`, 'success');
      router.push(`/admin/forklifts/${body.data.id}`);
    } catch {
      setError('The system is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Add forklift</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={80}
          error={nameError ?? undefined}
        />
        <Field label="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} required />
        <Field label="Model" value={model} onChange={(e) => setModel(e.target.value)} required />

        <StatusMessage status={error ? 'error' : null} message={error} />

        <Button type="submit" loading={loading}>
          Create forklift
        </Button>
      </form>
    </div>
  );
}
