import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';
import { getApiBaseUrl } from './services/api';

export default function App() {
  // The free-tier Render backend spins down after inactivity -- pinging it the moment the app
  // opens gives it a head start waking up, so it's more likely already warm by the time the admin
  // reaches a request-heavy screen. Fire-and-forget: failure here (e.g. offline) is harmless.
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/health`).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '0.75rem',
                fontSize: '0.875rem'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#0f172a'
                }
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#0f172a'
                }
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
