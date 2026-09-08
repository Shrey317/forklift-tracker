import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-800 text-white hover:bg-blue-900 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
};

/**
 * Section 23: every save action shows a loading state and disables the
 * button while submitting. `loading` handles both — disables the button
 * and swaps in a spinner + accessible "Working…" label so a screen reader
 * announces the state change, not just a visual spinner a sighted user
 * happens to notice.
 *
 * min-h-11 (44px) meets Section 25's touch-target minimum throughout the
 * field flow.
 */
export function Button({ variant = 'primary', loading, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800',
        'disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span>{loading ? 'Working…' : children}</span>
    </button>
  );
}
