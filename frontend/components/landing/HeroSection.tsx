'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Search, ArrowRight, Shield, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { reportApi } from '@/lib/api';

interface Company { cin: string; name: string; status: string; type?: string; state?: string; }

const DEMO_COMPANIES = [
  { cin: 'L17110MH1973PLC019786', name: 'Reliance Industries Limited',    status: 'Active', state: 'Maharashtra' },
  { cin: 'L74899DL1995PLC072745', name: 'IL&FS Financial Services',       status: 'Active', state: 'Delhi' },
  { cin: 'L72200AP1987PLC007750', name: 'Tech Mahindra Limited',           status: 'Active', state: 'Andhra Pradesh' },
];

const TRUST_BADGES = [
  { label: 'MCA Verified',    icon: CheckCircle2, color: 'text-risk-low' },
  { label: 'RBI Checked',     icon: Shield,       color: 'text-brand' },
  { label: 'AI-Powered',      icon: Zap,          color: 'text-risk-medium' },
];

export function HeroSection() {
  const router    = useRouter();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounce  = useRef<NodeJS.Timeout>();

  // Parallax
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 400], [0, -80]);
  const y2 = useTransform(scrollY, [0, 400], [0, -40]);

  // CIN search with debounce
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await reportApi.search(query);
        setResults(res.data.data.companies || []);
      } catch {
        setResults(DEMO_COMPANIES.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.cin.includes(query)
        ));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (company: Company) => {
    router.push(`/search?cin=${company.cin}&name=${encodeURIComponent(company.name)}`);
    setFocused(false);
    setQuery('');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── Background ──────────────────────────────────────── */}
      <div className="absolute inset-0 bg-surface-dark">
        {/* Mesh gradients */}
        <div className="absolute inset-0 bg-mesh-brand" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(to right, rgba(148,163,184,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent opacity-0"
            style={{ animation: 'scanLine 8s linear infinite', top: 0 }}
          />
        </div>
      </div>

      {/* ── Floating decorative elements ─────────────────── */}
      <motion.div style={{ y: y1 }} className="absolute top-24 right-[15%] hidden xl:block pointer-events-none">
        <div className="glass rounded-2xl p-4 w-52 animate-float" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-risk-low rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">VHS Score</span>
          </div>
          <div className="text-4xl font-mono font-bold text-risk-low">87</div>
          <div className="text-xs text-text-muted mt-1">LOW RISK · APPROVE</div>
          <div className="mt-3 h-1.5 bg-surface-border rounded-full overflow-hidden">
            <div className="h-full w-[87%] bg-risk-low rounded-full" style={{ boxShadow: '0 0 8px rgba(22,163,74,0.6)' }} />
          </div>
        </div>
      </motion.div>

      <motion.div style={{ y: y2 }} className="absolute bottom-32 left-[12%] hidden xl:block pointer-events-none">
        <div className="glass rounded-2xl p-4 w-48 animate-float" style={{ animationDelay: '1.5s' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-risk-high rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Alert</span>
          </div>
          <div className="text-xs font-semibold text-risk-high">Hard Flag Detected</div>
          <div className="text-[11px] text-text-muted mt-1">DISQUALIFIED_DIN</div>
          <div className="text-[10px] text-text-muted mt-0.5">Director DIN 00452163</div>
        </div>
      </motion.div>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-24 lg:py-0">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/30 bg-brand/5 text-brand text-sm font-medium mb-8"
        >
          <Zap size={14} />
          AI-Powered · 13 Data Sources · Results in &lt;5 min
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6"
        >
          Know your vendor
          <br />
          <span className="text-gradient-brand">before you sign.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Enter a CIN. Get a complete vendor risk report — VHS score, legal history,
          GST compliance, director check, market signals — in under 5 minutes.
          <span className="text-text-muted"> ₹2,000 per report.</span>
        </motion.p>

        {/* ── Search Box ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          ref={searchRef}
          className="relative max-w-2xl mx-auto mb-8"
        >
          <div className={`
            flex items-center gap-3 px-5 py-4 rounded-2xl
            border transition-all duration-300
            ${focused
              ? 'border-brand bg-surface-card shadow-glow-brand'
              : 'border-surface-border bg-surface-card/70 hover:border-surface-muted'
            }
          `}>
            {loading
              ? <Loader2 size={20} className="text-brand animate-spin flex-shrink-0" />
              : <Search size={20} className="text-text-muted flex-shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Enter company name or CIN (e.g. L17110MH1973PLC019786)"
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted font-mono text-sm outline-none"
            />
            <button
              onClick={() => query && router.push(`/search?q=${encodeURIComponent(query)}`)}
              className="btn-brand flex items-center gap-2 py-2.5 text-sm whitespace-nowrap"
            >
              Search <ArrowRight size={15} />
            </button>
          </div>

          {/* Dropdown results */}
          {focused && (query.length >= 2 || results.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden z-50 border border-surface-border"
            >
              {results.length > 0 ? (
                results.map((company, i) => (
                  <button
                    key={company.cin}
                    onClick={() => handleSelect(company)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover text-left transition-colors border-b border-surface-border/50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand text-xs font-bold">
                        {company.name?.[0] || 'C'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary truncate">{company.name}</div>
                      <div className="text-xs font-mono text-text-muted">{company.cin}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-risk-low/10 text-risk-low border border-risk-low/20">
                        {company.status}
                      </span>
                      <ArrowRight size={14} className="text-text-muted" />
                    </div>
                  </button>
                ))
              ) : query.length >= 2 && !loading ? (
                <div className="px-5 py-4 text-sm text-text-muted text-center">
                  No companies found for "<span className="text-text-secondary">{query}</span>"
                </div>
              ) : null}
            </motion.div>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-muted"
        >
          {TRUST_BADGES.map(badge => (
            <div key={badge.label} className="flex items-center gap-2">
              <badge.icon size={15} className={badge.color} />
              <span>{badge.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-text-muted">13 data sources</span>
            <span className="text-surface-border">·</span>
            <span className="text-text-muted">HMAC-secured</span>
            <span className="text-surface-border">·</span>
            <span className="text-text-muted">₹2,000/report</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
