import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { EmailRecord } from '../../types';
import { Dialog } from '../ui/Dialog';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../utils/formatters';
import {
  ExternalLink,
  Mail,
  HelpCircle,
  X,
  Server,
  Zap,
  Shield,
  Layers,
  Database
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();

  const getPageInfo = (pathname: string): { title: string; subtitle: string } => {
    switch (pathname) {
      case '/dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Workspace / Dashboard'
        };
      case '/compose':
        return {
          title: 'Compose Campaign',
          subtitle: 'Workspace / Compose Campaign'
        };
      case '/scheduled':
        return {
          title: 'Scheduled',
          subtitle: 'Workspace / Scheduled'
        };
      case '/sent':
        return {
          title: 'Sent',
          subtitle: 'Workspace / Sent'
        };
      case '/failed':
        return {
          title: 'Failed',
          subtitle: 'Workspace / Failed'
        };
      case '/campaigns':
        return {
          title: 'Campaigns',
          subtitle: 'Workspace / Campaigns'
        };
      case '/search':
        return {
          title: 'Search',
          subtitle: 'Workspace / Search'
        };
      case '/senders':
        return {
          title: 'Sender Settings',
          subtitle: 'Workspace / Sender Settings'
        };
      case '/slack':
        return {
          title: 'Slack Integration',
          subtitle: 'Workspace / Slack Integration'
        };
      case '/queues':
        return {
          title: 'Queue Monitoring',
          subtitle: 'Workspace / Queue Monitoring'
        };
      default:
        return {
          title: 'Dashboard',
          subtitle: 'Workspace / Dashboard'
        };
    }
  };

  const { title, subtitle } = getPageInfo(location.pathname);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar onOpenHelp={() => setHelpOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} subtitle={subtitle} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Bottom-Right Help Button */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all z-40"
        title="Open documentation and architecture reference"
        aria-label="Documentation"
      >
        ?
      </button>

      {/* Help & Architecture Documentation Modal */}
      {helpOpen && (
        <Dialog
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          title="ReachInbox Scheduler Documentation"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1">
              <span className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                Distributed Architecture Overview
              </span>
              <p className="text-indigo-900/80">
                ReachInbox uses persistent BullMQ delayed jobs in Redis, atomic Lua scripts for rate limiting, and an Express background worker fleet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>BullMQ Delayed Queue</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Stable job identifiers (<code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">email-&#123;id&#125;</code>) ensure at-most-once enqueuing with delay offset from now.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Atomic Rate Limiting</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Redis Lua script validates sender hourly capacity and minimum send interval before dequeuing to SMTP.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>Derived Elasticsearch</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Full text multi-match search on recipients and subjects with PostgreSQL fallback.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
                  <Server className="w-4 h-4 text-purple-600" />
                  <span>Ethereal SMTP Delivery</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Emails generate live test preview URLs to inspect rendered HTML and headers.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-slate-400 border-t border-slate-100">
              <span>Admin Queue Monitor:</span>
              <a
                href="/admin/queues"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
              >
                Open Bull Board Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Dialog>
      )}

      {/* Email Quick Details Dialog */}
      {selectedEmail && (
        <Dialog
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          title="Email Delivery Details"
          maxWidth="lg"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Status:</span>
              <Badge status={selectedEmail.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Recipient
                </span>
                <span className="text-slate-800 font-medium break-all">
                  {selectedEmail.recipientEmail}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Sender
                </span>
                <span className="text-slate-800 font-medium">
                  {selectedEmail.sender?.name || 'Sender'} ({selectedEmail.sender?.email || 'N/A'})
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Subject
              </span>
              <p className="text-sm text-slate-900 font-semibold">{selectedEmail.subjectSnapshot}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Body
              </span>
              <div className="text-slate-700 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-slate-200 mt-1">
                {selectedEmail.bodySnapshot}
              </div>
            </div>

            {selectedEmail.previewUrl && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-indigo-900 text-xs block">Ethereal SMTP Preview</span>
                  <span className="text-[11px] text-indigo-700">Open rendered email message in browser</span>
                </div>
                <a
                  href={selectedEmail.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-700"
                >
                  View Preview <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
};
