'use client';

/**
 * VendorIQ — Admin Dashboard
 * ============================
 * Cron job health, Bull queue depths, system stats.
 * Protected: requires ADMIN_SECRET env var entered at runtime.
 *
 * Route: /admin
 * Auth:  admin secret (not standard JWT)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface CronJob {
  last_run: string;
  hours_ago: number | null;
  last_error: string | null;
  running: boolean;
  status: 'ok' | 'error' | 'pending';
}

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  status: 'ok' | 'error';
  error?: string;
}

interface Health {
  timestamp: string;
  uptime_s: number;
  memory_mb: number;
  node_version: string;
  env: string;
  mongodb: { state: string; host: string };
  queues: QueueStats[];
  cron: Record<string, CronJob>;
}

interface Stats {
  users: number;
  reports: number;
  active_monitors: number;
  bulk_jobs: number;
  reports_24h: number;
  risk_distribution: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: 'bg-green-400', error: 'bg-red-400', pending: 'bg-yellow-400',
    connected: 'bg-green-400', disconnected: 'bg-red-400',
    processing: 'bg-blue-400', complete: 'bg-green-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-slate-500'}`} />;
}

function uptimeStr(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const CRON_LABELS: Record<string, string> = {
  sebi:       'SEBI Debarred Orders  (daily 00:00)',
  sfio:       'SFIO Watchlist        (weekly Sun 01:00)',
  gem:        'GeM Blacklist         (weekly Mon 02:00)',
  din_csv:    'DIN Disqualified CSV  (monthly 1st 03:00)',
  rbi:        'RBI Wilful Defaulters (quarterly 04:00)',
  monitoring: 'Monitoring Dispatch   (nightly 02:00)',
};

// ── Main component ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [stats,  setStats]  = useState<Stats  | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null);

  const fetchData = useCallback(async (sec: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'x-admin-secret': sec };
      const [healthRes, statsRes] = await Promise.all([
        api.get('/admin/health', { headers }),
        api.get('/admin/stats',  { headers }),
      ]);
      setHealth(healthRes.data.data);
      setStats(statsRes.data.data);
      setAuthed(true);
    } catch (err: any) {
      setError(err.response?.status === 401 ? 'Invalid admin secret' : 'Failed to fetch data');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 15s when authed
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => fetchData(secret), 15000);
    return () => clearInterval(t);
  }, [authed, secret, fetchData]);

  const triggerCron = async (job: string) => {
    setTriggeringJob(job);
    setTriggerMsg(null);
    try {
      const res = await api.post(`/admin/cron/${job}/run`, {}, { headers: { 'x-admin-secret': secret } });
      setTriggerMsg(`✓ ${job} triggered: ${JSON.stringify(res.data.data.result)}`);
      setTimeout(() => fetchData(secret), 2000);
    } catch (err: any) {
      setTriggerMsg(`✗ ${err.response?.data?.error?.message || 'Failed'}`);
    } finally {
      setTriggeringJob(null);
    }
  };

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-surface-dark flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">Admin Access</h1>
            <p className="text-xs text-slate-500 mt-1">Enter your ADMIN_SECRET</p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchData(secret)}
              placeholder="Admin secret"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand/50 font-mono"
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button
              onClick={() => fetchData(secret)}
              disabled={loading || !secret}
              className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-blue-600 transition-colors"
            >
              {loading ? 'Authenticating…' : 'Enter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Admin</h1>
            {health && <p className="text-xs text-slate-500 font-mono mt-1">Last updated {new Date(health.timestamp).toLocaleTimeString('en-IN')}</p>}
          </div>
          <button onClick={() => fetchData(secret)} className="text-xs text-brand hover:text-blue-400 transition-colors px-4 py-2 border border-brand/20 rounded-lg">
            Refresh
          </button>
        </div>

        {/* System stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { label: 'Users',         value: stats.users,           color: 'text-white' },
              { label: 'Reports',       value: stats.reports,         color: 'text-white' },
              { label: 'Last 24h',      value: stats.reports_24h,     color: 'text-brand' },
              { label: 'Monitors',      value: stats.active_monitors, color: 'text-green-400' },
              { label: 'Bulk Jobs',     value: stats.bulk_jobs,       color: 'text-white' },
              { label: 'HIGH Risk',     value: stats.risk_distribution?.HIGH || 0, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/3 border border-white/5 rounded-xl p-4 text-center">
                <div className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">

          {/* System health */}
          {health && (
            <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-white mb-4">System</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-slate-400">Environment</span>
                  <span className="text-xs font-mono text-white">{health.env}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-slate-400">Node.js</span>
                  <span className="text-xs font-mono text-slate-300">{health.node_version}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-slate-400">Uptime</span>
                  <span className="text-xs font-mono text-green-400">{uptimeStr(health.uptime_s)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-slate-400">Memory</span>
                  <span className="text-xs font-mono text-slate-300">{health.memory_mb} MB RSS</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-slate-400">MongoDB</span>
                  <span className="flex items-center gap-2">
                    <StatusDot status={health.mongodb.state} />
                    <span className="text-xs font-mono text-slate-300">{health.mongodb.state}</span>
                  </span>
                </div>
              </div>

              {/* Queue depths */}
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-3">Queues</h3>
              <div className="space-y-2">
                {health.queues.map(q => (
                  <div key={q.name} className="bg-black/20 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-white">{q.name}</span>
                      <StatusDot status={q.status} />
                    </div>
                    {q.status === 'ok' ? (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'wait',   value: q.waiting,   color: q.waiting   > 0 ? 'text-yellow-400' : 'text-slate-500' },
                          { label: 'active', value: q.active,    color: q.active    > 0 ? 'text-blue-400'   : 'text-slate-500' },
                          { label: 'done',   value: q.completed, color: 'text-green-400' },
                          { label: 'fail',   value: q.failed,    color: q.failed    > 0 ? 'text-red-400'    : 'text-slate-500' },
                        ].map(s => (
                          <div key={s.label}>
                            <div className={`text-sm font-mono font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-slate-600">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-400">{q.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cron jobs */}
          {health && (
            <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Cron Jobs</h2>

              <AnimatePresence>
                {triggerMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`mb-4 p-3 rounded-xl text-xs font-mono ${triggerMsg.startsWith('✓') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                  >
                    {triggerMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                {Object.entries(health.cron).map(([name, job]) => (
                  <div key={name} className="bg-black/20 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusDot status={job.running ? 'processing' : job.status} />
                          <span className="text-xs font-mono text-white">{name}</span>
                          {job.running && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">running</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{CRON_LABELS[name] || name}</p>
                        <p className="text-xs text-slate-600 mt-1 font-mono">
                          Last: {job.last_run === 'never' ? 'never' : `${job.hours_ago ?? 0}h ago`}
                        </p>
                        {job.last_error && (
                          <p className="text-xs text-red-400 mt-1 truncate" title={job.last_error}>
                            ✗ {job.last_error}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => triggerCron(name)}
                        disabled={!!triggeringJob || job.running}
                        className="shrink-0 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors disabled:opacity-40 font-mono"
                      >
                        {triggeringJob === name ? '…' : '▶ Run'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
