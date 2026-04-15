'use client';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-risk-high/10 border border-risk-high/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-risk-high" size={24} />
        </div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-text-muted text-sm mb-6">
          {error.message || 'An unexpected error occurred. Our team has been notified.'}
        </p>
        <button onClick={reset} className="btn-brand flex items-center gap-2 mx-auto">
          <RefreshCw size={15} />
          Try again
        </button>
      </div>
    </div>
  );
}
