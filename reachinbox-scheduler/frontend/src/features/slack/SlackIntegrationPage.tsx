import React, { useState } from 'react';
import { Hash, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export const SlackIntegrationPage: React.FC = () => {
  const [pref1, setPref1] = useState(true);
  const [pref2, setPref2] = useState(true);
  const [pref3, setPref3] = useState(false);
  const [pref4, setPref4] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Slack notification preferences saved.');
    }, 400);
  };

  const handleDisconnect = () => {
    toast.info('Slack integration disconnect requested.');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Slack Integration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Workspace / Slack Integration
        </p>
      </div>

      {/* Top Banner Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#4A154B] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
            #
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900">Slack</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Connected</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Get real-time campaign updates where your team already works.
            </p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          className="border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl px-4 py-2 text-xs font-semibold transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 rounded-2xl shadow-sm p-7 space-y-7">
          {/* Connected workspace */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Connected workspace</h4>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  RL
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Reachinbox Labs</p>
                  <p className="text-[11px] text-slate-400">Connected as alex@reachinbox.com</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Active</span>
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Notification preferences */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-slate-900">Notification preferences</h4>

            <div className="space-y-4">
              {/* Option 1 */}
              <label className="flex items-start justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Campaign starts sending</p>
                  <p className="text-[11px] text-slate-400">Send an update to #email-ops</p>
                </div>
                <input
                  type="checkbox"
                  checked={pref1}
                  onChange={(e) => setPref1(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-1 cursor-pointer"
                />
              </label>

              {/* Option 2 */}
              <label className="flex items-start justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Campaign completed</p>
                  <p className="text-[11px] text-slate-400">Send an update to #email-ops</p>
                </div>
                <input
                  type="checkbox"
                  checked={pref2}
                  onChange={(e) => setPref2(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-1 cursor-pointer"
                />
              </label>

              {/* Option 3 */}
              <label className="flex items-start justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Delivery failure threshold reached</p>
                  <p className="text-[11px] text-slate-400">When failures exceed 5%</p>
                </div>
                <input
                  type="checkbox"
                  checked={pref3}
                  onChange={(e) => setPref3(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-1 cursor-pointer"
                />
              </label>

              {/* Option 4 */}
              <label className="flex items-start justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Queue processing errors</p>
                  <p className="text-[11px] text-slate-400">Send an update to #email-ops</p>
                </div>
                <input
                  type="checkbox"
                  checked={pref4}
                  onChange={(e) => setPref4(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-1 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-5 py-2.5 text-xs shadow-sm transition-all active:scale-98"
            >
              Save preferences
            </button>
          </div>
        </div>

        {/* Right Column: Destination Info (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-[#4A154B] text-white flex items-center justify-center font-bold text-lg">
            #
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Notifications go to</h4>
            <div className="mt-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
              <span className="text-xs font-mono font-bold text-[#4A154B]"># email-ops</span>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              You can change the destination channel when reconnecting your workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
