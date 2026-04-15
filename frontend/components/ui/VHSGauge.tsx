'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const RISK_CONFIG = {
  LOW:    { color: '#16A34A', glow: 'rgba(22,163,74,0.4)',   label: 'LOW RISK',    bg: 'rgba(22,163,74,0.08)'   },
  MEDIUM: { color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',  label: 'MEDIUM RISK', bg: 'rgba(245,158,11,0.08)'  },
  HIGH:   { color: '#DC2626', glow: 'rgba(220,38,38,0.4)',   label: 'HIGH RISK',   bg: 'rgba(220,38,38,0.08)'   },
};

interface Props {
  score:      number;        // 0–100
  riskLevel:  'LOW' | 'MEDIUM' | 'HIGH';
  size?:      'sm' | 'md' | 'lg';
  animate?:   boolean;
  showLabel?: boolean;
}

const SIZES = {
  sm: { width: 140, height: 80,  strokeWidth: 10, fontSize: 28, subSize: 9  },
  md: { width: 200, height: 110, strokeWidth: 14, fontSize: 42, subSize: 10 },
  lg: { width: 260, height: 145, strokeWidth: 18, fontSize: 56, subSize: 12 },
};

export function VHSGauge({ score, riskLevel, size = 'md', animate = true, showLabel = true }: Props) {
  const config     = RISK_CONFIG[riskLevel] || RISK_CONFIG.HIGH;
  const dims       = SIZES[size];
  const ref        = useRef(null);
  const inView     = useInView(ref, { once: true, margin: '-50px' });
  const [displayed, setDisplayed] = useState(animate ? 0 : score);
  const [progress,  setProgress]  = useState(animate ? 0 : score);

  // Count-up animation
  useEffect(() => {
    if (!animate || !inView) return;
    const duration = 1400;
    const start    = Date.now();
    const raf = () => {
      const elapsed = Date.now() - start;
      const pct     = Math.min(1, elapsed / duration);
      const eased   = 1 - Math.pow(1 - pct, 3);
      setDisplayed(Math.round(score * eased));
      setProgress(score * eased);
      if (pct < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [animate, inView, score]);

  // SVG arc geometry — 180° semi-circle
  const cx = dims.width / 2;
  const cy = dims.height - 10;
  const r  = cx - dims.strokeWidth;

  // Track arc (full 180°): left → right (bottom baseline)
  const trackD = `M ${dims.strokeWidth} ${cy} A ${r} ${r} 0 0 1 ${dims.width - dims.strokeWidth} ${cy}`;

  // Progress arc
  const arcRad   = (progress / 100) * Math.PI;
  const ex       = cx - r * Math.cos(arcRad);
  const ey       = cy - r * Math.sin(arcRad);
  const largeArc = progress > 50 ? 1 : 0;
  const progressD = `M ${dims.strokeWidth} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dims.width, height: dims.height + 20 }}>
        <svg
          width={dims.width}
          height={dims.height + 10}
          style={{ overflow: 'visible' }}
        >
          {/* Glow filter */}
          <defs>
            <filter id={`glow-${riskLevel}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track */}
          <path
            d={trackD}
            fill="none"
            stroke="rgba(51,65,85,0.8)"
            strokeWidth={dims.strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress */}
          <path
            d={progressD}
            fill="none"
            stroke={config.color}
            strokeWidth={dims.strokeWidth}
            strokeLinecap="round"
            filter={`url(#glow-${riskLevel})`}
            style={{
              filter: `drop-shadow(0 0 8px ${config.glow})`,
              transition: 'd 0.05s linear',
            }}
          />

          {/* Tick marks at 0, 33, 66, 100 */}
          {[0, 33, 66, 100].map(tick => {
            const tickRad = (tick / 100) * Math.PI;
            const tx1 = cx - (r - dims.strokeWidth / 2 - 4) * Math.cos(tickRad);
            const ty1 = cy - (r - dims.strokeWidth / 2 - 4) * Math.sin(tickRad);
            const tx2 = cx - (r + dims.strokeWidth / 2 + 4) * Math.cos(tickRad);
            const ty2 = cy - (r + dims.strokeWidth / 2 + 4) * Math.sin(tickRad);
            return (
              <line
                key={tick}
                x1={tx1} y1={ty1} x2={tx2} y2={ty2}
                stroke="rgba(100,116,139,0.4)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Centre score */}
        <div
          className="absolute flex flex-col items-center"
          style={{ bottom: 4, left: 0, right: 0 }}
        >
          <span
            className="font-mono font-bold leading-none"
            style={{ fontSize: dims.fontSize, color: config.color, textShadow: `0 0 20px ${config.glow}` }}
          >
            {displayed}
          </span>
          <span className="text-text-muted uppercase tracking-widest" style={{ fontSize: dims.subSize }}>
            VHS Score
          </span>
        </div>
      </div>

      {/* Risk label */}
      {showLabel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.3 }}
          className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
          style={{
            background: config.bg,
            color:      config.color,
            border:     `1px solid ${config.color}40`,
            boxShadow:  `0 0 16px ${config.glow}`,
          }}
        >
          {config.label}
        </motion.div>
      )}
    </div>
  );
}
