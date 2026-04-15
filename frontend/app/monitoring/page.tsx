'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Plus, Trash2, RefreshCw, Bell, BellOff,
  AlertTriangle, CheckCircle2, Loader2, Lock
} from 'lucide-react';
import { monitorApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

export default function MonitoringPage() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [newCin,   setNewCin]   = useState('');
  const [newName,  setNewName]  = useState('');

  const tier = user?.subscription_tier || 'starter';
  const isLocked = tier === 'starter';

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (!isLocked) load();
    else setLoading(false);
  }, [user]);

  const load = async () => {
    try {
      const res = await monitorApi.list();
      setMonitors(res.data.data.monitors || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCin.trim()) return;
    setAdding(true);
    try {
      const res = await monitorApi.add({ vendor_cin: newCin.trim(), vendor_name: newName.trim() || undefined });
      setMonitors(prev => [res.data.data.monitor, ...prev]);
      setNewCin(''); setNewName('');
      toast.success('Vendor added to monitoring');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add monitor');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from monitoring?`)) return;
    try {
      await monitorApi.delete(id);
      setMonitors(prev => prev.filter(m => m._id !== id));
      toast.success('Monitor removed');
    } catch { toast.error('Failed to remove monitor'); }
  };

  const handleManualRun = async (id: string) => {
    try {
      await monitorApi.run(id);
      toast.success('Re-check queued!');
    } catch (err: any) { toast.error(err.response?.data?.error?.message || 'Failed'); }
  };

  const toggleAlert = async (id: string, current: any) => {
    try {
      const res = await monitorApi.update(id, { alert_config: { email: !current.email } });
      setMonitors(prev => prev.map(m => m._id === id ? res.data.data.monitor : m));
    } catch { toast.error('Failed to update alert settings'); }
  };

  // ── Upsell for starter plan ──────────────────────────────────
  if (isLocked) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
        <Lock size={28} className="text-brand" />
      </div>
      <h1 className="text-2xl font-display font-bold mb-2">Vendor Monitoring</h1>
      <p className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
        Get instant WhatsApp + email alerts when a vendor's VHS score drops or a hard flag appears. Available on Professional and Enterprise plans.
      </p>
      <div className="glass-card p-6 text-left mb-6 max-w-sm mx-auto">
        {['Real-time VHS drop alerts', 'Hard flag detection', 'WhatsApp + email notifications', 'Up to 20 vendors (Pro)', 'Unlimited monitors (Enterprise)'].map(f => (
          <div key={f} className="flex items-center gap-2.5 text-sm text-text-secondary py-2 border-b border-surface-border/40 last:border-0">
            <CheckCircle2 size={14} className="text-risk-low flex-shrink-0" /> {f}
          </div>
        ))}
      </div>
      <Link href="/settings/billing" className="btn-brand inline-flex items-center gap-2">
        Upgrade to Professional — ₹9,999/mo
      </Link>
    </div>
  );

  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <Eye size={22} className="text-brand" /> Vendor Monitoring
          </h1>
          <p className="text-text-muted text-sm">
            {monitors.length}/{user?.plan_monitors_limit ?? '∞'} monitors active
          </p>
        </div>
      </motion.div>

      {/* Add monitor form */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onSubmit={handleAdd}
        className="glass-card p-5 mb-6 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={newCin}
          onChange={e => setNewCin(e.target.value)}
          placeholder="Company CIN (21 chars)"
          className="flex-1 bg-surface-dark border border-surface-border rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
          required
          maxLength={21}
        />
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Company name (optional)"
          className="flex-1 bg-surface-dark border border-surface-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
        />
        <button type="submit" disabled={adding} className="btn-brand flex items-center gap-2 text-sm py-2.5 px-5 flex-shrink-0">
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Monitor
        </button>
      </motion.form>

      {/* Monitors list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={36} className="mx-auto mb-4 text-surface-border" />
          <p className="text-text-muted text-sm">No vendors monitored yet</p>
          <p className="text-xs text-text-muted mt-1">Add a CIN above to start monitoring</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {monitors.map((monitor, i) => (
              <motion.div
                key={monitor._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${monitor.active ? 'bg-risk-low animate-pulse-slow' : 'bg-surface-border'}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-text-primary truncate">
                        {monitor.vendor_name || monitor.vendor_cin}
                      </span>
                      {monitor.last_vhs !== null && monitor.last_vhs !== undefined && (
                        <span className="font-mono text-xs text-text-muted">VHS: <span className="text-text-secondary font-bold">{monitor.last_vhs}</span></span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-text-muted mt-0.5">{monitor.vendor_cin}</p>
                    {monitor.last_checked_at && (
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Last checked: {new Date(monitor.last_checked_at).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>

                  {/* Alert count */}
                  {monitor.alert_history?.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-risk-medium/10 border border-risk-medium/20">
                      <AlertTriangle size={10} className="text-risk-medium" />
                      <span className="text-[10px] font-bold text-risk-medium">{monitor.alert_history.length}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleAlert(monitor._id, monitor.alert_config)}
                      title={monitor.alert_config?.email ? 'Disable alerts' : 'Enable alerts'}
                      className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      {monitor.alert_config?.email
                        ? <Bell size={14} className="text-brand" />
                        : <BellOff size={14} className="text-text-muted" />
                      }
                    </button>
                    <button
                      onClick={() => handleManualRun(monitor._id)}
                      title="Run now"
                      className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      <RefreshCw size={14} className="text-text-muted hover:text-text-primary" />
                    </button>
                    <button
                      onClick={() => handleDelete(monitor._id, monitor.vendor_name || monitor.vendor_cin)}
                      title="Remove monitor"
                      className="p-2 rounded-lg hover:bg-risk-high/10 transition-colors"
                    >
                      <Trash2 size={14} className="text-text-muted hover:text-risk-high" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
