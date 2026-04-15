'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: 13,    suffix: '',    label: 'Data Sources',     sub: 'MCA · GST · Courts · SFIO · RBI' },
  { value: 5,     suffix: 'min', label: 'Average Delivery', sub: 'From payment to PDF in your inbox' },
  { value: 2000,  suffix: '₹',  label: 'Per Report',       sub: 'No subscription required', prefix: true },
  { value: 99.1,  suffix: '%',   label: 'Uptime SLA',       sub: 'Monitored 24/7' },
];

function Counter({ value, suffix, prefix }: { value: number; suffix: string; prefix?: boolean }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start    = Date.now();
    const raf = () => {
      const elapsed = Date.now() - start;
      const pct     = Math.min(1, elapsed / duration);
      const eased   = 1 - Math.pow(1 - pct, 3);
      setDisplay(+(value * eased).toFixed(value % 1 !== 0 ? 1 : 0));
      if (pct < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref} className="score-number">
      {prefix && suffix}{display}{!prefix && suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="py-20 border-y border-surface-border bg-surface-card/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl lg:text-5xl font-display font-bold text-text-primary mb-2">
                <Counter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <div className="font-semibold text-text-secondary text-sm mb-1">{stat.label}</div>
              <div className="text-xs text-text-muted">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
