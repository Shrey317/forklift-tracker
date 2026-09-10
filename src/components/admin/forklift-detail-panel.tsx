'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { StatusMessage } from '@/components/forms/status-message';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { getFriendlyErrorMessage } from '@/lib/api-error-messages';

interface ForkliftDetailPanelProps {
  forklift: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    status: string;
    powerSource: string;
    trackingMode: string;
    isActive: boolean;
  };
}

const STATUS_OPTIONS = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'];

export function ForkliftDetailPanel({ forklift }: ForkliftDetailPanelProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState(forklift.name);
  const [manufacturer, setManufacturer] = useState(forklift.manufacturer);
  const [model, setModel] = useState(forklift.model);
  const [status, setStatus] = useState(forklift.status);
  const [powerSource, setPowerSource] = useState(forklift.powerSource);
  const [trackingMode, setTrackingMode] = useState(forklift.trackingMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/forklifts/${forklift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, manufacturer, model, status, powerSource, trackingMode }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(getFriendlyErrorMessage(body.error?.code, body.error?.message ?? 'Something went wrong.'));
        return;
      }

      toast('Forklift updated.', 'success');
      router.refresh();
    } catch {
      setError('The system is temporarily unavailable. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setTogglingActive(true);
    setToggleError(null);

    try {
      const res = forklift.isActive
        ? await fetch(`/api/forklifts/${forklift.id}/deactivate`, { method: 'POST' })
        : await fetch(`/api/forklifts/${forklift.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: true }),
          });
      const body = await res.json();

      if (!res.ok) {
        setToggleError(getFriendlyErrorMessage(body.error?.code, body.error?.message ?? 'Something went wrong.'));
        return;
      }

      toast(forklift.isActive ? 'Forklift deactivated.' : 'Forklift reactivated.', 'success');
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setToggleError('The system is temporarily unavailable. Please try again.');
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={80} />
        <Field label="Manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} required />
        <Field label="Model" value={model} onChange={(e) => setModel(e.target.value)} required />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-900">Power Source</label>
          <select
            value={powerSource}
            onChange={(e) => setPowerSource(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <option value="MILEAGE">Mileage (km)</option>
            <option value="ENGINE_HOURS">Engine Hours</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-slate-900">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <StatusMessage status={error ? 'error' : null} message={error} />

        <Button type="submit" loading={saving} className="self-start">
          Save changes
        </Button>
      </form>

      <div className="border-t border-slate-200 pt-4">
        <p className="mb-2 text-sm text-slate-500">
          This forklift is currently {forklift.isActive ? 'active' : 'deactivated'}.
        </p>
        <StatusMessage status={toggleError ? 'error' : null} message={toggleError} />
        <Button
          variant={forklift.isActive ? 'danger' : 'secondary'}
          onClick={() => setConfirmOpen(true)}
          className="mt-2"
        >
          {forklift.isActive ? 'Deactivate' : 'Reactivate'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={forklift.isActive ? 'Deactivate this forklift?' : 'Reactivate this forklift?'}
        description={
          forklift.isActive
            ? "It won't be scannable or searchable for new shifts until reactivated. This is rejected if it currently has an open shift."
            : 'It becomes available for scanning, searching, and new shifts again.'
        }
        confirmLabel={forklift.isActive ? 'Deactivate' : 'Reactivate'}
        danger={forklift.isActive}
        loading={togglingActive}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
