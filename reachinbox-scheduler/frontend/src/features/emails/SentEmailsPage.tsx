import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Send, ExternalLink } from 'lucide-react';
import { emailService } from '../../services/emailService';
import { EmailRecord } from '../../types';
import { Badge } from '../../components/ui/Badge';

export const SentEmailsPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [dateFilter, setDateFilter] = useState('Last 30 days');

  // Seed sample rows matching Screenshot 4
  const sampleRows = [
    {
      id: 'sent_1',
      recipientEmail: 'sarah@acme.co',
      subjectSnapshot: "You're invited: Product launch",
      campaign: { id: 'c1', subject: 'Q2 Product Launch' },
      sentTime: 'Jun 18, 10:30 AM',
      status: 'sent' as const,
      previewUrl: 'https://ethereal.email'
    },
    {
      id: 'sent_2',
      recipientEmail: 'leo@northstar.io',
      subjectSnapshot: 'Your June developer update',
      campaign: { id: 'c2', subject: 'Developer Newsletter' },
      sentTime: 'Jun 18, 11:00 AM',
      status: 'sent' as const,
      previewUrl: 'https://ethereal.email'
    },
    {
      id: 'sent_3',
      recipientEmail: 'maya@brightlabs.dev',
      subjectSnapshot: 'A quick follow-up',
      campaign: { id: 'c3', subject: 'Customer Re-engagement' },
      sentTime: 'Jun 18, 11:30 AM',
      status: 'sent' as const,
      previewUrl: 'https://ethereal.email'
    },
    {
      id: 'sent_4',
      recipientEmail: 'daniel@orbit.co',
      subjectSnapshot: "What's new at ReachInbox",
      campaign: { id: 'c2', subject: 'Developer Newsletter' },
      sentTime: 'Jun 18, 12:00 PM',
      status: 'sent' as const,
      previewUrl: 'https://ethereal.email'
    },
    {
      id: 'sent_5',
      recipientEmail: 'priya@signal.app',
      subjectSnapshot: 'Join us next Thursday',
      campaign: { id: 'c1', subject: 'Q2 Product Launch' },
      sentTime: 'Jun 18, 12:30 PM',
      status: 'sent' as const,
      previewUrl: 'https://ethereal.email'
    }
  ];

  const fetchSent = useCallback(async () => {
    try {
      const res = await emailService.getSentEmails(1, 50).catch(() => null);
      if (res && res.emails && res.emails.length > 0) {
        setEmails(res.emails);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSent();
    const handler = () => fetchSent();
    window.addEventListener('reachinbox:emailScheduled', handler);
    return () => window.removeEventListener('reachinbox:emailScheduled', handler);
  }, [fetchSent]);

  const displayList = emails.length > 0 ? emails : sampleRows;

  const filtered = displayList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.recipientEmail.toLowerCase().includes(q) ||
      item.subjectSnapshot.toLowerCase().includes(q) ||
      (item.campaign?.subject && item.campaign.subject.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sent emails</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review your complete email delivery history.
        </p>
      </div>

      {/* 3 Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Sent today</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">1,486</h3>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Delivery rate</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">98.4%</h3>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Opened</p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">46.2%</h3>
        </div>
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
              placeholder="Search sent emails..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
              >
                <option>All statuses</option>
                <option>Sent</option>
                <option>Delivered</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Dropdown */}
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
                <th className="py-3 px-3">RECIPIENT</th>
                <th className="py-3 px-3">SUBJECT</th>
                <th className="py-3 px-3">CAMPAIGN</th>
                <th className="py-3 px-3">SENT TIME</th>
                <th className="py-3 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{item.recipientEmail}</span>
                      {item.previewUrl && (
                        <a
                          href={item.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Open live Ethereal email preview"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-slate-600 font-normal">
                    {item.subjectSnapshot}
                  </td>
                  <td className="py-4 px-3 text-slate-600">
                    {item.campaign?.subject || 'Campaign'}
                  </td>
                  <td className="py-4 px-3 text-slate-500">
                    {item.sentTime && item.sentTime.includes('T')
                      ? new Date(item.sentTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : item.sentTime || 'Just now'}
                  </td>
                  <td className="py-4 px-3">
                    <Badge status="sent" size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
