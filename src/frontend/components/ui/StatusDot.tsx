import { cn } from '../../lib/utils';

interface StatusDotProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'pending';
  label?: string;
  size?: 'sm' | 'md';
}

const statusColors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  pending: 'bg-zinc-500',
};

const statusTextColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
  pending: 'text-zinc-400',
};

export function StatusDot({ status, label, size = 'md' }: StatusDotProps) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  
  return (
    <div className="inline-flex items-center gap-2">
      <div className={cn(
        dotSize,
        'rounded-full',
        statusColors[status],
        'shadow-[0_0_8px_currentColor]',
        'animate-pulse'
      )} />
      {label && (
        <span className={cn('text-sm', statusTextColors[status])}>
          {label}
        </span>
      )}
    </div>
  );
}
