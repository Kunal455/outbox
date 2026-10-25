import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithDev: (email?: string, name?: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for token in URL query parameter (e.g. from OAuth redirect if passed)
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('reachinbox_token', tokenParam);
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    refreshUser();
  }, [refreshUser]);

  const loginWithDev = async (email?: string, name?: string) => {
    setLoading(true);
    try {
      const result = await authService.devLogin(email, name);
      setUser(result.user);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    window.location.href = authService.getGoogleAuthUrl();
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithDev, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
