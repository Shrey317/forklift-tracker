import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <span className="text-2xl font-bold text-slate-400">404</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-md bg-blue-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
