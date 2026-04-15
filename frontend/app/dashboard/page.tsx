'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText, Eye, TrendingUp, AlertTriangle,
  Search, ArrowRight, Clock, BarChart3, Plus
} from 'lucide-react';
import { reportApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ReportCard } from '@/components/report/ReportCard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const router       = useRouter();
  const { user }     = useAuthStore();
  const [reports,  setReports]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({ total: 0, high: 0, medium: 0, low: 0 });

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      const res = await reportApi.list({ limit: 6 });
      const data: any[] = res.data.data.reports || [];
      setReports(data);
      const complete = data.filter(r => r.status === 'complete');
      setStats({
        total:  res.data.data.meta?.total || data.length,
        high:   complete.filter(r => r.risk_level === 'HIGH').length,
        medium: complete.filter(r => r.risk_level === 'MEDIUM').length,
        low:    complete.filter(r => r.risk_level === 'LOW').length,
      });
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) return <DashboardSkeleton />;

  const tier          = user?.subscription_tier || 'starter';
  const reportsUsed   = user?.reports_used_this_month || 0;
  const reportsLimit  = user?.plan_reports_limit;
  const usagePct      = reportsLimit ? Math.min(100, (reportsUsed / reportsLimit) * 100) : 0;

  const STAT_CARDS = [
    {
      label: 'Total Reports',
      value: stats.total,
      icon:  FileText,
      color: 'text-brand',
      bg:    'bg-brand/10 border-brand/20',
      sub:   tier === 'starter' ? 'Pay-per-use' : `${reportsUsed}/${reportsLimit ?? '∞'} this month`,
    },
    {
      label: 'High Risk',
      value: stats.high,
      icon:  AlertTriangle,
      color: 'text-risk-high',
      bg:    'bg-risk-high/10 border-risk-high/20',
      sub:   'Vendors flagged',
    },
    {
      label: 'Medium Risk',
      value: stats.medium,
      icon:  BarChart3,
      color: 'text-risk-medium',
      bg:    'bg-risk-medium/10 border-risk-medium/20',
      sub:   'Needs review',
    },
    {
      label: 'Low Risk',
      value: stats.low,
      icon:  TrendingUp,
      color: 'text-risk-low',
      bg:    'bg-risk-low/10 border-risk-low/20',
      sub:   'Clear to proceed',
    },
  ];

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">

      {/* ── Welcome bar ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {stats.total === 0 ? 'Run your first vendor report below' : `${stats.total} report${stats.total !== 1 ? 's' : ''} in your account`}
          </p>
        </div>
        <Link href="/search" className="btn-brand flex items-center gap-2 text-sm py-2.5 flex-shrink-0">
          <Plus size={15} />
          New Report
        </Link>
      </motion.div>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.bg}`}>
                <card.icon size={15} className={card.color} />
              </div>
            </div>
            <div className={`text-3xl font-mono font-bold ${card.color} mb-1`}>{card.value}</div>
            <p className="text-xs text-text-muted">{card.sub}</p>
            {card.label === 'Total Reports' && reportsLimit && (
              <div className="mt-3 h-1.5 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-700"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent reports */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-text-primary text-base">Recent Reports</h2>
              <Link href="/reports" className="flex items-center gap-1 text-xs text-brand hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {reports.slice(0, 4).map((report, i) => (
                <ReportCard key={report.report_id} report={report} index={i} />
              ))}
            </div>
          </div>

          {/* Sidebar: Quick actions + plan */}
          <div className="space-y-4">

            {/* Quick search */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
              <h3 className="font-display font-bold text-sm text-text-primary mb-3">Quick Lookup</h3>
              <Link href="/search" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-dark border border-surface-border hover:border-brand/40 text-text-muted text-sm font-mono transition-colors">
                <Search size={14} />
                <span>Enter CIN or name…</span>
              </Link>
            </motion.div>

            {/* Plan usage */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-sm text-text-primary">Your Plan</h3>
                <span className="px-2 py-0.5 rounded-full bg-brand/15 text-brand text-[10px] font-bold uppercase tracking-wide">{tier}</span>
              </div>
              {tier === 'starter' ? (
                <div>
                  <p className="text-xs text-text-muted mb-3">Pay ₹2,000 per report. Upgrade for monthly reports + monitoring.</p>
                  <Link href="/settings/billing" className="btn-brand w-full text-center text-xs py-2.5 block">
                    Upgrade Plan
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Reports</span>
                      <span className="text-text-secondary font-mono">{reportsUsed}/{reportsLimit ?? '∞'}</span>
                    </div>
                    {reportsLimit && (
                      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${usagePct}%` }} />
                      </div>
                    )}
                  </div>
                  <Link href="/settings/billing" className="text-xs text-brand hover:underline flex items-center gap-1">
                    Manage billing <ArrowRight size={11} />
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Risk distribution mini chart */}
            {stats.total > 0 && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
                <h3 className="font-display font-bold text-sm text-text-primary mb-4">Risk Distribution</h3>
                {[
                  { label: 'HIGH',   count: stats.high,   color: '#DC2626' },
                  { label: 'MEDIUM', count: stats.medium, color: '#F59E0B' },
                  { label: 'LOW',    count: stats.low,    color: '#16A34A' },
                ].map(({ label, count, color }) => {
                  const total = stats.high + stats.medium + stats.low || 1;
                  return (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">{label}</span>
                        <span className="font-mono text-text-secondary">{count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / total) * 100}%` }}
                          transition={{ delay: 0.5, duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
        <FileText size={28} className="text-brand" />
      </div>
      <h3 className="text-xl font-display font-bold text-text-primary mb-2">No reports yet</h3>
      <p className="text-text-muted text-sm mb-6 max-w-sm mx-auto">
        Search any Indian company by name or CIN to generate your first vendor risk report.
      </p>
      <Link href="/search" className="btn-brand inline-flex items-center gap-2">
        <Search size={15} />
        Search a vendor
      </Link>
    </motion.div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
