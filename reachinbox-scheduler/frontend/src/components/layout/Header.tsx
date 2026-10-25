import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  ExternalLink,
  Shield,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onOpenSearch }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || 'Alex Morgan';
  const displayEmail = user?.email || 'alex@reachinbox.com';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col min-w-0">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
          {subtitle || `Workspace / ${title}`}
        </p>
      </div>

      {/* Right Controls: Search, Alert, User Pill */}
      <div className="flex items-center gap-3">
        {/* Search Icon Button */}
        <button
          onClick={() => {
            if (onOpenSearch) onOpenSearch();
            else navigate('/search');
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Search emails and campaigns"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications Icon Button */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="System notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {/* Red alert badge dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 text-xs z-50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-semibold text-slate-900">
                <span>Recent System Alerts</span>
                <span className="text-[10px] text-indigo-600 font-medium">1 new</span>
              </div>
              <div className="py-3 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">BullMQ worker online</p>
                    <p className="text-[11px] text-slate-400">Concurrency 5, atomic Redis Lua rate limiter active</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">Hourly quota check</p>
                    <p className="text-[11px] text-slate-400">alex@reachinbox.com has 200 emails/hour capacity</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative pl-2" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 ring-2 ring-indigo-50">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {displayEmail}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 shrink-0" />
          </button>

          {/* User Menu Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 text-xs z-50">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{displayEmail}</p>
              </div>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/senders');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 text-left"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Sender Settings</span>
              </button>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/slack');
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 text-left"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Slack Integration</span>
              </button>

              <a
                href="/admin/queues"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-4 py-2 text-slate-700 hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Bull Board Dashboard</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
