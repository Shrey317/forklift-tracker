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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-foreground">Forklift Tracker</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Sign in to continue.</p>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
