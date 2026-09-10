'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { StatusMessage } from '@/components/forms/status-message';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';
import { useToast } from '@/components/ui/toast';
import { useAdminUser } from '@/components/admin/admin-provider';

export default function NewForkliftPage() {
  const user = useAdminUser();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [powerSource, setPowerSource] = useState('DIESEL');
  const [trackingMode, setTrackingMode] = useState('MILEAGE');
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
        body: JSON.stringify({ name, manufacturer, model, powerSource, trackingMode }),
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

  if (user.role !== 'ADMIN') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-600">You do not have permission to add new forklifts.</p>
        <Button className="mt-4" onClick={() => router.push('/admin/forklifts')}>Go back</Button>
      </div>
    );
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

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-900">Power Source</label>
          <select
            value={powerSource}
            onChange={(e) => setPowerSource(e.target.value)}
            className="w-full min-h-11 rounded-md border px-3 py-2 text-base outline-none bg-white border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-foreground"
          >
            <option value="DIESEL">Diesel</option>
            <option value="LPG">LPG</option>
            <option value="ELECTRIC">Electric</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-900">Tracking Mode</label>
          <select
            value={trackingMode}
            onChange={(e) => setTrackingMode(e.target.value)}
            className="w-full min-h-11 rounded-md border px-3 py-2 text-base outline-none bg-white border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-foreground"
          >
            <option value="MILEAGE">Mileage (km)</option>
            <option value="ENGINE_HOURS">Engine Hours</option>
          </select>
        </div>

        <StatusMessage status={error ? 'error' : null} message={error} />

        <Button type="submit" loading={loading}>
          Create forklift
        </Button>
      </form>
    </div>
  );
}
