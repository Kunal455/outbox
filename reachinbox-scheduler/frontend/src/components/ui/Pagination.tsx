import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  isLoading = false
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 text-xs text-gray-400">
      <div>
        {totalItems !== undefined && (
          <span>
            Total <strong className="text-gray-200">{totalItems}</strong> records
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs mr-2">
          Page <strong className="text-gray-200">{currentPage}</strong> of{' '}
          <strong className="text-gray-200">{Math.max(1, totalPages)}</strong>
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
