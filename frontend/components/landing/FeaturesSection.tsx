'use client';
import { motion } from 'framer-motion';
import { Shield, FileText, Eye, Zap, Database, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: Database,  title: '13 Data Sources',   desc: 'MCA21, GST Portal, eCourts, NCLT, SEBI, SFIO, RBI, GeM — all in one report.' },
  { icon: Zap,       title: 'AI Narrative',       desc: 'Gemini 1.5 Flash generates a board-ready 800-word risk analysis with similar fraud cases.' },
  { icon: Shield,    title: '6 Hard Disqualifiers', desc: 'Instant VHS = 0 for struck-off companies, disqualified directors, CIRP, SFIO, RBI defaulters, SEBI bans.' },
  { icon: BarChart3, title: 'VHS Score Algorithm', desc: 'Weighted score: Financial 30% · Legal 25% · GST 20% · Directors 15% · Market 10%.' },
  { icon: Eye,       title: 'Vendor Monitoring',   desc: 'Set alerts on any vendor. Get WhatsApp + email when their VHS drops or a hard flag appears.' },
  { icon: FileText,  title: 'Branded PDF Report',  desc: '5-page PDF with score gauge, breakdown, director table, AI narrative and similar fraud cases.' },
];

export function FeaturesSection() {
  return (
    <section className="py-24 max-w-6xl mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
        <h2 className="text-4xl font-display font-bold mb-4">Everything in one report</h2>
        <p className="text-text-muted max-w-xl mx-auto">Built for procurement teams, CAs, and CFOs who need fast, reliable vendor intelligence.</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-6"
          >
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
              <f.icon size={18} className="text-brand" />
            </div>
            <h3 className="font-display font-bold text-base mb-2 text-text-primary">{f.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
