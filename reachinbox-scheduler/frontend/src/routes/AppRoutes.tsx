import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ComposeCampaignPage } from '../features/campaigns/ComposeCampaignPage';
import { ScheduledEmailsPage } from '../features/emails/ScheduledEmailsPage';
import { SentEmailsPage } from '../features/emails/SentEmailsPage';
import { FailedEmailsPage } from '../features/emails/FailedEmailsPage';
import { CampaignsPage } from '../features/campaigns/CampaignsPage';
import { SearchPage } from '../features/search/SearchPage';
import { SenderSettingsPage } from '../features/senders/SenderSettingsPage';
import { SlackIntegrationPage } from '../features/slack/SlackIntegrationPage';
import { QueueMonitoringPage } from '../features/queues/QueueMonitoringPage';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-medium">Verifying ReachInbox session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          !loading && user ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      {/* Protected Dashboard Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="compose" element={<ComposeCampaignPage />} />
        <Route path="scheduled" element={<ScheduledEmailsPage />} />
        <Route path="sent" element={<SentEmailsPage />} />
        <Route path="failed" element={<FailedEmailsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="senders" element={<SenderSettingsPage />} />
        <Route path="slack" element={<SlackIntegrationPage />} />
        <Route path="queues" element={<QueueMonitoringPage />} />
        <Route path="settings" element={<Navigate to="/senders" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
