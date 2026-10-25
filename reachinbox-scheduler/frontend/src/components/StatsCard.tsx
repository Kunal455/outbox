import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtext?: string;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  badge
}) => {
  return (
    <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-dark-muted">
          {title}
        </span>
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform duration-200">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">
          {value}
        </span>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-dark-muted mt-2 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
