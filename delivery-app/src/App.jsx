import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
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
                background: '#18181b',
                color: '#fafafa',
                border: '1px solid #3f3f46',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                maxWidth: '92vw'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#18181b'
                }
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#18181b'
                }
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
