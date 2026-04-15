'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RiskBadge, RecommendationBadge } from '@/components/ui/RiskBadge';
import { VHSGauge } from '@/components/ui/VHSGauge';
import { clsx } from 'clsx';

interface Report {
  report_id:      string;
  vendor_name:    string;
  vendor_cin:     string;
  status:         string;
  vhs_score:      number;
  risk_level:     'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: 'APPROVE' | 'APPROVE_WITH_CONDITIONS' | 'INVESTIGATE' | 'REJECT';
  confidence:     number;
  hard_flags:     any[];
  created_at:     string;
  completed_at:   string;
}

interface Props {
  report: Report;
  index?: number;
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending payment', color: 'text-text-muted' },
  collecting: { label: 'Collecting data…', color: 'text-brand' },
  scoring:    { label: 'Scoring…', color: 'text-brand' },
  generating: { label: 'Generating report…', color: 'text-brand' },
  complete:   { label: 'Complete', color: 'text-risk-low' },
  failed:     { label: 'Failed', color: 'text-risk-high' },
};

export function ReportCard({ report, index = 0 }: Props) {
  const isComplete  = report.status === 'complete';
  const isProcessing= ['collecting', 'scoring', 'generating'].includes(report.status);
  const statusStyle = STATUS_STYLES[report.status] || STATUS_STYLES.pending;
  const hasHardFlag = (report.hard_flags?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={isProcessing
          ? `/reports/${report.report_id}/processing`
          : `/reports/${report.report_id}`
        }
        className="block glass-card p-5 hover:border-brand/30 transition-all"
      >
        <div className="flex items-start gap-4">
          {/* Score or icon */}
          <div className="flex-shrink-0">
            {isComplete ? (
              <VHSGauge
                score={report.vhs_score}
                riskLevel={report.risk_level}
                size="sm"
                showLabel={false}
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center">
                {isProcessing ? (
                  <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                ) : (
                  <FileText size={22} className="text-text-muted" />
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-display font-bold text-text-primary text-sm leading-snug truncate">
                {report.vendor_name || 'Unknown Company'}
              </h3>
              {isComplete && (
                <RiskBadge level={report.risk_level} size="xs" />
              )}
            </div>

            <p className="text-xs font-mono text-text-muted mb-2 truncate">{report.vendor_cin}</p>

            {/* Status or recommendation */}
            {isComplete ? (
              <div className="flex flex-wrap items-center gap-2">
                <RecommendationBadge recommendation={report.recommendation} size="sm" />
                {hasHardFlag && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-risk-high/10 text-risk-high text-[9px] font-bold border border-risk-high/20">
                    <AlertTriangle size={9} />
                    {report.hard_flags.length} HARD FLAG{report.hard_flags.length > 1 ? 'S' : ''}
                  </span>
                )}
                <span className="text-[10px] text-text-muted">
                  {report.confidence}% confidence
                </span>
              </div>
            ) : (
              <span className={clsx('text-xs font-medium', statusStyle.color)}>
                {statusStyle.label}
              </span>
            )}
          </div>

          {/* Arrow + time */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <ArrowRight size={14} className="text-text-muted" />
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock size={9} />
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
