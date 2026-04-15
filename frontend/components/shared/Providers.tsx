'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore(s => s.restoreSession);

  // Restore JWT session from localStorage on mount
  useEffect(() => {
    restoreSession();
    // Mark body as loaded (prevents transition FOUC)
    document.body.classList.add('loaded');
  }, [restoreSession]);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:   'var(--surface-card)',
            color:        'var(--text-primary)',
            border:       '1px solid var(--surface-border)',
            borderRadius: '12px',
            fontFamily:   'var(--font-satoshi)',
          },
          success: { iconTheme: { primary: '#16A34A', secondary: '#0F172A' } },
          error:   { iconTheme: { primary: '#DC2626', secondary: '#0F172A' } },
        }}
      />
    </>
  );
}
