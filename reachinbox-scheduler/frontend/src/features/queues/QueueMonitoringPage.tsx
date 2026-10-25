import React, { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  Send,
  LayoutGrid,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { DashboardStats } from '../../types';

export const QueueMonitoringPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statusFilter, setStatusFilter] = useState('All job statuses');

  useEffect(() => {
    dashboardService.getStats().then(setStats).catch(() => null);
  }, []);

  const waitingCount = stats?.queueMetrics?.waiting ?? 128;
  const delayedCount = stats?.queueMetrics?.delayed ?? 42;
  const activeCount = stats?.queueMetrics?.active ?? 8;
  const completedCount = stats?.queueMetrics?.completed ?? 9842;
  const failedCount = stats?.queueMetrics?.failed ?? 24;

  const sampleJobs = [
    {
      id: 'job_8f29c1',
      campaign: 'Q2 Product Launch',
      status: 'Active',
      attempts: '1/3',
      created: 'Jun 18, 10:42 AM'
    },
    {
      id: 'job_8f29b8',
      campaign: 'Developer Newsletter',
      status: 'Waiting',
      attempts: '0/3',
      created: 'Jun 18, 10:41 AM'
    },
    {
      id: 'job_8f2982',
      campaign: 'Q2 Product Launch',
      status: 'Delayed',
      attempts: '0/3',
      created: 'Jun 18, 10:39 AM'
    },
    {
      id: 'job_8f2911',
      campaign: 'Customer Re-engagement',
      status: 'Completed',
      attempts: '1/3',
      created: 'Jun 18, 10:35 AM'
    },
    {
      id: 'job_8f28e4',
      campaign: 'Webinar Follow-up',
      status: 'Failed',
      attempts: '3/3',
      created: 'Jun 18, 10:31 AM'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-indigo-600 font-medium';
      case 'Waiting':
        return 'text-slate-600 font-medium';
      case 'Delayed':
        return 'text-amber-600 font-medium';
      case 'Completed':
        return 'text-emerald-600 font-medium';
      case 'Failed':
        return 'text-rose-600 font-medium';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Queue Monitoring</h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor email jobs and sending infrastructure in real time.
          </p>
        </div>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-4 py-2 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <span>Bull Board Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* 5 Stat Cards in Horizontal Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Waiting */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Waiting</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {waitingCount.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Delayed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8c5b16]/10 text-[#8c5b16] flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Delayed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {delayedCount.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Active */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {activeCount.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Completed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {completedCount.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Failed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {failedCount.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Recent jobs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest queue activity across all campaigns</p>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            >
              <option>All job statuses</option>
              <option>Active</option>
              <option>Waiting</option>
              <option>Delayed</option>
              <option>Completed</option>
              <option>Failed</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">JOB ID</th>
                <th className="py-3 px-3">CAMPAIGN</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3">ATTEMPTS</th>
                <th className="py-3 px-3">CREATED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sampleJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-3 font-mono text-slate-900 font-medium">
                    {job.id}
                  </td>
                  <td className="py-4 px-3 text-slate-600 font-medium">
                    {job.campaign}
                  </td>
                  <td className={`py-4 px-3 ${getStatusColor(job.status)}`}>
                    {job.status}
                  </td>
                  <td className="py-4 px-3 text-slate-500">{job.attempts}</td>
                  <td className="py-4 px-3 text-slate-500">{job.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing 1-5 of 1,230</span>
          <div className="flex items-center gap-1.5">
            <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-medium flex items-center justify-center">
              1
            </button>
            <button className="w-7 h-7 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-600">
              2
            </button>
            <button className="w-7 h-7 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-600">
              3
            </button>
            <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
