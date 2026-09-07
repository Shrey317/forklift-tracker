'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { EmptyState, Pagination, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface ForkliftRow {
  id: string;
  displayId: string;
  name: string;
  manufacturer: string;
  model: string;
  status: string;
  isActive: boolean;
}

export default function AdminForkliftsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ForkliftRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams({
      includeInactive: 'true', // the Admin fleet view needs to see deactivated forklifts too, to reactivate them
      page: String(page),
      pageSize: '25',
    });
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/forklifts?${params}`, { signal: controller.signal })
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
  }, [search, page]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    setLoading(true); // set at the call site, not synchronously in the effect body
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setLoading(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Forklifts</h1>
        <Link href="/admin/forklifts/new">
          <Button>Add forklift</Button>
        </Link>
      </div>

      <div className="max-w-xs">
        <Field
          label="Search"
          placeholder="Name or ID"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Manufacturer / Model</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Active</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState message="No forklifts match your search." />
                </td>
              </tr>
            )}
            {items.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-slate-900">
                  <Link href={`/admin/forklifts/${f.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    {f.displayId}
                  </Link>
                </TableCell>
                <TableCell>{f.name}</TableCell>
                <TableCell>
                  {f.manufacturer} {f.model}
                </TableCell>
                <TableCell>{f.status.replace('_', ' ')}</TableCell>
                <TableCell>{f.isActive ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && <Pagination page={page} pageSize={25} totalCount={totalCount} onPageChange={handlePageChange} />}
    </div>
  );
}
