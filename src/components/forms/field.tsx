import { useState, useId, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/**
 * A labeled input with an associated error message wired through
 * aria-describedby and aria-invalid, and role="alert" on the error text
 * so assistive tech announces it the moment it appears — not just a red
 * border a sighted user notices (Section 25).
 */
export function Field({ label, error, hint, id, className, type, ...props }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordProp = type === 'password';
  const inputType = isPasswordProp ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      <div className="relative">
        <input
          id={fieldId}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          className={cn(
            'w-full min-h-11 rounded-md border px-3 py-2 text-base outline-none bg-white border-slate-300 text-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            error ? 'border-danger' : 'border-slate-300',
            isPasswordProp && 'pr-10',
            className,
          )}
          {...props}
        />
        {isPasswordProp && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
