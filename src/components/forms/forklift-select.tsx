'use client';

import { useEffect, useState } from 'react';

interface ForkliftOption {
  id: string;
  displayId: string;
  name: string;
}

interface ForkliftSelectProps {
  value: string;
  onChange: (forkliftId: string) => void;
  label?: string;
  required?: boolean;
}

/** A plain <select> is entirely reasonable at this fleet's scale (~25 forklifts) — no need for a search-as-you-type pattern for a list this short. */
export function ForkliftSelect({ value, onChange, label = 'Forklift', required }: ForkliftSelectProps) {
  const [options, setOptions] = useState<ForkliftOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forklifts?pageSize=100')
      .then((res) => res.json())
      .then((body) => setOptions(body.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="forklift-select" className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <select
        id="forklift-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loading}
        className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-slate-100"
      >
        <option value="" disabled>
          {loading ? 'Loading…' : 'Select a forklift'}
        </option>
        {options.map((f) => (
          <option key={f.id} value={f.id}>
            {f.displayId} — {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
