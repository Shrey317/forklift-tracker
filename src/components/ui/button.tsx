import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-slate-300 dark:disabled:bg-slate-700',
  secondary: 'bg-card text-foreground border border-border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500',
  danger: 'bg-danger text-white hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700',
  ghost: 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500',
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
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
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
