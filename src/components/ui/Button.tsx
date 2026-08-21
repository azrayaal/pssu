import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white border border-brand-700 hover:bg-brand-800 hover:border-brand-800 active:bg-brand-900 disabled:bg-ink-200 disabled:border-ink-200 disabled:text-ink-400',
  secondary: 'bg-ink-800 text-white border border-ink-800 hover:bg-ink-900 hover:border-ink-900 disabled:bg-ink-200 disabled:border-ink-200 disabled:text-ink-400',
  outline: 'bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100 disabled:text-ink-400 disabled:bg-ink-50',
  ghost: 'bg-transparent text-ink-600 border border-transparent hover:bg-ink-100 hover:text-ink-800 disabled:text-ink-300',
  danger: 'bg-negative-600 text-white border border-negative-600 hover:bg-negative-700 hover:border-negative-700 disabled:bg-ink-200 disabled:border-ink-200 disabled:text-ink-400',
  link: 'bg-transparent text-brand-700 border border-transparent hover:text-brand-800 hover:underline underline-offset-4 p-0 h-auto',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-10 px-5 text-sm gap-2 rounded-md',
  icon: 'h-9 w-9 rounded-md',
  'icon-sm': 'h-8 w-8 rounded',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', loading = false, leadingIcon, trailingIcon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
