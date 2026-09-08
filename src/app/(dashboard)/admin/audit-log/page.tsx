'use client';

import { Fragment, useEffect, useState } from 'react';
import { EmptyState, Pagination, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

interface AuditLogRow {
  id: string;
  actorUser: { username: string };
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeValue: unknown;
  afterValue: unknown;
  reason: string | null;
  createdAt: string;
}

const TARGET_TYPES = ['FORKLIFT', 'SHIFT', 'FUEL_LOG', 'MAINTENANCE_LOG'];

export default function AdminAuditLogPage() {
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (targetType) params.set('targetType', targetType);

    fetch(`/api/audit-log?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((body) => {
        setItems(body.data);
        setTotalCount(body.pagination.totalCount);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [targetType, page]);

  function handleFilterChange(value: string) {
    setTargetType(value);
    setPage(1);
    setLoading(true);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setLoading(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
      <p className="text-sm text-slate-500">
        Every Admin action on a forklift, shift, fuel entry, or maintenance record. Read-only — nothing here
        can be edited or removed.
      </p>

      <div className="flex max-w-xs flex-col gap-1.5">
        <label htmlFor="target-type-filter" className="text-sm font-medium text-slate-900">
          Record type
        </label>
        <select
          id="target-type-filter"
          value={targetType}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        >
          <option value="">All</option>
          {TARGET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>When</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Target</TableHeaderCell>
              <TableHeaderCell>Reason</TableHeaderCell>
              <TableHeaderCell>Details</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="No audit entries found." />
                </td>
              </tr>
            )}
            {items.map((entry) => (
              <Fragment key={entry.id}>
                <TableRow>
                  <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>
                    {entry.actorUser.username} ({entry.actorRole.replace('_', ' ').toLowerCase()})
                  </TableCell>
                  <TableCell>{entry.action.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    {entry.targetType.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{entry.reason ?? '—'}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="text-blue-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                      aria-expanded={expandedId === entry.id}
                    >
                      {expandedId === entry.id ? 'Hide' : 'View'}
                    </button>
                  </TableCell>
                </TableRow>
                {expandedId === entry.id && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-3">
                      <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                        <div>
                          <p className="mb-1 font-medium text-slate-500">Before</p>
                          <pre className="overflow-x-auto rounded bg-white p-2 text-slate-700">
                            {JSON.stringify(entry.beforeValue, null, 2) ?? 'null'}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 font-medium text-slate-500">After</p>
                          <pre className="overflow-x-auto rounded bg-white p-2 text-slate-700">
                            {JSON.stringify(entry.afterValue, null, 2) ?? 'null'}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && <Pagination page={page} pageSize={25} totalCount={totalCount} onPageChange={handlePageChange} />}
    </div>
  );
}
