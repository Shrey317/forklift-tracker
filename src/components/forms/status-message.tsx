interface StatusMessageProps {
  status: 'success' | 'error' | null;
  message: string | null;
}

/**
 * role="status" (success) / role="alert" (error) with aria-live makes
 * assistive tech announce this the moment it appears — Section 25: "a
 * screen-reader announcement when a save succeeds or fails, not just a
 * toast a sighted user happens to see." Renders nothing when there's
 * nothing to say, rather than an empty live region sitting in the DOM.
 */
export function StatusMessage({ status, message }: StatusMessageProps) {
  if (!status || !message) return null;

  return (
    <p
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      className={
        status === 'error'
          ? 'rounded-md bg-red-50 px-3 py-2 text-sm text-danger'
          : 'rounded-md bg-green-50 px-3 py-2 text-sm text-success'
      }
    >
      {message}
    </p>
  );
}
