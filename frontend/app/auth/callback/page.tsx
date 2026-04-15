'use client';

/**
 * VendorIQ — OAuth Callback Page
 * =================================
 * After Google OAuth, the backend redirects here with ?token=JWT
 * This page:
 *   1. Reads token from URL params
 *   2. Stores it via authStore (same path as normal login)
 *   3. Fetches user profile
 *   4. Redirects to /dashboard
 *
 * Route: /auth/callback
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

export default function AuthCallbackPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      const msgs: Record<string, string> = {
        oauth_cancelled:        'Sign-in was cancelled.',
        email_not_verified:     'Google account email is not verified.',
        oauth_not_configured:   'Google login is not configured.',
        oauth_failed:           'Google sign-in failed. Please try again.',
      };
      const msg = msgs[error || ''] || 'Sign-in failed.';
      router.replace(`/auth/login?error=${encodeURIComponent(msg)}`);
      return;
    }

    // Store token
    localStorage.setItem('vendoriq_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Fetch user profile then redirect
    api.get('/auth/me')
      .then(res => {
        // Manually set store state
        useAuthStore.setState({ token, user: res.data.data.user, loading: false });
        // Clean the URL before redirecting
        router.replace('/dashboard');
      })
      .catch(() => {
        localStorage.removeItem('vendoriq_token');
        router.replace('/auth/login?error=Session+setup+failed');
      });
  }, []);

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
