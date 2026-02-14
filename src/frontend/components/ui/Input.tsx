import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl',
          'bg-white/5 border border-white/10',
          'text-white placeholder:text-zinc-500',
          'focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20',
          'backdrop-blur-sm',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
