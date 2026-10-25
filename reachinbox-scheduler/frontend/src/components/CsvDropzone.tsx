import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { CsvPreviewResult } from '../types';

interface CsvDropzoneProps {
  onRecipientsLoaded: (recipients: string[]) => void;
  onClear: () => void;
}

export const CsvDropzone: React.FC<CsvDropzoneProps> = ({ onRecipientsLoaded, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setError('Please upload a valid .csv file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.emails.uploadCsv(file);
      setPreview(result);
      onRecipientsLoaded(result.validRecipients);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-dark-border bg-dark-card/50 hover:border-brand-500/50 hover:bg-dark-hover/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto mb-2">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-dark-text">
            {isLoading ? 'Parsing and validating CSV...' : 'Click or drag & drop CSV recipient list'}
          </p>
          <p className="text-xs text-dark-muted mt-1">
            Accepts CSV with "email" column (auto deduplicated, up to 10,000 addresses)
          </p>
        </div>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  {preview.filename}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {preview.validCount} Valid Recipients
                  </span>
                </p>
                <p className="text-xs text-dark-muted">
                  {preview.totalDetected} detected • {preview.duplicatesRemoved} duplicates removed
                  {preview.invalidCount > 0 && ` • ${preview.invalidCount} invalid format skipped`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-dark-hover text-dark-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {preview.errors.length > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> CSV Validation Notices:
              </p>
              <ul className="list-disc list-inside space-y-0.5 opacity-90">
                {preview.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
