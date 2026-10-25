import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  PenLine,
  Clock,
  Send,
  AlertTriangle,
  Mail,
  Search,
  Settings,
  Hash,
  Activity,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isExternal?: boolean;
}

export interface SidebarProps {
  onOpenHelp?: () => void;
  failedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenHelp, failedCount = 24 }) => {
  const workspaceNav: NavItem[] = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutGrid },
    { name: 'Compose Campaign', to: '/compose', icon: PenLine },
    { name: 'Scheduled', to: '/scheduled', icon: Clock },
    { name: 'Sent', to: '/sent', icon: Send },
    {
      name: 'Failed',
      to: '/failed',
      icon: AlertTriangle,
      badge: failedCount > 0 ? String(failedCount) : undefined
    },
    { name: 'Campaigns', to: '/campaigns', icon: Mail },
    { name: 'Search', to: '/search', icon: Search }
  ];

  const configNav: NavItem[] = [
    { name: 'Sender Settings', to: '/senders', icon: Settings },
    { name: 'Slack Integration', to: '/slack', icon: Hash },
    { name: 'Queue Monitoring', to: '/queues', icon: Activity }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 select-none z-20">
      <div className="flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-slate-50">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
            <svg
              className="w-5 h-5 -rotate-45 translate-x-0.5 -translate-y-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
              ReachInbox
            </span>
            <span className="text-[10px] font-bold text-slate-400 tracking-[0.16em] uppercase">
              OUTBOX LABS
            </span>
          </div>
        </div>

        {/* WORKSPACE Navigation Section */}
        <div className="px-4 py-4">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
            WORKSPACE
          </p>
          <div className="space-y-1">
            {workspaceNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150',
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                  )
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="bg-rose-100 text-rose-600 font-semibold text-[11px] px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* CONFIGURATION Navigation Section */}
          <div className="pt-5 mt-5 border-t border-slate-100">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
              CONFIGURATION
            </p>
            <div className="space-y-1">
              {configNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150',
                      isActive
                        ? 'bg-indigo-50/80 text-indigo-600 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    )
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Monthly Usage & Help Section */}
      <div className="p-4 border-t border-slate-100 space-y-4 bg-white">
        {/* Monthly usage widget */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-800">Monthly usage</span>
            <span className="font-bold text-slate-900">78%</span>
          </div>
          <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full w-[78%] transition-all duration-500" />
          </div>
          <p className="text-[11px] text-slate-400 font-normal">
            7,842 of 10,000 emails
          </p>
        </div>

        {/* Need help footer */}
        <button
          onClick={onOpenHelp}
          className="w-full flex items-center gap-2.5 px-2 py-1 text-left text-slate-600 hover:text-indigo-600 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
              Need help?
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-indigo-500">
              View documentation
            </span>
          </div>
        </button>
      </div>
    </aside>
  );
};
