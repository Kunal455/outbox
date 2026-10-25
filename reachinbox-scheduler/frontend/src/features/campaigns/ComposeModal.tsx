import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UploadCloud,
  FileText,
  X,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Users2,
  Trash2,
  Plus
} from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { emailService } from '../../services/emailService';
import { senderService } from '../../services/senderService';
import { parseCsvContent, isValidEmail } from '../../utils/csv';
import { Sender, CsvRecipientResult } from '../../types';

const composeSchema = z.object({
  senderId: z.string().min(1, 'Please select a sender identity'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject cannot exceed 500 characters'),
  body: z.string().min(1, 'Email body is required'),
  startTime: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.getTime() > Date.now() - 60000;
  }, {
    message: 'Scheduled start time must be in the future'
  }),
  delayBetweenSendsMs: z.number().int().min(500, 'Minimum delay must be at least 500ms'),
  hourlyLimit: z.number().int().positive('Hourly limit must be a positive integer')
});

type ComposeFormData = z.infer<typeof composeSchema>;

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [csvStats, setCsvStats] = useState<CsvRecipientResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ campaignId: string; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute default start time (now + 5 minutes formatted as YYYY-MM-DDTHH:mm)
  const getDefaultStartTime = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      senderId: '',
      subject: '',
      body: '',
      startTime: getDefaultStartTime(),
      delayBetweenSendsMs: 2000,
      hourlyLimit: 200
    }
  });

  // Load available senders when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingSenders(true);
      senderService
        .listSenders()
        .then((list) => {
          setSenders(list);
          if (list.length > 0) {
            const activeSender = list.find((s) => s.isActive) || list[0];
            setValue('senderId', activeSender.id);
            setValue('hourlyLimit', activeSender.hourlyLimit || 200);
            setValue('delayBetweenSendsMs', activeSender.minSendIntervalMs || 2000);
          }
        })
        .catch(() => null)
        .finally(() => setLoadingSenders(false));

      setValue('startTime', getDefaultStartTime());
      setServerError(null);
      setSuccessInfo(null);
    }
  }, [isOpen, setValue]);

  // Handle CSV file selection and parsing
  const handleFileProcess = async (file: File) => {
    setFileName(file.name);
    const sizeKb = (file.size / 1024).toFixed(1);
    setFileSize(`${sizeKb} KB`);
    setServerError(null);

    const text = await file.text();
    const result = await parseCsvContent(text);

    setCsvStats(result);

    // Merge new valid recipients with existing ones, preserving uniqueness
    const merged = Array.from(new Set([...recipients, ...result.validRecipients]));
    setRecipients(merged);
  };

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    const candidates = manualInput
      .split(/[,\n;]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const validNew: string[] = [];
    for (const c of candidates) {
      if (isValidEmail(c) && !recipients.includes(c)) {
        validNew.push(c);
      }
    }

    if (validNew.length > 0) {
      setRecipients([...recipients, ...validNew]);
      setManualInput('');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleClearAllRecipients = () => {
    setRecipients([]);
    setCsvStats(null);
    setFileName(null);
    setFileSize(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: ComposeFormData) => {
    if (recipients.length === 0) {
      setServerError('Please upload a CSV or enter at least one valid recipient email.');
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await emailService.schedule({
        senderId: data.senderId,
        subject: data.subject,
        body: data.body,
        recipients,
        startTime: new Date(data.startTime).toISOString(),
        delayBetweenSendsMs: data.delayBetweenSendsMs,
        hourlyLimit: data.hourlyLimit
      });

      setSuccessInfo({
        campaignId: response.campaign.id,
        count: response.campaign.recipientCount
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to schedule campaign jobs. Please verify entries and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    reset();
    handleClearAllRecipients();
    setSuccessInfo(null);
    setServerError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-brand-400" />
          <span>Compose New Outreach Campaign</span>
        </div>
      }
      description="Queue delayed emails with atomic rate limits, BullMQ workers, and Ethereal preview support."
      maxWidth="xl"
    >
      {successInfo ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-100">Campaign Scheduled Successfully</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Enqueued <strong className="text-emerald-400">{successInfo.count}</strong> jobs into the BullMQ delayed queue.
            Emails will be dispatched according to the configured schedule and sender rate limits.
          </p>
          <div className="p-3 bg-[#121826] border border-dark-border rounded-xl text-xs font-mono text-gray-300 max-w-sm mx-auto">
            Campaign ID: {successInfo.campaignId}
          </div>
          <div className="pt-4 flex justify-center">
            <Button variant="primary" onClick={handleResetAndClose}>
              Done & Return to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left text-xs">
          {serverError && (
            <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Sender Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Sender Identity <span className="text-red-400">*</span>
            </label>
            <Controller
              name="senderId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  error={errors.senderId?.message}
                  disabled={loadingSenders || senders.length === 0}
                  onChange={(e) => {
                    field.onChange(e);
                    const selected = senders.find((s) => s.id === e.target.value);
                    if (selected) {
                      setValue('hourlyLimit', selected.hourlyLimit);
                      setValue('delayBetweenSendsMs', selected.minSendIntervalMs);
                    }
                  }}
                >
                  {senders.length === 0 ? (
                    <option value="">No senders found. Please configure a sender first.</option>
                  ) : (
                    senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email}) — Limit: {s.hourlyLimit}/hr
                        {!s.isActive ? ' [INACTIVE]' : ''}
                      </option>
                    ))
                  )}
                </Select>
              )}
            />
          </div>

          {/* Subject */}
          <div>
            <Input
              label="Subject Line"
              required
              placeholder="e.g. Scaling outbound outreach with ReachInbox"
              {...register('subject')}
              error={errors.subject?.message}
            />
          </div>

          {/* Email Body */}
          <div>
            <Textarea
              label="Email Body Content"
              required
              rows={4}
              placeholder="Write your email body or marketing copy..."
              {...register('body')}
              error={errors.body?.message}
            />
          </div>

          {/* Schedule & Rate Limiting Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#0B0F17] rounded-xl border border-dark-border">
            <div>
              <Input
                label="Scheduled Start Time"
                type="datetime-local"
                required
                {...register('startTime')}
                error={errors.startTime?.message}
              />
            </div>
            <div>
              <Input
                label="Min Delay (ms)"
                type="number"
                min={500}
                step={500}
                required
                helperText="Interval between sends (min 500ms)"
                {...register('delayBetweenSendsMs', { valueAsNumber: true })}
                error={errors.delayBetweenSendsMs?.message}
              />
            </div>
            <div>
              <Input
                label="Hourly Limit"
                type="number"
                min={1}
                required
                helperText="Max emails per 1h sliding window"
                {...register('hourlyLimit', { valueAsNumber: true })}
                error={errors.hourlyLimit?.message}
              />
            </div>
          </div>

          {/* Recipient Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-300">
                Recipients List <span className="text-red-400">*</span>
              </label>
              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRecipients}
                  className="text-gray-400 hover:text-rose-400 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear list ({recipients.length})
                </button>
              )}
            </div>

            {/* CSV Dropzone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-dark-border hover:border-brand-500/60 bg-[#0E1321]/60 rounded-xl p-4 text-center cursor-pointer transition-colors"
            >
              <UploadCloud className="w-6 h-6 text-brand-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-200">
                Upload recipient CSV or text file
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Automatically detects email column, deduplicates, and validates RFC 5322 format.
              </p>
              {fileName && (
                <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#161F33] text-gray-200 text-[11px] border border-dark-border">
                  <FileText className="w-3.5 h-3.5 text-brand-400" />
                  <span>{fileName}</span>
                  <span className="text-gray-400 font-mono">({fileSize})</span>
                </div>
              )}
            </div>

            {/* Manual email paste bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualAdd();
                  }
                }}
                placeholder="Or paste email addresses (comma or newline separated)..."
                className="flex-1 bg-[#0D121F] border border-dark-border rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleManualAdd}>
                Add
              </Button>
            </div>

            {/* CSV parsing feedback notes */}
            {csvStats && (
              <div className="p-2.5 bg-[#0B0F17] rounded-lg border border-dark-border flex items-center justify-between text-[11px] text-gray-300">
                <span>
                  Valid: <strong className="text-emerald-400">{csvStats.validRecipients.length}</strong> •
                  Duplicates: <strong className="text-amber-400">{csvStats.duplicatesRemoved}</strong> •
                  Invalid: <strong className="text-rose-400">{csvStats.invalidCount}</strong>
                </span>
                {csvStats.errors.length > 0 && (
                  <span className="text-amber-400 font-mono">{csvStats.errors[0]}</span>
                )}
              </div>
            )}

            {/* Detected recipient chips preview with remove action */}
            {recipients.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-gray-400">
                  Ready to schedule ({recipients.length} recipients):
                </span>
                <div className="max-h-28 overflow-y-auto p-2 bg-[#080B12] rounded-lg border border-dark-border/80 flex flex-wrap gap-1.5">
                  {recipients.slice(0, 50).map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#161F33] text-gray-200 text-[11px] border border-dark-border"
                    >
                      <span>{r}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(r)}
                        className="text-gray-400 hover:text-rose-400"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {recipients.length > 50 && (
                    <span className="text-[11px] text-gray-400 px-2 py-0.5">
                      +{recipients.length - 50} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-dark-border flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleResetAndClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={recipients.length === 0}
              leftIcon={<Clock className="w-3.5 h-3.5" />}
            >
              Schedule {recipients.length > 0 ? `${recipients.length} Emails` : 'Campaign'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
