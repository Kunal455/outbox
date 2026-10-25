import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  const variants = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full'
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-[#1A2336]/60 border border-white/[0.03]',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5
}) => (
  <div className="w-full space-y-2 py-2">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 p-3.5 bg-[#0D121F]/60 rounded-lg">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
