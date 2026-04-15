'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download, Share2, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Users, FileText, BarChart3,
  Copy, Check
} from 'lucide-react';
import { VHSGauge } from '@/components/ui/VHSGauge';
import dynamic from 'next/dynamic';
const DirectorGraph = dynamic(() => import('@/components/report/DirectorGraph'), { ssr: false });
import { ScoreBar } from '@/components/ui/ScoreBar';
import { RiskBadge, RecommendationBadge } from '@/components/ui/RiskBadge';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const DIMENSIONS = [
  { key: 'financial',  label: 'Financial Health',   weight: 0.30 },
  { key: 'legal',      label: 'Legal & Compliance', weight: 0.25 },
  { key: 'gst',        label: 'GST Compliance',     weight: 0.20 },
  { key: 'directors',  label: 'Director Quality',   weight: 0.15 },
  { key: 'market',     label: 'Market Sentiment',   weight: 0.10 },
];

interface Props { report: any }

export function ReportViewer({ report }: Props) {
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    const url = `${window.location.origin}/shared/${report.shareable_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Share link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const directors = report.raw_data?.director_data?.directors || [];
  const hardFlags  = report.hard_flags  || [];
  const keyFlags   = report.key_flags   || [];
  const conditions = report.conditions  || [];
  const reasons    = report.recommendation_reasons || [];
  const cases      = report.similar_cases || [];
  const narrative  = report.narrative || '';
  const breakdown  = report.vhs_breakdown || {};
  const generated  = report.completed_at
    ? format(new Date(report.completed_at), 'dd MMM yyyy, hh:mm a')
    : '—';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-slide-up">

      {/* ── Header card ─────────────────────────────────── */}
      <div className="glass-card p-8 text-center relative overflow-hidden">
        {/* Subtle glow bg */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${
              report.risk_level === 'LOW' ? '#16A34A' :
              report.risk_level === 'MEDIUM' ? '#F59E0B' : '#DC2626'
            } 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          {/* Report meta */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs font-mono text-text-muted px-3 py-1 rounded-full border border-surface-border">
              {report.report_id}
            </span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-xs text-text-muted">{generated}</span>
          </div>

          <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
            {report.vendor_name || 'Unknown Company'}
          </h1>
          <p className="font-mono text-sm text-text-muted mb-6">{report.vendor_cin}</p>

          {/* Gauge */}
          <div className="flex justify-center mb-6">
            <VHSGauge
              score={report.vhs_score}
              riskLevel={report.risk_level}
              size="lg"
              showLabel={true}
            />
          </div>

          {/* Recommendation */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <RecommendationBadge recommendation={report.recommendation} size="md" />
            <span className="text-sm text-text-muted">
              {report.confidence}% confidence · {report.raw_data?.sources_available ?? 0}/13 sources
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {report.pdf_url && (
              <a href={report.pdf_url} target="_blank" rel="noopener noreferrer" className="btn-brand flex items-center gap-2 text-sm py-2.5">
                <Download size={15} />
                Download PDF
              </a>
            )}
            <button onClick={copyShareLink} className="btn-ghost flex items-center gap-2 text-sm py-2.5">
              {copied ? <Check size={15} className="text-risk-low" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Share report'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hard Flags ──────────────────────────────────── */}
      {hardFlags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-risk-high/30 bg-risk-high/5 p-5"
        >
          <h2 className="font-display font-bold text-risk-high text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            Hard Disqualifiers — Vendor Rejected
          </h2>
          <div className="space-y-3">
            {hardFlags.map((flag: any, i: number) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-risk-high/10 border border-risk-high/20">
                <span className="text-lg flex-shrink-0">⛔</span>
                <div>
                  <span className="text-xs font-mono font-bold text-risk-high">{flag.code}</span>
                  <p className="text-sm text-text-secondary mt-0.5">{flag.message}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Score Breakdown ──────────────────────────────── */}
      <div className="glass-card p-6">
        <h2 className="font-display font-bold text-text-primary text-base mb-5 flex items-center gap-2">
          <BarChart3 size={18} className="text-brand" />
          Score Breakdown
        </h2>
        <div className="space-y-4">
          {DIMENSIONS.map(dim => (
            <ScoreBar
              key={dim.key}
              label={dim.label}
              score={breakdown[dim.key] ?? 0}
              weight={dim.weight}
              animate={true}
            />
          ))}
        </div>
        {conditions.length > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-risk-medium/10 border border-risk-medium/20">
            <p className="text-xs font-bold uppercase tracking-wider text-risk-medium mb-2">Conditions for Approval</p>
            <ul className="space-y-1.5">
              {conditions.map((c: string, i: number) => (
                <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                  <span className="text-risk-medium mt-0.5">→</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Key Flags ───────────────────────────────────── */}
      {keyFlags.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-risk-medium" />
            Risk Flags ({keyFlags.length})
          </h2>
          <div className="space-y-2">
            {keyFlags.map((flag: any, i: number) => {
              const severity = flag.severity || 'MEDIUM';
              const colors: Record<string, string> = {
                CRITICAL: 'bg-risk-high/10 border-risk-high/20 text-risk-high',
                HIGH:     'bg-risk-high/8 border-risk-high/15 text-[#FCA5A5]',
                MEDIUM:   'bg-risk-medium/10 border-risk-medium/20 text-[#FCD34D]',
                LOW:      'bg-surface-card border-surface-border text-text-muted',
              };
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${colors[severity] || colors.LOW}`}>
                  <span className="text-xs font-bold mt-0.5 opacity-70">{severity}</span>
                  <span>{flag.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Directors ───────────────────────────────────── */}
      {directors.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand" />
            Directors ({directors.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>DIN</th>
                  <th>Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {directors.slice(0, 10).map((d: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium text-text-primary">{d.name || '—'}</td>
                    <td className="font-mono text-xs">{d.din || '—'}</td>
                    <td>{d.designation || '—'}</td>
                    <td>
                      {d.cessation_date
                        ? <span className="text-risk-high text-xs font-semibold">Resigned</span>
                        : <span className="text-risk-low text-xs font-semibold">Active</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI Narrative ────────────────────────────────── */}
      {narrative && (
        <div className="glass-card p-6">
          <h2 className="font-display font-bold text-text-primary text-base mb-4 flex items-center gap-2">
            <FileText size={18} className="text-brand" />
            AI Analysis
          </h2>
          <div className={`text-sm text-text-secondary leading-relaxed space-y-3 overflow-hidden transition-all duration-500 ${narrativeExpanded ? '' : 'max-h-48'}`}>
            {narrative.split('\n\n').filter(Boolean).map((para: string, i: number) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {narrative.length > 500 && (
            <button
              onClick={() => setNarrativeExpanded(v => !v)}
              className="flex items-center gap-1.5 text-brand text-xs font-semibold mt-3 hover:underline"
            >
              {narrativeExpanded ? <><ChevronUp size={13} />Show less</> : <><ChevronDown size={13} />Read full analysis</>}
            </button>
          )}
        </div>
      )}

      {/* ── Similar Cases ───────────────────────────────── */}
      {cases.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-display font-bold text-text-primary text-base mb-4">
            Comparable Cases
          </h2>
          <div className="space-y-4">
            {cases.map((c: any, i: number) => (
              <div key={i} className="border-l-2 border-brand pl-4 py-1">
                <p className="text-sm text-text-secondary mb-1">{c.summary}</p>
                <p className="text-xs text-text-muted"><span className="font-semibold">Outcome:</span> {c.outcome}</p>
                {c.source && <p className="text-[10px] text-text-muted mt-0.5">Source: {c.source}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────── */}
      <div className="text-center px-4 pb-8">
        <p className="text-[10px] text-text-muted leading-relaxed max-w-2xl mx-auto">
          This report is generated by VendorIQ using publicly available data. The VHS score is a proprietary algorithmic assessment and does not constitute legal or financial advice. Report ID: {report.report_id} · Confidential
        </p>
      </div>
    </div>
  );
}
