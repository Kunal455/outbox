import React, { useState, useEffect, useCallback } from 'react';
import {
  Users2,
  Plus,
  RefreshCw,
  Mail,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { senderService } from '../../services/senderService';
import { Sender } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import { formatDurationMs } from '../../utils/formatters';

export const SendersPage: React.FC = () => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Sender Modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addHourlyLimit, setAddHourlyLimit] = useState(200);
  const [addMinInterval, setAddMinInterval] = useState(2000);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Sender Modal state
  const [editingSender, setEditingSender] = useState<Sender | null>(null);
  const [editHourlyLimit, setEditHourlyLimit] = useState(200);
  const [editMinInterval, setEditMinInterval] = useState(2000);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchSenders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await senderService.listSenders();
      setSenders(list);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sender identities.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSenders();
  }, [fetchSenders]);

  const handleToggleActive = async (sender: Sender) => {
    try {
      const updated = await senderService.updateSender(sender.id, {
        isActive: !sender.isActive
      });
      setSenders((prev) => prev.map((s) => (s.id === sender.id ? updated : s)));
    } catch (err: any) {
      alert(`Failed to update sender state: ${err.message}`);
    }
  };

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError(null);

    try {
      const created = await senderService.createSender({
        name: addName.trim(),
        email: addEmail.trim(),
        hourlyLimit: Number(addHourlyLimit),
        minSendIntervalMs: Number(addMinInterval)
      });
      setSenders((prev) => [created, ...prev]);
      setIsAddOpen(false);
      setAddName('');
      setAddEmail('');
      setAddHourlyLimit(200);
      setAddMinInterval(2000);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create sender.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSender) return;

    setIsSavingEdit(true);
    try {
      const updated = await senderService.updateSender(editingSender.id, {
        hourlyLimit: Number(editHourlyLimit),
        minSendIntervalMs: Number(editMinInterval)
      });
      setSenders((prev) => prev.map((s) => (s.id === editingSender.id ? updated : s)));
      setEditingSender(null);
    } catch (err: any) {
      alert(`Failed to update sender settings: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Informational Guidance Banner */}
      <div className="bg-[#0E1321] border border-dark-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-gray-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-gray-200">
              Distributed Redis Rate Limiting & Sender Identities
            </p>
            <p className="text-gray-400 mt-0.5">
              Each sender enforces strict sliding-window quotas in Redis via atomic Lua scripts. Test emails dispatch via Ethereal SMTP accounts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSenders}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Sender
          </Button>
        </div>
      </div>

      {/* Main Senders Content */}
      {loading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : error ? (
        <ErrorState
          title="Error Loading Senders"
          message={error}
          onRetry={fetchSenders}
        />
      ) : senders.length === 0 ? (
        <EmptyState
          icon={<Users2 className="w-6 h-6" />}
          title="No Sender Identities Configured"
          description="Add a sender account to define hourly dispatch limits and minimum interval thresholds."
          actionLabel="Add First Sender"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sender Name & Identity</TableHead>
                <TableHead>Hourly Sending Limit</TableHead>
                <TableHead>Minimum Interval</TableHead>
                <TableHead>Live Redis Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {senders.map((s) => {
                const metrics = s.rateLimitMetrics;
                const sentThisHour = metrics?.sentThisHour ?? 0;
                const remaining = metrics?.remainingQuota ?? s.hourlyLimit;
                const percent = Math.min(100, Math.round((sentThisHour / s.hourlyLimit) * 100));

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name ? s.name[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200">{s.name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-gray-300">
                      <strong>{s.hourlyLimit}</strong> emails/hour
                    </TableCell>

                    <TableCell className="font-mono text-xs text-gray-400">
                      {formatDurationMs(s.minSendIntervalMs)}
                    </TableCell>

                    <TableCell className="w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>{sentThisHour} sent</span>
                          <span>{remaining} left</span>
                        </div>
                        <div className="w-full bg-[#182030] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 90
                                ? 'bg-rose-500'
                                : percent >= 75
                                ? 'bg-amber-500'
                                : 'bg-brand-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                          s.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-gray-800/60 text-gray-400 border-dark-border hover:bg-gray-800'
                        }`}
                        title="Click to toggle active status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.isActive ? 'bg-emerald-400' : 'bg-gray-400'
                          }`}
                        />
                        <span>{s.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSender(s);
                          setEditHourlyLimit(s.hourlyLimit);
                          setEditMinInterval(s.minSendIntervalMs);
                        }}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Sender Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-brand-400" />
            <span>Add Sender Identity</span>
          </div>
        }
        description="Configure an outbound identity with sliding-window quota limits."
        maxWidth="md"
      >
        <form onSubmit={handleAddSender} className="space-y-4 text-left text-xs">
          {addError && (
            <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-lg text-red-300">
              {addError}
            </div>
          )}

          <Input
            label="Sender Display Name"
            required
            placeholder="e.g. Alex at ReachInbox"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />

          <Input
            label="Sender Email Address"
            type="email"
            required
            placeholder="e.g. alex@reachinbox.ai"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hourly Limit"
              type="number"
              min={1}
              required
              helperText="Sliding 1h rate limit"
              value={addHourlyLimit}
              onChange={(e) => setAddHourlyLimit(Number(e.target.value))}
            />

            <Input
              label="Min Interval (ms)"
              type="number"
              min={500}
              step={500}
              required
              helperText="Min delay between sends"
              value={addMinInterval}
              onChange={(e) => setAddMinInterval(Number(e.target.value))}
            />
          </div>

          <div className="pt-3 border-t border-dark-border flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isAdding}>
              Save Identity
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Sender Dialog */}
      {editingSender && (
        <Dialog
          isOpen={!!editingSender}
          onClose={() => setEditingSender(null)}
          title={
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-400" />
              <span>Configure Rate Limits</span>
            </div>
          }
          description={`Update limits for ${editingSender.name} (${editingSender.email})`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-left text-xs">
            <Input
              label="Hourly Sending Quota"
              type="number"
              min={1}
              required
              helperText="Maximum emails dispatched in any 1-hour window"
              value={editHourlyLimit}
              onChange={(e) => setEditHourlyLimit(Number(e.target.value))}
            />

            <Input
              label="Minimum Send Interval (ms)"
              type="number"
              min={500}
              step={500}
              required
              helperText="Spacing between consecutive email jobs in BullMQ"
              value={editMinInterval}
              onChange={(e) => setEditMinInterval(Number(e.target.value))}
            />

            <div className="pt-3 border-t border-dark-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSender(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit}>
                Update Configuration
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
