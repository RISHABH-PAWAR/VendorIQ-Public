'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Filter, Search } from 'lucide-react';
import { reportApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ReportCard } from '@/components/report/ReportCard';
import { ReportCardSkeleton } from '@/components/ui/Skeleton';

const RISK_FILTERS  = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_FILTERS = ['ALL', 'complete', 'collecting', 'generating', 'failed'];

export default function ReportsPage() {
  const router   = useRouter();
  const { user } = useAuthStore();
  const [reports,    setReports]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page,       setPage]       = useState(1);
  const [meta,       setMeta]       = useState({ total: 0, pages: 1 });

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (riskFilter   !== 'ALL') params.risk_level = riskFilter;
      if (statusFilter !== 'ALL') params.status     = statusFilter;
      const res = await reportApi.list(params);
      setReports(res.data.data.reports || []);
      setMeta(res.data.data.meta || { total: 0, pages: 1 });
    } catch {}
    finally { setLoading(false); }
  }, [page, riskFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const changeFilter = (type: 'risk' | 'status', value: string) => {
    setPage(1);
    if (type === 'risk')   setRiskFilter(value);
    else                   setStatusFilter(value);
  };

  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Reports</h1>
          <p className="text-text-muted text-sm">{meta.total} report{meta.total !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/search" className="btn-brand flex items-center gap-2 text-sm py-2.5">
          <Plus size={15} /> New Report
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap gap-3 mb-6">
        {/* Risk filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-card border border-surface-border">
          {RISK_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => changeFilter('risk', f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                riskFilter === f
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f === 'ALL' ? 'All Risk' : f}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-card border border-surface-border">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => changeFilter('status', f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                statusFilter === f
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f === 'ALL' ? 'All Status' : f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <ReportCardSkeleton key={i} />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <Search size={40} className="mx-auto mb-4 text-surface-border" />
          <p className="text-text-muted text-sm">No reports match your filters</p>
          <button onClick={() => { setRiskFilter('ALL'); setStatusFilter('ALL'); }} className="text-brand text-xs mt-2 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, i) => (
            <ReportCard key={report.report_id} report={report} index={i} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost text-xs py-2 px-4 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-text-muted">Page {page} of {meta.pages}</span>
          <button
            onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
            className="btn-ghost text-xs py-2 px-4 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
