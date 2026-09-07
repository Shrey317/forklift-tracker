'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState, Pagination, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EditFuelLogDialog } from '@/components/forms/edit-fuel-log-dialog';

interface FuelLogRow {
  id: string;
  forklift: { displayId: string; name: string };
  refuelDateTime: string;
  fuelAmountLiters: string;
  fuelCostZar: string | null;
  readingAtRefuel: string;
  notes: string | null;
}

export default function AdminFuelLogsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FuelLogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<FuelLogRow | null>(null);
  const [deleting, setDeleting] = useState<FuelLogRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });

    fetch(`/api/fuel-logs?${params}`, { signal: controller.signal })
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
  }, [page, refreshTick]);

  function refresh() {
    setLoading(true);
    setRefreshTick((t) => t + 1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setLoading(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/fuel-logs/${deleting.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) {
        toast(body.error?.message ?? 'Could not delete this entry.', 'error');
        return;
      }
      toast('Fuel entry deleted.', 'success');
      setDeleting(null);
      refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-slate-900">Fuel Logs</h1>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Forklift</TableHeaderCell>
              <TableHeaderCell>Date/time</TableHeaderCell>
              <TableHeaderCell>Litres</TableHeaderCell>
              <TableHeaderCell>Cost (ZAR)</TableHeaderCell>
              <TableHeaderCell>Reading</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="No fuel entries found." />
                </td>
              </tr>
            )}
            {items.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-slate-900">{f.forklift.displayId}</TableCell>
                <TableCell>{new Date(f.refuelDateTime).toLocaleString('en-ZA')}</TableCell>
                <TableCell>{f.fuelAmountLiters} L</TableCell>
                <TableCell>{f.fuelCostZar ? `R${f.fuelCostZar}` : '—'}</TableCell>
                <TableCell>{f.readingAtRefuel} km</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setEditing(f)}>
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => setDeleting(f)}>
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

      {editing && (
        <EditFuelLogDialog
          open={!!editing}
          fuelLog={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast('Fuel entry updated.', 'success');
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this fuel entry?"
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
