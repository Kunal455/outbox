import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          theme="light"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#1E293B',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
