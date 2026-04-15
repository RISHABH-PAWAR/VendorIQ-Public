'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Building2, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export function RegisterForm() {
  const router    = useRouter();
  const register  = useAuthStore(s => s.register);
  const loading   = useAuthStore(s => s.loading);
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await register(form);
      toast.success('Account created!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const FIELDS = [
    { key: 'name',     icon: User,      type: 'text',     placeholder: 'Rishabh Pawar',       label: 'Full Name',   required: true  },
    { key: 'email',    icon: Mail,      type: 'email',    placeholder: 'you@company.com',      label: 'Work Email',  required: true  },
    { key: 'company',  icon: Building2, type: 'text',     placeholder: 'Acme Corp',            label: 'Company',     required: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center">
            <Zap size={18} className="text-brand" />
          </div>
          <span className="font-display font-bold text-xl">Vendor<span className="text-brand">IQ</span></span>
        </div>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-2">Create your account</h1>
        <p className="text-text-muted text-sm">Get your first vendor report in under 5 minutes</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(({ key, icon: Icon, type, placeholder, label, required }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              {label} {!required && <span className="text-text-muted text-xs">(optional)</span>}
            </label>
            <div className="relative">
              <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={type}
                value={(form as any)[key]}
                onChange={set(key)}
                required={required}
                placeholder={placeholder}
                className="w-full bg-surface-card border border-surface-border rounded-xl pl-11 pr-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
        ))}

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              required
              placeholder="Min. 8 characters"
              className="w-full bg-surface-card border border-surface-border rounded-xl pl-11 pr-11 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-brand w-full flex items-center justify-center gap-2 py-3">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Creating account...' : 'Create account — free'}
        </button>

        <p className="text-center text-[11px] text-text-muted">
          By signing up you agree to our Terms of Service. First report costs ₹2,000.
        </p>
      </form>


      {/* ── Divider ───────────────────────────────────────── */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-dark px-3 text-xs text-text-muted">or sign up with</span>
        </div>
      </div>

      {/* ── Google OAuth ───────────────────────────────────── */}
      <a
        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/google`}
        className="flex items-center justify-center gap-3 w-full border border-surface-border rounded-xl py-3 text-sm font-medium text-text-secondary hover:bg-surface-card hover:border-white/20 transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </a>

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-brand hover:underline font-medium">Sign in</Link>
      </p>
    </motion.div>
  );
}
