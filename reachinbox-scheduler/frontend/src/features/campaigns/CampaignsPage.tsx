import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { campaignService } from '../../services/campaignService';
import { Campaign } from '../../types';
import { Badge } from '../../components/ui/Badge';

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All campaigns');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [dateFilter, setDateFilter] = useState('Last 30 days');

  // Sample data matching Screenshot 6
  const sampleCampaigns = [
    {
      id: 'c_1',
      name: 'Q2 Product Launch',
      created: 'Jun 18, 2025',
      totalLeads: '2,450',
      scheduled: '820',
      sent: '1,594',
      failed: '36',
      status: 'Sending'
    },
    {
      id: 'c_2',
      name: 'Developer Newsletter',
      created: 'Jun 14, 2025',
      totalLeads: '1,230',
      scheduled: '1,230',
      sent: '0',
      failed: '0',
      status: 'Scheduled'
    },
    {
      id: 'c_3',
      name: 'Customer Re-engagement',
      created: 'Jun 08, 2025',
      totalLeads: '876',
      scheduled: '0',
      sent: '852',
      failed: '24',
      status: 'Completed'
    },
    {
      id: 'c_4',
      name: 'Webinar Follow-up',
      created: 'May 29, 2025',
      totalLeads: '612',
      scheduled: '0',
      sent: '594',
      failed: '18',
      status: 'Completed'
    }
  ];

  const fetchCampaigns = useCallback(async () => {
    try {
      const list = await campaignService.listCampaigns().catch(() => []);
      if (list && list.length > 0) {
        setCampaigns(list);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const tabs = [
    { label: 'All campaigns', count: 12 },
    { label: 'Draft', count: 2 },
    { label: 'Scheduled', count: 3 },
    { label: 'Sending', count: 1 },
    { label: 'Completed', count: 6 }
  ];

  const displayList = campaigns.length > 0
    ? campaigns.map((c) => ({
        id: c.id,
        name: c.subject,
        created: new Date(c.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        }),
        totalLeads: (c.metrics?.total || c.metrics?.totalEmails || 0).toLocaleString(),
        scheduled: (c.metrics?.scheduled || 0).toLocaleString(),
        sent: (c.metrics?.sent || 0).toLocaleString(),
        failed: (c.metrics?.failed || 0).toLocaleString(),
        status:
          c.status === 'IN_PROGRESS'
            ? 'Sending'
            : c.status === 'COMPLETED'
            ? 'Completed'
            : 'Scheduled'
      }))
    : sampleCampaigns;

  const filtered = displayList.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create, monitor, and manage all your email campaigns.
          </p>
        </div>

        <button
          onClick={() => navigate('/compose')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 font-medium text-sm flex items-center gap-2 shadow-sm transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Create campaign</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-8 text-xs font-semibold select-none">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className={`pb-3.5 flex items-center gap-2 transition-colors relative ${
              activeTab === tab.label
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                activeTab === tab.label
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
            {activeTab === tab.label && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
              >
                <option>All statuses</option>
                <option>Sending</option>
                <option>Scheduled</option>
                <option>Completed</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
              >
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Today</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">CAMPAIGN</th>
                <th className="py-3 px-3">CREATED</th>
                <th className="py-3 px-3">TOTAL LEADS</th>
                <th className="py-3 px-3">SCHEDULED</th>
                <th className="py-3 px-3">SENT</th>
                <th className="py-3 px-3">FAILED</th>
                <th className="py-3 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-3 font-medium text-slate-900">
                    {item.name}
                  </td>
                  <td className="py-4 px-3 text-slate-500">{item.created}</td>
                  <td className="py-4 px-3 text-slate-600 font-medium">{item.totalLeads}</td>
                  <td className="py-4 px-3 text-slate-500">{item.scheduled}</td>
                  <td className="py-4 px-3 text-slate-500">{item.sent}</td>
                  <td className="py-4 px-3 text-slate-500">{item.failed}</td>
                  <td className="py-4 px-3">
                    <Badge status={item.status} size="sm" />
                  </td>
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
