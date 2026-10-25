import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Slack,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Bell,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { slackService } from '../../services/slackService';
import { SlackStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

export const SlackSettingsPage: React.FC = () => {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const location = useLocation();

  // Handle URL query feedback from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slackParam = params.get('slack');
    if (slackParam === 'connected') {
      setNotice('Successfully authorized Slack workspace! Real-time alerts are now active.');
      window.history.replaceState({}, document.title, location.pathname);
    } else if (slackParam === 'error') {
      const err = params.get('error') || 'Slack OAuth authorization was cancelled or failed.';
      setError(err);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.search, location.pathname]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await slackService.getStatus();
      setStatus(res);
    } catch (err: any) {
      setError(err.message || 'Failed to query Slack integration state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = () => {
    window.location.href = slackService.getConnectUrl();
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await slackService.disconnect();
      setIsDisconnectOpen(false);
      setNotice('Slack workspace disconnected. Alerts will be paused.');
      fetchStatus();
    } catch (err: any) {
      alert(`Failed to disconnect Slack: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl text-left">
      {notice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="bg-[#0E1321] border border-dark-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-dark-border/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#4A154B]/30 border border-[#E01E5A]/30 text-white flex items-center justify-center shadow-lg">
              <Slack className="w-6 h-6 text-[#ECB22E]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                Slack Web API Integration
                {status?.connected && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Live
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time Block Kit notifications when sender hourly rate limits are hit
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh State
          </Button>
        </div>

        {loading ? (
          <div className="py-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        ) : error ? (
          <div className="py-4">
            <ErrorState title="Error Loading Slack Status" message={error} onRetry={fetchStatus} />
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Connection Pill and Workspace info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#121826] rounded-xl border border-dark-border">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status?.connected
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                      : 'bg-gray-500'
                  }`}
                />
                <div>
                  <p className="text-xs font-semibold text-gray-200">
                    {status?.connected ? 'Slack Workspace Connected' : 'Slack Not Connected'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {status?.connected
                      ? `Alerts will be delivered to team: ${status.teamName || 'Workspace'}`
                      : 'Authorize Slack OAuth to receive automated rate limit notifications.'}
                  </p>
                </div>
              </div>

              <div>
                {status?.connected ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsDisconnectOpen(true)}
                  >
                    Disconnect Slack
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConnect}
                    leftIcon={<Slack className="w-4 h-4" />}
                  >
                    Connect Slack Workspace
                  </Button>
                )}
              </div>
            </div>

            {/* Explanation of Hourly Rate Limit Alerts */}
            <div className="space-y-3 text-xs text-gray-300 bg-[#080B12] p-5 rounded-xl border border-dark-border/70">
              <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-400" />
                How ReachInbox Slack Alerts Work
              </h3>
              <p className="text-gray-400 leading-relaxed">
                When an outbound email job is evaluated by the worker, our distributed Redis Lua rate-limiter
                checks the sender’s sliding 1-hour window. If the quota has been reached:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 pl-1">
                <li>
                  The job is <strong className="text-gray-200">not dropped</strong>; it is rescheduled for the next hourly reset window.
                </li>
                <li>
                  An atomic Redis lock prevents duplicate notifications (debounced once per hour per sender).
                </li>
                <li>
                  The ReachInbox backend posts a structured Block Kit alert to your connected Slack channel detailing the sender identity, current usage, and next reset time.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDisconnectOpen}
        onClose={() => setIsDisconnectOpen(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Slack Integration?"
        description="Are you sure you want to unlink your Slack workspace? You will no longer receive alerts when hourly limits are reached."
        confirmLabel="Disconnect"
        variant="danger"
        isLoading={isDisconnecting}
      />
    </div>
  );
};
