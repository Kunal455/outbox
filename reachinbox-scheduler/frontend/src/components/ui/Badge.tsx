import React from 'react';
import { cn } from '../../utils/cn';
import { EmailStatus, CampaignStatus } from '../../types';

export type BadgeVariant =
  | 'default'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'deferred';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  status?: EmailStatus | CampaignStatus | string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  status,
  size = 'md',
  dot = true,
  children,
  ...props
}) => {
  // Determine variant based on status if variant not explicitly passed
  let computedVariant: BadgeVariant = variant || 'default';

  if (!variant && status) {
    const s = String(status).toLowerCase();
    if (s === 'scheduled') computedVariant = 'scheduled';
    else if (s === 'processing' || s === 'in_progress') computedVariant = 'processing';
    else if (s === 'sent' || s === 'completed') computedVariant = 'sent';
    else if (s === 'failed' || s === 'cancelled') computedVariant = 'failed';
    else if (s === 'deferred' || s === 'paused') computedVariant = 'deferred';
  }

  const styles: Record<BadgeVariant, { bg: string; dot: string; text: string }> = {
    default: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-400',
      text: 'Default'
    },
    brand: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      dot: 'bg-indigo-600',
      text: 'Brand'
    },
    success: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
      text: 'Success'
    },
    warning: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
      text: 'Warning'
    },
    danger: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      dot: 'bg-rose-500',
      text: 'Danger'
    },
    info: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dot: 'bg-sky-500',
      text: 'Info'
    },
    scheduled: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
      text: 'Scheduled'
    },
    processing: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      dot: 'bg-indigo-600 animate-pulse',
      text: 'Sending'
    },
    sent: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
      text: 'Sent'
    },
    failed: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      dot: 'bg-rose-500',
      text: 'Failed'
    },
    deferred: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-400',
      text: 'Deferred'
    }
  };

  const current = styles[computedVariant] || styles.default;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-2',
        current.bg,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />}
      <span className="capitalize">{children || (status ? String(status).toLowerCase() : current.text)}</span>
    </span>
  );
};
