import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Link2,
  ChevronDown,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { emailService } from '../../services/emailService';
import { senderService } from '../../services/senderService';
import { parseCsvContent, isValidEmail } from '../../utils/csv';
import { Sender, CsvRecipientResult } from '../../types';

export const ComposeCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  
  // Form fields
  const [campaignName, setCampaignName] = useState('July Product Update');
  const [emailSubject, setEmailSubject] = useState('New ways to get more from ReachInbox');
  const [emailBody, setEmailBody] = useState(`Hi {{first_name}},

We've shipped new scheduling controls to help your team reach every lead at the right time.

See what's new and let us know what you think.

Best,`);

  // Date and Time settings
  const today = new Date();
  const defaultDateStr = today.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState('09:30');
  const [delaySeconds, setDelaySeconds] = useState(30);
  const [hourlyLimit, setHourlyLimit] = useState(120);

  // Variable dropdown
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);

  // Recipients and CSV
  const [recipients, setRecipients] = useState<string[]>([
    'sarah@acme.co',
    'leo@northstar.io',
    'maya@brightlabs.dev',
    'daniel@orbit.co',
    'priya@signal.app'
  ]);
  const [csvFileName, setCsvFileName] = useState<string | null>('sample-leads.csv');
  const [csvStats, setCsvStats] = useState<CsvRecipientResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load senders on mount
  useEffect(() => {
    senderService.listSenders().then((list) => {
      setSenders(list);
      if (list.length > 0) {
        setSelectedSenderId(list[0].id);
        if (list[0].hourlyLimit) setHourlyLimit(list[0].hourlyLimit);
      }
    }).catch(() => null);
  }, []);

  // Calculate estimated completion
  const computeEstimatedCompletion = () => {
    try {
      const [year, month, day] = startDate.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      const start = new Date(year, month - 1, day, hours, minutes);
      const totalSeconds = recipients.length * delaySeconds;
      const completionDate = new Date(start.getTime() + totalSeconds * 1000);

      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return completionDate.toLocaleString('en-US', options);
    } catch {
      return 'June 24 at 8:45 PM';
    }
  };

  const handleInsertVariable = (variable: string) => {
    setEmailBody((prev) => prev + ` {{${variable}}}`);
    setShowVariableDropdown(false);
  };

  // CSV processing
  const handleFileProcess = async (file: File) => {
    setCsvFileName(file.name);
    try {
      const text = await file.text();
      const result = await parseCsvContent(text);
      setCsvStats(result);
      const merged = Array.from(new Set([...recipients, ...result.validRecipients]));
      setRecipients(merged);
      toast.success(`Loaded ${result.validRecipients.length} valid recipient emails.`);
    } catch {
      toast.error('Failed to parse CSV file.');
    }
  };

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    const candidates = manualInput
      .split(/[,\n;]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const validNew = candidates.filter((c) => isValidEmail(c) && !recipients.includes(c));
    if (validNew.length > 0) {
      setRecipients([...recipients, ...validNew]);
      setManualInput('');
      toast.success(`Added ${validNew.length} recipient(s).`);
    } else {
      toast.error('No new valid email addresses found.');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleScheduleCampaign = async () => {
    if (!emailSubject.trim()) {
      toast.error('Email subject is required.');
      return;
    }
    if (!emailBody.trim()) {
      toast.error('Email body is required.');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const senderId = selectedSenderId || (senders[0]?.id ?? '');

      await emailService.schedule({
        senderId,
        subject: emailSubject,
        body: emailBody,
        recipients,
        startTime: scheduledDateTime,
        delayBetweenSendsMs: delaySeconds * 1000,
        hourlyLimit
      });

      toast.success(`Campaign scheduled! ${recipients.length} delayed jobs dispatched to BullMQ.`);
      window.dispatchEvent(new CustomEvent('reachinbox:emailScheduled'));
      navigate('/scheduled');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to schedule campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Compose Campaign</h2>
        <p className="text-sm text-slate-500 mt-1">
          Craft your email outreach, configure atomic rate limits, and schedule distributed sending.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Campaign Details & Leads (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card: Campaign details */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-7 space-y-5">
            {/* Step 1 Header */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Campaign details</h3>
                <p className="text-xs text-slate-400 mt-0.5">Write the message your recipients will receive.</p>
              </div>
            </div>

            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Campaign name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. July Product Update"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm"
              />
              <p className="text-[11px] text-slate-400">Only visible to your team.</p>
            </div>

            {/* Email Subject */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">Email subject</label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {emailSubject.length} / 120
                </span>
              </div>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                maxLength={120}
                placeholder="Subject line..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm"
              />
            </div>

            {/* Email Body & Rich Toolbar */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Email body</label>
              <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                {/* Toolbar */}
                <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between text-xs text-slate-600 select-none">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEmailBody((p) => p + ' **bold**')}
                      className="w-7 h-7 font-bold hover:bg-slate-200/70 rounded flex items-center justify-center transition-colors text-slate-700"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailBody((p) => p + ' *italic*')}
                      className="w-7 h-7 italic font-serif hover:bg-slate-200/70 rounded flex items-center justify-center transition-colors text-slate-700"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailBody((p) => p + ' <u>underline</u>')}
                      className="w-7 h-7 underline hover:bg-slate-200/70 rounded flex items-center justify-center transition-colors text-slate-700"
                      title="Underline"
                    >
                      U
                    </button>
                    <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => setEmailBody((p) => p + ' [link text](https://reachinbox.ai)')}
                      className="flex items-center gap-1 px-2 py-1 hover:bg-slate-200/70 rounded transition-colors text-slate-700"
                      title="Insert Link"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </button>
                  </div>

                  {/* Variable Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowVariableDropdown(!showVariableDropdown)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-indigo-600 font-medium hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <span className="font-mono text-xs">{'{ }'}</span>
                      <span>Variable</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showVariableDropdown && (
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-100 rounded-xl shadow-xl py-1 z-30 text-xs">
                        {['first_name', 'last_name', 'company', 'email', 'job_title'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleInsertVariable(v)}
                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-600 font-mono text-[11px] transition-colors"
                          >
                            &#123;&#123;{v}&#125;&#125;
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  rows={9}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Compose your email message here..."
                  className="w-full bg-white p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-y leading-relaxed font-sans"
                />
              </div>
            </div>
          </div>

          {/* Card: Step 2 Leads & Recipient CSV */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-7 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Leads & recipient list</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload a CSV of leads (RFC 5322 email validation with duplicate removal).
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {recipients.length} recipients ready
              </span>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                }}
              />
              <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                Click to upload leads CSV or drag and drop
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Comma-separated file with an &apos;email&apos; column (and optional &apos;first_name&apos;, &apos;company&apos;)
              </p>
            </div>

            {/* Manual add input */}
            <div className="flex gap-2">
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
                placeholder="Or type/paste email address and press Enter..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleManualAdd}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
              >
                Add email
              </button>
            </div>

            {/* Recipient preview chips */}
            {recipients.length > 0 && (
              <div className="pt-2">
                <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {recipients.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-mono shadow-2xs"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Schedule Settings (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Schedule settings</h3>
            <p className="text-xs text-slate-400 mt-0.5">Control when and how fast emails are sent.</p>
          </div>

          {/* Sender Identity Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Sender identity</label>
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
              {senders.length === 0 && (
                <option value="">Alex from ReachInbox (alex@reachinbox.com)</option>
              )}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Start date</label>
            <div className="relative flex items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm pr-10"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {/* Start Time */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Start time</label>
            <div className="relative flex items-center">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm pr-10"
              />
              <Clock className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {/* Delay Between Emails */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Delay between emails</label>
            <div className="relative flex items-center">
              <input
                type="number"
                min={1}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm pr-20"
              />
              <span className="absolute right-3 text-xs text-slate-400 pointer-events-none">
                seconds
              </span>
            </div>
          </div>

          {/* Maximum emails per hour */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Maximum emails per hour</label>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
            />
            <p className="text-[11px] text-slate-400">Your sender limit is 150/hour.</p>
          </div>

          {/* Estimated Completion Box */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Estimated completion</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {computeEstimatedCompletion()}
              </p>
            </div>
          </div>

          {/* CTA Submit Button */}
          <button
            onClick={handleScheduleCampaign}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-sm shadow-sm transition-all hover:shadow active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling jobs...</span>
              </>
            ) : (
              <span>Schedule campaign</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
