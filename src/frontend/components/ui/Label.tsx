import { forwardRef, LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium text-zinc-300',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';
