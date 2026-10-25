import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

describe('UI Reusable Components', () => {
  describe('Button', () => {
    it('renders button text and handles click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('disables button when isLoading is true', () => {
      render(<Button isLoading>Submitting</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders status text capitalized', () => {
      render(<Badge status="scheduled" />);
      expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
    });

    it('renders sent status variant', () => {
      render(<Badge status="sent" />);
      expect(screen.getByText(/sent/i)).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders title, description and triggers action', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="No Emails"
          description="Empty queue test"
          actionLabel="Create Now"
          onAction={onAction}
        />
      );

      expect(screen.getByText('No Emails')).toBeInTheDocument();
      expect(screen.getByText('Empty queue test')).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: /create now/i });
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorState', () => {
    it('renders error message and retry button', () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="Connection Error"
          message="Failed to reach server"
          onRetry={onRetry}
        />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to reach server')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
