import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected network error occurred while communicating with the cluster API.',
  onRetry,
  isRetrying = false
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-500/20 bg-red-950/10 backdrop-blur-sm my-4">
      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-red-200 mb-1">{title}</h3>
      <p className="text-xs text-red-300/80 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          isLoading={isRetrying}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
