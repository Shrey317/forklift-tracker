'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, Pagination, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EditShiftDialog } from '@/components/forms/edit-shift-dialog';
import { ForceCloseDialog } from '@/components/forms/force-close-dialog';
import { formatDateTime, formatKm } from '@/lib/format';

interface ShiftRow {
  id: string;
  forklift: { displayId: string; name: string };
  startTime: string;
  endTime: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  startingReading: string;
  endingReading: string | null;
  totalHoursWorked: string | null;
  totalReadingDelta: string | null;
  notes: string | null;
}

export default function AdminShiftsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ShiftRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const [forceClosing, setForceClosing] = useState<ShiftRow | null>(null);
  const [deleting, setDeleting] = useState<ShiftRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/shifts?${params}`, { signal: controller.signal })
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
      const res = await fetch(`/api/shifts/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) {
        toast(body.error?.message ?? 'Could not delete this shift.', 'error');
        return;
      }
      toast('Shift deleted.', 'success');
      setDeleting(null);
      refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-slate-900">Shifts</h1>

      <div className="flex max-w-xs flex-col gap-1.5">
        <label htmlFor="status-filter" className="text-sm font-medium text-slate-900">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
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
              <TableHeaderCell>Start</TableHeaderCell>
              <TableHeaderCell>End</TableHeaderCell>
              <TableHeaderCell>Reading</TableHeaderCell>
              <TableHeaderCell>Hours</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState message="No shifts found." />
                </td>
              </tr>
            )}
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-slate-900">{s.forklift.displayId}</TableCell>
                <TableCell>{formatDateTime(s.startTime)}</TableCell>
                <TableCell>{s.endTime ? formatDateTime(s.endTime) : '—'}</TableCell>
                <TableCell>
                  {formatKm(s.startingReading)} → {s.endingReading ? formatKm(s.endingReading) : '—'}
                </TableCell>
                <TableCell>{s.totalHoursWorked ?? '—'}</TableCell>
                <TableCell>{s.status}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setEditing(s)}>
                      Edit
                    </Button>
                    {s.status === 'ACTIVE' && (
                      <Button variant="ghost" onClick={() => setForceClosing(s)}>
                        Force-close
                      </Button>
                    )}
                    {s.status === 'COMPLETED' && (
                      <Button variant="ghost" onClick={() => setDeleting(s)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && <Pagination page={page} pageSize={25} totalCount={totalCount} onPageChange={handlePageChange} />}

      {editing && (
        <EditShiftDialog
          open={!!editing}
          shift={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast('Shift updated.', 'success');
            setEditing(null);
            refresh();
          }}
        />
      )}

      {forceClosing && (
        <ForceCloseDialog
          open={!!forceClosing}
          shift={{ id: forceClosing.id, displayId: forceClosing.forklift.displayId, startingReading: forceClosing.startingReading }}
          onClose={() => setForceClosing(null)}
          onSaved={() => {
            toast('Shift force-closed.', 'success');
            setForceClosing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this shift?"
        description="It will be removed from normal views but retained for audit history. This cannot be done from here for an active shift."
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
