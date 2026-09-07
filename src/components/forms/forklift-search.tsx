'use client';

import { useEffect, useRef, useState } from 'react';
import { Field } from './field';

interface ForkliftResult {
  id: string;
  displayId: string;
  name: string;
  qrToken: string;
  status: string;
}

interface ForkliftSearchProps {
  onSelect: (qrToken: string) => void;
}

const DEBOUNCE_MS = 250;

/**
 * Business Rule 15: case-insensitive partial match, capped at 10 results,
 * explicit selection required — never auto-navigates on a single result,
 * since one fast typo could otherwise send someone to the wrong forklift.
 * This is a safety-relevant UI choice, not just a UX nicety: the whole
 * point of scanning/searching is confirming you're about to act on the
 * RIGHT physical machine.
 */
export function ForkliftSearch({ onSelect }: ForkliftSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ForkliftResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length === 0) {
      return; // nothing to fetch — render logic below hides stale results/error when query is empty, no state reset needed here
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ search: query.trim(), pageSize: '10' });
        const res = await fetch(`/api/forklifts?${params}`);
        const body = await res.json();
        if (!res.ok) {
          setError('Search failed. Please try again.');
          return;
        }
        setResults(body.data);
      } catch {
        setError('The system is temporarily unavailable.');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Field
        label="Search by name or ID"
        placeholder="e.g. FL-014"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {hasQuery && loading && (
        <p className="text-sm text-slate-500" aria-live="polite">
          Searching…
        </p>
      )}
      {hasQuery && error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {hasQuery && !loading && !error && results.length === 0 && (
        <p className="text-sm text-slate-500">No forklifts match &quot;{query}&quot;.</p>
      )}

      {hasQuery && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-slate-200 rounded-md border border-slate-200">
          {results.map((forklift) => (
            <li key={forklift.id}>
              <button
                type="button"
                onClick={() => onSelect(forklift.qrToken)}
                className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <span>
                  <span className="font-medium text-slate-900">{forklift.displayId}</span>
                  <span className="ml-2 text-slate-500">{forklift.name}</span>
                </span>
                {forklift.status !== 'ACTIVE' && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-warning">
                    {forklift.status.replace('_', ' ')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
