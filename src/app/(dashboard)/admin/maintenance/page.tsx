'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, Pagination, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { MaintenanceLogDialog } from '@/components/forms/maintenance-log-dialog';

interface MaintenanceRow {
  id: string;
  forklift: { displayId: string; name: string };
  forkliftId: string;
  date: string;
  description: string;
  costZar: string | null;
  status: 'SCHEDULED' | 'COMPLETED';
}

export default function AdminMaintenancePage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MaintenanceRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRow | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/maintenance-logs?${params}`, { signal: controller.signal })
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
  }, [statusFilter, page, refreshTick]);

  function refresh() {
    setLoading(true);
    setRefreshTick((t) => t + 1);
  }

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
    setLoading(true);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setLoading(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/maintenance-logs/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) {
        toast(body.error?.message ?? 'Could not delete this entry.', 'error');
        return;
      }
      toast('Maintenance entry deleted.', 'success');
      setDeleting(null);
      refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
        <Button onClick={() => setCreating(true)}>Add entry</Button>
      </div>

      <div className="flex max-w-xs flex-col gap-1.5">
        <label htmlFor="maint-status-filter" className="text-sm font-medium text-slate-900">
          Status
        </label>
        <select
          id="maint-status-filter"
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <option value="">All</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Forklift</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Cost (ZAR)</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="No maintenance entries found." />
                </td>
              </tr>
            )}
            {items.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-slate-900">{m.forklift.displayId}</TableCell>
                <TableCell>{new Date(m.date).toLocaleDateString('en-ZA')}</TableCell>
                <TableCell className="max-w-xs truncate">{m.description}</TableCell>
                <TableCell>{m.costZar ? `R${m.costZar}` : '—'}</TableCell>
                <TableCell>{m.status}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setEditing(m)}>
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleting(m)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && <Pagination page={page} pageSize={25} totalCount={totalCount} onPageChange={handlePageChange} />}

      <MaintenanceLogDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          toast('Maintenance entry added.', 'success');
          setCreating(false);
          refresh();
        }}
      />

      {editing && (
        <MaintenanceLogDialog
          open={!!editing}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast('Maintenance entry updated.', 'success');
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this maintenance entry?"
        description="It will be removed from normal views but retained for audit history."
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
