'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { clsx } from 'clsx';

interface Props {
  label:   string;
  score:   number;  // 0–100
  weight:  number;  // 0–1 e.g. 0.30
  animate?: boolean;
  compact?: boolean;
}

function getColor(score: number) {
  if (score >= 66) return { bar: '#16A34A', text: '#86EFAC', glow: 'rgba(22,163,74,0.5)' };
  if (score >= 41) return { bar: '#F59E0B', text: '#FCD34D', glow: 'rgba(245,158,11,0.5)' };
  return               { bar: '#DC2626', text: '#FCA5A5', glow: 'rgba(220,38,38,0.5)' };
}

export function ScoreBar({ label, score, weight, animate = true, compact = false }: Props) {
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  const color     = getColor(safeScore);
  const ref       = useRef(null);
  const inView    = useInView(ref, { once: true });
  const [width, setWidth] = useState(animate ? 0 : safeScore);

  useEffect(() => {
    if (!animate || !inView) return;
    const duration = 900;
    const start    = Date.now();
    const raf = () => {
      const elapsed = Date.now() - start;
      const pct     = Math.min(1, elapsed / duration);
      const eased   = 1 - Math.pow(1 - pct, 3);
      setWidth(safeScore * eased);
      if (pct < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [animate, inView, safeScore]);

  return (
    <div ref={ref} className={clsx('w-full', compact ? 'space-y-1.5' : 'space-y-2')}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className={clsx('font-semibold text-text-secondary', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span className={clsx('text-text-muted', compact ? 'text-[10px]' : 'text-xs')}>
            {(weight * 100).toFixed(0)}% weight
          </span>
          <span
            className={clsx('font-mono font-bold', compact ? 'text-sm' : 'text-base')}
            style={{ color: color.text }}
          >
            {Math.round(safeScore)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className={clsx('relative w-full bg-surface-border rounded-full overflow-hidden', compact ? 'h-1.5' : 'h-2.5')}>
        <div
          className="h-full rounded-full transition-none"
          style={{
            width:     `${width}%`,
            background: color.bar,
            boxShadow:  `0 0 8px ${color.glow}`,
          }}
        />
      </div>
    </div>
  );
}
