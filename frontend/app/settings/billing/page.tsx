'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CreditCard, Check, Zap, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { subscriptionApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: '₹2,000', period: '/report',
    desc: 'Pay-per-use — no subscription',
    features: ['Single vendor report', 'PDF download', '90-day history', 'All 13 data sources'],
    highlight: false,
  },
  {
    id: 'pro', name: 'Professional', price: '₹9,999', period: '/month',
    desc: '50 reports + 20 vendor monitors',
    features: ['50 reports/month', '20 vendor monitors', 'Email + WhatsApp alerts', 'Priority support'],
    highlight: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '₹34,999', period: '/month',
    desc: 'Unlimited + API access',
    features: ['Unlimited reports', 'Unlimited monitors', 'CA Partner API', 'White-label PDFs'],
    highlight: false,
  },
];

export default function BillingPage() {
  const router       = useRouter();
  const { user, refreshMe } = useAuthStore();
  const [subData,    setSubData]    = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [upgrading,  setUpgrading]  = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    loadBilling();
  }, [user]);

  const loadBilling = async () => {
    try {
      const res = await subscriptionApi.current();
      setSubData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleUpgrade = async (tierId: string) => {
    if (tierId === 'starter') return;
    setUpgrading(tierId);
    try {
      const res  = await subscriptionApi.upgrade(tierId as any);
      const data = res.data.data;

      await loadRazorpay();
      const rzp = new (window as any).Razorpay({
        key:             data.razorpay_key_id,
        subscription_id: data.subscription_id,
        name:            'VendorIQ',
        description:     `${data.plan_name} subscription`,
        theme:           { color: '#1A56DB', backdrop_color: '#0F172A' },
        handler: async () => {
          toast.success('Subscription activated!');
          await refreshMe();
          await loadBilling();
        },
        modal: { ondismiss: () => setUpgrading(null) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to start subscription');
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You\'ll retain access until end of billing period.')) return;
    setCancelling(true);
    try {
      await subscriptionApi.cancel();
      toast.success('Subscription cancelled');
      await refreshMe();
      await loadBilling();
    } catch { toast.error('Failed to cancel'); }
    finally { setCancelling(false); }
  };

  const currentTier  = user?.subscription_tier || 'starter';
  const usage        = subData?.usage;
  const reportsUsed  = usage?.reports_used  || 0;
  const reportsLimit = usage?.reports_limit;
  const usagePct     = reportsLimit ? Math.min(100, (reportsUsed / reportsLimit) * 100) : 0;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold text-text-primary mb-2 flex items-center gap-2">
        <CreditCard size={22} className="text-brand" /> Billing & Plans
      </motion.h1>
      <p className="text-text-muted text-sm mb-8">Manage your subscription and usage</p>

      {/* Current usage */}
      {!loading && usage && currentTier !== 'starter' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 mb-8">
          <h2 className="font-display font-bold text-sm text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-brand" /> This Month's Usage
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Reports</p>
              <p className="font-mono font-bold text-text-primary">{reportsUsed}<span className="text-text-muted">/{reportsLimit ?? '∞'}</span></p>
              {reportsLimit && (
                <div className="mt-2 h-1.5 bg-surface-border rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${usagePct}%` }} />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Monitors</p>
              <p className="font-mono font-bold text-text-primary">{usage.monitors_used}<span className="text-text-muted">/{usage.monitors_limit ?? '∞'}</span></p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Resets in</p>
              <p className="font-mono font-bold text-text-primary">{usage.days_until_reset} days</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {PLANS.map((plan, i) => {
          const isCurrent = currentTier === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className={`relative glass-card p-5 flex flex-col ${
                isCurrent ? 'border-brand/50' :
                plan.highlight && !isCurrent ? 'border-surface-border' : ''
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand text-white text-[10px] font-bold tracking-wide">
                  CURRENT PLAN
                </div>
              )}
              {plan.highlight && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-surface-card border border-surface-border text-text-muted text-[10px] font-bold tracking-wide">
                  MOST POPULAR
                </div>
              )}

              <h3 className="font-display font-bold text-base mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-mono font-bold text-text-primary">{plan.price}</span>
                <span className="text-text-muted text-xs">{plan.period}</span>
              </div>
              <p className="text-xs text-text-muted mb-4">{plan.desc}</p>

              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                    <Check size={12} className="text-risk-low flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="flex items-center gap-2 text-xs text-risk-low font-semibold">
                  <Check size={13} /> Active
                </div>
              ) : plan.id === 'starter' ? (
                <p className="text-xs text-text-muted">Default — no action needed</p>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={!!upgrading}
                  className={`flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl font-semibold transition-all ${
                    plan.highlight ? 'btn-brand' : 'btn-ghost'
                  }`}
                >
                  {upgrading === plan.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Upgrade
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Cancel subscription */}
      {currentTier !== 'starter' && subData?.subscription?.status === 'active' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5 border-risk-high/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-risk-high mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary mb-0.5">Cancel Subscription</p>
              <p className="text-xs text-text-muted">Your access will continue until the end of the current billing period.</p>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs font-semibold text-risk-high hover:underline flex-shrink-0"
            >
              {cancelling ? 'Cancelling…' : 'Cancel plan'}
            </button>
          </div>
        </motion.div>
      )}

      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}

function loadRazorpay(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement('script');
    s.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}
