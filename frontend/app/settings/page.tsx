'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Lock, Building2, Mail, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router   = useRouter();
  const { user, updateUser } = useAuthStore();
  const [saving,    setSaving]   = useState(false);
  const [pwSaving,  setPwSaving] = useState(false);
  const [profile,   setProfile]  = useState({ name: '', company: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    setProfile({ name: user.name || '', company: (user as any).company || '', email: user.email || '' });
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/me', { name: profile.name, company: profile.company });
      updateUser(res.data.data.user);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPw !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    if (passwords.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { current_password: passwords.current, new_password: passwords.newPw });
      toast.success('Password changed');
      setPasswords({ current: '', newPw: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  return (
    <div className="px-4 lg:px-8 py-8 max-w-2xl mx-auto">
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold text-text-primary mb-8">
        Settings
      </motion.h1>

      {/* Profile */}
      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onSubmit={saveProfile} className="glass-card p-6 mb-6">
        <h2 className="font-display font-bold text-base mb-5 flex items-center gap-2">
          <User size={16} className="text-brand" /> Profile
        </h2>
        <div className="space-y-4">
          {[
            { key: 'name',    icon: User,      label: 'Full Name',  type: 'text',  placeholder: 'Rishabh Pawar' },
            { key: 'email',   icon: Mail,      label: 'Email',      type: 'email', placeholder: '', disabled: true },
            { key: 'company', icon: Building2, label: 'Company',    type: 'text',  placeholder: 'Acme Corp' },
          ].map(({ key, icon: Icon, label, type, placeholder, disabled }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">{label}</label>
              <div className="relative">
                <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={type}
                  value={(profile as any)[key]}
                  onChange={e => setProfile(v => ({ ...v, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="w-full bg-surface-dark border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          ))}
        </div>
        <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 mt-5 text-sm py-2.5">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Profile
        </button>
      </motion.form>

      {/* Password */}
      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={changePassword} className="glass-card p-6 mb-6">
        <h2 className="font-display font-bold text-base mb-5 flex items-center gap-2">
          <Lock size={16} className="text-brand" /> Change Password
        </h2>
        <div className="space-y-4">
          {[
            { key: 'current', label: 'Current Password', placeholder: '••••••••' },
            { key: 'newPw',   label: 'New Password',     placeholder: 'Min. 8 characters' },
            { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">{label}</label>
              <input
                type="password"
                value={(passwords as any)[key]}
                onChange={e => setPasswords(v => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
                required
                className="w-full bg-surface-dark border border-surface-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}
        </div>
        <button type="submit" disabled={pwSaving} className="btn-ghost flex items-center gap-2 mt-5 text-sm py-2.5">
          {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Update Password
        </button>
      </motion.form>

      {/* Account info */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h2 className="font-display font-bold text-base mb-4 text-text-primary">Account Info</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">User ID</span>
            <span className="font-mono text-xs text-text-secondary">{user?._id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Plan</span>
            <span className="capitalize font-semibold text-brand">{user?.subscription_tier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Reports this month</span>
            <span className="font-mono text-text-secondary">{user?.reports_used_this_month ?? 0}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
