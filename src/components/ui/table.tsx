import { cn } from '@/lib/utils';

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-slate-200 bg-slate-50">{children}</thead>;
}

export function TableHeaderCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 font-medium text-slate-500', className)}>{children}</th>;
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-slate-50">{children}</tr>;
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-slate-700', className)}>{children}</td>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-500">{message}</p>;
}

/** Prev/Next pagination — consistent across every admin list, driven by the page/pageSize/totalCount every list endpoint returns (Section 19). */
export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <span>
        Page {page} of {totalPages} ({totalCount} total)
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="min-h-11 rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Next
        </button>
      </div>
    </div>
  );
}
