import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';
import { getApiBaseUrl } from './services/api';

export default function App() {
  // The free-tier Render backend spins down after inactivity -- pinging it the moment the app
  // opens gives it a head start waking up, so it's more likely already warm by the time the
  // customer reaches a request-heavy screen like checkout. Fire-and-forget: failure here (e.g.
  // offline) is harmless, nothing downstream depends on it.
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/health`).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            containerStyle={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#111827',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                maxWidth: '92vw'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#111827'
                }
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#111827'
                }
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
