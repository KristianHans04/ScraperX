import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-white text-black hover:bg-white/90 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95',
      secondary: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md',
      ghost: 'bg-transparent text-white hover:bg-white/5',
      outline: 'bg-transparent text-white border border-white/20 hover:bg-white/5 hover:border-white/30',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm rounded-xl',
      md: 'px-6 py-3 text-base rounded-xl',
      lg: 'px-8 py-4 text-lg rounded-full',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
