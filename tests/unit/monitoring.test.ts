import { describe, expect, it, vi, afterEach } from 'vitest';
import { reportError } from '@/lib/monitoring';

describe('reportError sanitization (Section 38)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function captureLoggedEntry(context: Record<string, unknown>): Record<string, unknown> {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError(new Error('test error'), context);
    const loggedJson = spy.mock.calls[0]?.[0] as string;
    return JSON.parse(loggedJson);
  }

  it('strips a raw password from context', () => {
    const logged = captureLoggedEntry({ password: 'hunter2', route: '/api/auth/login' });
    expect(logged.password).toBeUndefined();
    expect(logged.route).toBe('/api/auth/login');
  });

  it('strips a session token by exact or near-match key name', () => {
    const logged = captureLoggedEntry({ sessionToken: 'abc', tokenHash: 'def', requestId: 'xyz' });
    expect(logged.sessionToken).toBeUndefined();
    expect(logged.tokenHash).toBeUndefined();
    expect(logged.requestId).toBe('xyz'); // a legitimate, non-sensitive field survives
  });

  it('strips a database credential and API secret regardless of exact key naming', () => {
    const logged = captureLoggedEntry({
      databaseUrl: 'postgresql://user:pass@host/db',
      apiKey: 'sk_live_abc',
      userId: 'u1',
    });
    expect(logged.databaseUrl).toBeUndefined();
    expect(logged.apiKey).toBeUndefined();
    expect(logged.userId).toBe('u1');
  });

  it('strips a cookie value', () => {
    const logged = captureLoggedEntry({ cookie: '__Host-session=abc123' });
    expect(logged.cookie).toBeUndefined();
  });

  it('falls back to reporting the error WITHOUT its context if the context is unserializable (circular reference), instead of losing the report entirely', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => reportError(new Error('important failure'), { circular })).not.toThrow();

    // The fallback entry must still be valid JSON containing the real
    // error message — not silently dropped just because one context
    // field couldn't be serialized.
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(logged.message).toBe('important failure');
  });

  it('includes the error message and a timestamp', () => {
    const logged = captureLoggedEntry({});
    expect(logged.message).toBe('test error');
    expect(typeof logged.timestamp).toBe('string');
  });
});
