'use client';

/**
 * VendorIQ — Bulk Audit Page
 * ============================
 * Upload a CSV/XLSX of up to 50 CINs, watch real-time progress,
 * and get a scored results table you can download.
 *
 * Route: /bulk-audit
 * Auth:  required (Pro + Enterprise only)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { bulkAuditApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Skeleton } from '@/components/ui/Skeleton';

// ── Types ──────────────────────────────────────────────────────────────────
interface BulkResult {
  cin: string;
  vendor_name: string;
  status: 'complete' | 'failed' | 'processing';
  vhs_score?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  error?: string;
  row_index: number;
}

interface BulkAudit {
  _id: string;
  file_name: string;
  status: 'processing' | 'complete' | 'failed';
  total_count: number;
  completed_count: number;
  failed_count: number;
  progress_percent: number;
  results: BulkResult[];
  started_at: string;
  finished_at?: string;
}

// ── Risk colour helper ─────────────────────────────────────────────────────
function riskBg(risk?: string) {
  if (risk === 'HIGH')   return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (risk === 'MEDIUM') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (risk === 'LOW')    return 'bg-green-500/10 text-green-400 border-green-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

// ── VHS colour ─────────────────────────────────────────────────────────────
function vhsColor(score?: number) {
  if (score == null) return '#64748B';
  if (score >= 75)   return '#22C55E';
  if (score >= 50)   return '#F59E0B';
  return '#EF4444';
}

// ── CSV Export ─────────────────────────────────────────────────────────────
function downloadCSV(audit: BulkAudit) {
  const rows = [
    ['CIN', 'Vendor Name', 'VHS Score', 'Risk Level', 'Status'],
    ...audit.results.map(r => [
      r.cin, r.vendor_name, r.vhs_score ?? '', r.risk_level ?? '', r.status,
    ]),
  ];
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vendoriq_bulk_${audit._id}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BulkAuditPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [auditId, setAuditId]       = useState<string | null>(null);
  const [audit, setAudit]           = useState<BulkAudit | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pastAudits, setPastAudits]  = useState<BulkAudit[]>([]);
  const [pastLoading, setPastLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef      = useRef<NodeJS.Timeout | null>(null);

  // ── Plan guard ─────────────────────────────────────────────────────────
  const isPlanAllowed = user?.subscription_tier !== 'starter';

  // ── Load past audits ───────────────────────────────────────────────────
  useEffect(() => {
    bulkAuditApi.list({ limit: 5 })
      .then(res => setPastAudits(res.data.data.audits || []))
      .catch(() => {})
      .finally(() => setPastLoading(false));
  }, []);

  // ── Poll active audit ──────────────────────────────────────────────────
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await bulkAuditApi.get(id);
        const a: BulkAudit = res.data.data.bulk_audit;
        setAudit(a);
        if (a.status === 'complete' || a.status === 'failed') {
          clearInterval(pollRef.current!);
          setPastAudits(prev => [a, ...prev.filter(p => p._id !== a._id)]);
        }
      } catch {}
    }, 3000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Handle file ────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploadError(null);
    setAudit(null);
    setAuditId(null);
    setUploading(true);
    try {
      const res = await bulkAuditApi.upload(file);
      const id  = res.data.data.bulk_audit_id;
      setAuditId(id);
      startPolling(id);
    } catch (err: any) {
      setUploadError(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [startPolling]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── Template download ──────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csv  = 'cin,vendor_name\nU12345MH2010PTC123456,Acme Pvt Ltd\nL65929MH1986PLC041590,Infosys Ltd';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'vendoriq_bulk_template.csv';
    a.click();
  };

  // ── Plan upsell ────────────────────────────────────────────────────────
  if (!isPlanAllowed) {
    return (
      <div className="min-h-screen bg-surface-dark p-8">
        <div className="max-w-2xl mx-auto text-center mt-24">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3">Bulk Audit</h1>
          <p className="text-slate-400 mb-8">Audit up to 50 vendors at once. Available on Professional and Enterprise plans.</p>
          <Link href="/settings/billing" className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors">
            Upgrade Plan →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Bulk Audit</h1>
          <p className="text-slate-400 text-sm mt-1">Upload a CSV or Excel file with up to 50 CINs for batch vendor scoring.</p>
        </div>

        {/* Upload zone */}
        {!auditId && (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Drop zone */}
            <div className="lg:col-span-2">
              <motion.div
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-brand bg-brand/5'
                    : 'border-white/10 bg-white/2 hover:border-white/20'
                } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                animate={{ scale: isDragging ? 1.01 : 1 }}
                transition={{ duration: 0.15 }}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={onInputChange} />

                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin w-10 h-10 text-brand" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="text-slate-300 text-sm">Uploading and queuing CINs…</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-white font-medium mb-1">Drop your file here</p>
                    <p className="text-slate-500 text-sm">CSV or XLSX · Up to 50 CINs · 5MB max</p>
                    <p className="text-brand text-sm mt-3 font-medium">or click to browse</p>
                  </>
                )}
              </motion.div>

              <AnimatePresence>
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                  >
                    {uploadError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Format guide */}
            <div className="space-y-4">
              <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">File Format</h3>
                <div className="space-y-2 text-sm text-slate-400">
                  <div className="font-mono bg-black/30 rounded-lg px-3 py-2 text-xs">
                    <div className="text-slate-300">cin, vendor_name</div>
                    <div className="text-slate-500">U12345MH2010PTC123456, Acme</div>
                    <div className="text-slate-500">L65929MH1986PLC041590, Infosys</div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Column 1: CIN (required)<br/>Column 2: Name (optional)</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="mt-4 w-full text-center text-xs text-brand hover:text-blue-400 transition-colors py-2 border border-brand/20 rounded-lg"
                >
                  ↓ Download Template CSV
                </button>
              </div>

              <div className="bg-white/3 border border-white/5 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Processing</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Max 50 CINs per batch</div>
                  <div className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>~90 seconds per CIN</div>
                  <div className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Email notification when done</div>
                  <div className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span>Results downloadable as CSV</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active audit progress */}
        {auditId && (
          <div className="mb-8">
            <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
              {!audit ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <>
                  {/* Progress header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-sm">{audit.file_name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {audit.completed_count + audit.failed_count} / {audit.total_count} processed
                        {audit.failed_count > 0 && <span className="text-red-400 ml-2">· {audit.failed_count} failed</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {audit.status === 'complete' && (
                        <button
                          onClick={() => downloadCSV(audit)}
                          className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors"
                        >
                          ↓ Export CSV
                        </button>
                      )}
                      <button
                        onClick={() => { setAuditId(null); setAudit(null); }}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        New upload
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-6">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-brand rounded-full"
                      animate={{ width: `${audit.progress_percent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Total', value: audit.total_count, color: 'text-white' },
                      { label: 'Complete', value: audit.completed_count, color: 'text-green-400' },
                      { label: 'Failed',   value: audit.failed_count,   color: 'text-red-400' },
                      { label: 'Progress', value: `${audit.progress_percent}%`, color: 'text-brand' },
                    ].map(s => (
                      <div key={s.label} className="bg-white/3 rounded-xl p-3 text-center border border-white/5">
                        <div className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Results table */}
                  {audit.results && audit.results.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-white/5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 bg-black/20">
                            <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">#</th>
                            <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Company</th>
                            <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium font-mono">CIN</th>
                            <th className="text-center px-4 py-3 text-xs text-slate-400 font-medium">VHS</th>
                            <th className="text-center px-4 py-3 text-xs text-slate-400 font-medium">Risk</th>
                            <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {audit.results
                              .slice()
                              .sort((a, b) => a.row_index - b.row_index)
                              .map((r, i) => (
                              <motion.tr
                                key={r.cin}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="border-b border-white/3 hover:bg-white/2 transition-colors"
                              >
                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.row_index + 1}</td>
                                <td className="px-4 py-3 text-white font-medium text-sm">{r.vendor_name || '—'}</td>
                                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{r.cin}</td>
                                <td className="px-4 py-3 text-center">
                                  {r.vhs_score != null ? (
                                    <span className="font-mono font-bold text-sm" style={{ color: vhsColor(r.vhs_score) }}>
                                      {r.vhs_score}
                                    </span>
                                  ) : <span className="text-slate-600">—</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {r.risk_level ? (
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${riskBg(r.risk_level)}`}>
                                      {r.risk_level}
                                    </span>
                                  ) : <span className="text-slate-600">—</span>}
                                </td>
                                <td className="px-4 py-3">
                                  {r.status === 'complete' && <span className="text-xs text-green-400">✓ Done</span>}
                                  {r.status === 'failed'   && <span className="text-xs text-red-400" title={r.error}>✗ Failed</span>}
                                  {r.status === 'processing' && (
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                      Scoring…
                                    </span>
                                  )}
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Past audits */}
        {!auditId && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Recent Batches</h2>
            {pastLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : pastAudits.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm border border-white/5 rounded-2xl">
                No bulk audits yet. Upload your first file above.
              </div>
            ) : (
              <div className="space-y-3">
                {pastAudits.map(a => (
                  <div
                    key={a._id}
                    className="flex items-center gap-4 bg-white/3 border border-white/5 rounded-xl px-5 py-4 hover:border-white/10 transition-colors cursor-pointer"
                    onClick={() => { setAuditId(a._id); setAudit(a); if (a.status === 'processing') startPolling(a._id); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.file_name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {a.total_count} CINs · Started {new Date(a.started_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-mono text-green-400">{a.completed_count}</div>
                        <div className="text-xs text-slate-500">done</div>
                      </div>
                      {a.failed_count > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-mono text-red-400">{a.failed_count}</div>
                          <div className="text-xs text-slate-500">failed</div>
                        </div>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
                        a.status === 'complete'   ? 'bg-green-500/10 text-green-400' :
                        a.status === 'processing' ? 'bg-brand/10 text-brand' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
