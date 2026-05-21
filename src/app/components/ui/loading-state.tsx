import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './utils';

const spinnerSizes = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
} as const;

export function LoadingSpinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof spinnerSizes;
}) {
  return <Loader2 className={cn('animate-spin text-white', spinnerSizes[size], className)} aria-hidden />;
}

export function LoadingBlock({
  message = 'Carregando informações...',
  className,
  size = 'md',
}: {
  message?: string;
  className?: string;
  size?: keyof typeof spinnerSizes;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4 py-12 px-6', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner size={size} />
      {message ? (
        <p
          className="text-white/80 text-sm text-center max-w-xs"
          style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function LoadingOverlay({
  loading,
  message = 'Carregando informações...',
  children,
  className,
}: {
  loading: boolean;
  message?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {loading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/25 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingBlock message={message} />
        </div>
      ) : null}
    </div>
  );
}
