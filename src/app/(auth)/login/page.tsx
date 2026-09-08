'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/forms/field';
import { StatusMessage } from '@/components/forms/status-message';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();

      if (!res.ok) {
        if (body.error?.code === 'RATE_LIMITED') {
          setError('Too many attempts. Please wait 15 minutes and try again.');
        } else {
          setError('Incorrect username or password.');
        }
        return;
      }

      const destination = redirectTo ?? '/dashboard';
      router.push(destination);
      router.refresh();
    } catch {
      setError('The system is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        autoCapitalize="off"
        autoCorrect="off"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <StatusMessage status={error ? 'error' : null} message={error} />

      <Button type="submit" loading={loading} className="w-full">
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-800 text-white font-bold text-lg">FT</div>
          <h1 className="text-2xl font-semibold text-slate-900">Forklift Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Fleet management system — sign in to continue.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-slate-100" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

