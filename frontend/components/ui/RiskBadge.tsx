'use client';

import { clsx } from 'clsx';
import { AlertTriangle, CheckCircle2, AlertCircle, Ban } from 'lucide-react';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type Recommendation = 'APPROVE' | 'APPROVE_WITH_CONDITIONS' | 'INVESTIGATE' | 'REJECT';

const RISK_STYLES: Record<RiskLevel, { bg: string; border: string; text: string; dot: string }> = {
  LOW:    { bg: 'rgba(22,163,74,0.1)',  border: 'rgba(22,163,74,0.3)',  text: '#86EFAC', dot: '#16A34A' },
  MEDIUM: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#FCD34D', dot: '#F59E0B' },
  HIGH:   { bg: 'rgba(220,38,38,0.1)',  border: 'rgba(220,38,38,0.3)',  text: '#FCA5A5', dot: '#DC2626' },
};

const REC_STYLES: Record<Recommendation, { bg: string; border: string; text: string; icon: any }> = {
  APPROVE:                  { bg: 'rgba(22,163,74,0.1)',  border: 'rgba(22,163,74,0.3)',  text: '#86EFAC', icon: CheckCircle2 },
  APPROVE_WITH_CONDITIONS:  { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#FCD34D', icon: AlertCircle  },
  INVESTIGATE:              { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#FCD34D', icon: AlertTriangle },
  REJECT:                   { bg: 'rgba(220,38,38,0.1)',  border: 'rgba(220,38,38,0.3)',  text: '#FCA5A5', icon: Ban          },
};

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
}

export function RiskBadge({ level, size = 'sm', showDot = true }: RiskBadgeProps) {
  const style = RISK_STYLES[level] || RISK_STYLES.HIGH;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider',
        size === 'xs' && 'px-2 py-0.5 text-[9px]',
        size === 'sm' && 'px-2.5 py-1 text-[10px]',
        size === 'md' && 'px-3 py-1.5 text-xs',
      )}
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
      )}
      {level} RISK
    </span>
  );
}

interface RecBadgeProps {
  recommendation: Recommendation;
  size?: 'sm' | 'md';
}

export function RecommendationBadge({ recommendation, size = 'sm' }: RecBadgeProps) {
  const style = REC_STYLES[recommendation] || REC_STYLES.INVESTIGATE;
  const Icon  = style.icon;
  const label = recommendation.replace(/_/g, ' ');
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider',
        size === 'sm' && 'px-2.5 py-1 text-[10px]',
        size === 'md' && 'px-3 py-1.5 text-xs',
      )}
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
    >
      <Icon size={size === 'md' ? 13 : 11} className="flex-shrink-0" />
      {label}
    </span>
  );
}
