import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const CONTROL_BASE =
  'w-full rounded-md border bg-white text-sm text-ink-800 transition-colors placeholder:text-ink-400 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400 read-only:bg-ink-50';

const CONTROL_STATE = (invalid?: boolean): string =>
  invalid
    ? 'border-negative-600 focus:border-negative-600 outline-negative-600'
    : 'border-ink-300 hover:border-ink-400 focus:border-brand-600';

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, children, className, trailing }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-700">
            {label}
            {required ? <span className="ml-0.5 text-brand-700">*</span> : null}
          </label>
          {trailing}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-negative-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  prefix?: string;
  suffix?: string;
  align?: 'left' | 'right';
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, prefix, suffix, align = 'left', className, ...props },
  ref,
) {
  if (prefix || suffix) {
    return (
      <div
        className={cn(
          'flex items-center rounded-md border bg-white transition-colors focus-within:border-brand-600',
          invalid ? 'border-negative-600' : 'border-ink-300 hover:border-ink-400',
          props.disabled && 'bg-ink-50',
          className,
        )}
      >
        {prefix ? (
          <span className="shrink-0 border-r border-ink-200 px-2.5 py-2 text-sm text-ink-500">{prefix}</span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            'w-full bg-transparent px-3 py-2 text-sm text-ink-800 outline-none placeholder:text-ink-400 disabled:text-ink-400',
            align === 'right' && 'text-right tabular',
          )}
          {...props}
        />
        {suffix ? (
          <span className="shrink-0 border-l border-ink-200 px-2.5 py-2 text-sm text-ink-500">{suffix}</span>
        ) : null}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={cn(
        CONTROL_BASE,
        CONTROL_STATE(invalid),
        'px-3 py-2',
        align === 'right' && 'text-right tabular',
        className,
      )}
      {...props}
    />
  );
});

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { invalid, className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL_BASE,
          CONTROL_STATE(invalid),
          'appearance-none py-2 pl-3 pr-9',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
    </div>
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function TextArea({ invalid, className, rows = 3, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(CONTROL_BASE, CONTROL_STATE(invalid), 'resize-y px-3 py-2', className)}
        {...props}
      />
    );
  },
);

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-ink-300 text-brand-700 accent-brand-700 disabled:cursor-not-allowed"
        {...props}
      />
      {label || description ? (
        <span className="min-w-0">
          {label ? <span className="block text-[13px] font-medium text-ink-700">{label}</span> : null}
          {description ? <span className="block text-xs text-ink-500">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-brand-700 bg-brand-700' : 'border-ink-300 bg-ink-200',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'inline-block size-3.5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}
