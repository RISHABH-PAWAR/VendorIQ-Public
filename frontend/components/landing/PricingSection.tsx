'use client';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  {
    name: 'Starter', price: '₹2,000', period: '/report',
    desc: 'Pay-per-use — no commitment',
    features: ['Single vendor report', 'Full PDF download', '90-day report history', 'All 13 data sources'],
    cta: 'Get a report', ctaHref: '/search', highlight: false,
  },
  {
    name: 'Professional', price: '₹9,999', period: '/month',
    desc: '50 reports + 20 vendor monitors',
    features: ['50 reports/month', '20 vendor monitors', 'Email + WhatsApp alerts', 'Priority support', 'Bulk CSV export'],
    cta: 'Start free trial', ctaHref: '/auth/register', highlight: true,
  },
  {
    name: 'Enterprise', price: '₹34,999', period: '/month',
    desc: 'Unlimited everything + API',
    features: ['Unlimited reports', 'Unlimited monitors', 'CA Partner API access', 'White-label PDFs', 'Dedicated support'],
    cta: 'Contact sales', ctaHref: 'mailto:sales@vendoriq.in', highlight: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 bg-surface-card/20 border-y border-surface-border">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Simple pricing</h2>
          <p className="text-text-muted">No surprises. Pay-per-use or subscribe for better rates.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative glass-card p-6 flex flex-col ${plan.highlight ? 'border-brand/50 shadow-glow-brand' : ''}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand text-white text-xs font-bold tracking-wide flex items-center gap-1">
                  <Zap size={10} /> Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-display font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-mono font-bold text-text-primary">{plan.price}</span>
                  <span className="text-text-muted text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-text-muted">{plan.desc}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <Check size={14} className="text-risk-low flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={plan.highlight ? 'btn-brand text-center text-sm' : 'btn-ghost text-center text-sm'}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
