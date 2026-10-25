import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Shield, CheckCircle2, AlertCircle, ArrowRight, Server, Terminal, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { user, loading, loginWithGoogle, loginWithDev } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [devEmail, setDevEmail] = useState('alex@reachinbox.com');
  const [devName, setDevName] = useState('Alex Morgan');
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL parameters for OAuth errors
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error) {
      if (error === 'oauth_failed') {
        setErrorMessage('Google OAuth authentication was interrupted or rejected.');
      } else if (error === 'missing_credentials') {
        setErrorMessage('Google OAuth credentials are not configured on the backend server.');
      } else {
        setErrorMessage(`Authentication error: ${error}`);
      }
    }
  }, [location.search]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDevLoggingIn(true);
    setErrorMessage(null);
    try {
      await loginWithDev(devEmail, devName);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate development evaluator account.');
    } finally {
      setIsDevLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden text-slate-800">
      {/* Background soft ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-7 z-10">
        {/* Branding header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-3.5">
            <svg
              className="w-7 h-7 -rotate-45 translate-x-0.5 -translate-y-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center justify-center gap-2">
            ReachInbox
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              PRO
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide uppercase">
            Outbox Labs Email Job Scheduler
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-800">Authentication Note</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* 1-Click Dev Evaluator Login (Recommended for testing without Google keys) */}
          <form onSubmit={handleDevLogin} className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>1-Click Evaluator Access</span>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                Zero Setup
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDevLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-xs shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isDevLoggingIn ? 'Signing in...' : 'Sign In as Alex Morgan'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold shrink-0">
              or
            </span>
          </div>

          {/* Google OAuth Option */}
          <button
            type="button"
            onClick={() => loginWithGoogle()}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-all duration-150 shadow-2xs hover:border-slate-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google OAuth</span>
          </button>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>BullMQ Redis Queue • PostgreSQL ACID • AES-256 Encryption</span>
        </div>
      </div>
    </div>
  );
};
