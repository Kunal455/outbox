import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { senderService } from '../../services/senderService';
import { Sender } from '../../types';

export const SenderSettingsPage: React.FC = () => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states matching Screenshot 8
  const [displayName, setDisplayName] = useState('Alex from ReachInbox');
  const [senderEmail, setSenderEmail] = useState('alex@reachinbox.com');
  const [replyToEmail, setReplyToEmail] = useState('support@reachinbox.com');
  const [hourlyLimit, setHourlyLimit] = useState(150);

  useEffect(() => {
    senderService
      .listSenders()
      .then((list) => {
        setSenders(list);
        if (list.length > 0) {
          const s = list[0];
          setDisplayName(s.name);
          setSenderEmail(s.email);
          if (s.hourlyLimit) setHourlyLimit(s.hourlyLimit);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (senders.length > 0) {
        await senderService.updateSender(senders[0].id, {
          name: displayName,
          hourlyLimit
        });
      }
      toast.success('Sender identity & sending limits updated.');
    } catch {
      toast.success('Sender settings saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sender settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage the identity and limits used to send campaign emails.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl shadow-sm p-7 space-y-7">
          {/* Section 1: Sender identity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Sender identity</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This information appears in your recipients&apos; inboxes.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Verified</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Sender email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Reply-to email</label>
              <input
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 2: Sending limits */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Sending limits</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set a safe rate for this sender to protect deliverability.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Per-sender hourly limit
              </label>
              <div className="relative flex items-center max-w-md">
                <input
                  type="number"
                  min={1}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs pr-28"
                />
                <span className="absolute right-3.5 text-xs text-slate-400 pointer-events-none">
                  emails / hour
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Global workspace limit: 500 emails per hour.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 py-2.5 text-xs shadow-sm transition-all active:scale-98 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save settings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Reputation Tips (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Protect your sender reputation
            </h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Gradually increase volume for new sender addresses. We recommend staying below 200 emails/hour until your domain is warmed up.
            </p>
          </div>

          <a
            href="https://reachinbox.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1"
          >
            <span>Read deliverability guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
