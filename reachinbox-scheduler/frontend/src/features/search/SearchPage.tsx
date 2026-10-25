import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Command, ChevronDown, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { searchService } from '../../services/searchService';
import { EmailRecord } from '../../types';
import { Badge } from '../../components/ui/Badge';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [results, setResults] = useState<EmailRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Default sample rows matching Screenshot 7
  const sampleRecentEmails = [
    {
      id: 'sr_1',
      recipientEmail: 'sarah@acme.co',
      subjectSnapshot: "You're invited: Product launch",
      campaign: { id: 'c1', subject: 'Q2 Product Launch' },
      createdAt: 'Today, 10:30 AM',
      status: 'scheduled' as const
    },
    {
      id: 'sr_2',
      recipientEmail: 'leo@northstar.io',
      subjectSnapshot: 'Your June developer update',
      campaign: { id: 'c2', subject: 'Developer Newsletter' },
      createdAt: 'Today, 11:00 AM',
      status: 'scheduled' as const
    },
    {
      id: 'sr_3',
      recipientEmail: 'maya@brightlabs.dev',
      subjectSnapshot: 'A quick follow-up',
      campaign: { id: 'c3', subject: 'Customer Re-engagement' },
      createdAt: 'Today, 11:30 AM',
      status: 'failed' as const
    },
    {
      id: 'sr_4',
      recipientEmail: 'daniel@orbit.co',
      subjectSnapshot: "What's new at ReachInbox",
      campaign: { id: 'c2', subject: 'Developer Newsletter' },
      createdAt: 'Today, 12:00 PM',
      status: 'sent' as const
    }
  ];

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchService
      .searchEmails(debouncedQuery.trim(), statusFilter !== 'All statuses' ? statusFilter.toLowerCase() : undefined, 0, 20)
      .then((res) => {
        setResults(res.hits || []);
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [debouncedQuery, statusFilter]);

  const displayList = results.length > 0 ? results : (debouncedQuery.trim() ? [] : sampleRecentEmails);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Email search</h2>
        <p className="text-sm text-slate-500 mt-1">
          Find any email across campaigns, recipients, subjects, and statuses.
        </p>
      </div>

      {/* Big Search Bar Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-3">
        <div className="relative flex items-center">
          <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient, subject, campaign..."
            className="w-full bg-slate-50/60 border border-slate-200/90 rounded-2xl pl-12 pr-14 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
          />
          <div className="absolute right-4 flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-400 text-xs font-mono select-none">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 px-1">
          Search supports exact email addresses, partial subjects, and campaign names.
        </p>
      </div>

      {/* Results Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {debouncedQuery.trim() ? 'Search results' : 'Recent emails'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {displayList.length} results across all campaigns
            </p>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            >
              <option>All statuses</option>
              <option>Scheduled</option>
              <option>Sent</option>
              <option>Failed</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {isSearching ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs">Querying Elasticsearch cluster...</span>
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No emails found matching &quot;{query}&quot;. Try adjusting your keywords.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">RECIPIENT</th>
                  <th className="py-3 px-3">SUBJECT</th>
                  <th className="py-3 px-3">CAMPAIGN</th>
                  <th className="py-3 px-3">TIMESTAMP</th>
                  <th className="py-3 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-3 font-medium text-slate-900">
                      {item.recipientEmail}
                    </td>
                    <td className="py-4 px-3 text-slate-600">
                      {item.subjectSnapshot}
                    </td>
                    <td className="py-4 px-3 text-slate-600">
                      {item.campaign?.subject || 'Campaign'}
                    </td>
                    <td className="py-4 px-3 text-slate-500">
                      {item.createdAt.includes('T')
                        ? new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : item.createdAt}
                    </td>
                    <td className="py-4 px-3">
                      <Badge status={item.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
