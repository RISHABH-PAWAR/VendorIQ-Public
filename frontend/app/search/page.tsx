'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Building2, MapPin, Calendar,
  CheckCircle2, Loader2, AlertCircle, ShieldCheck, Zap
} from 'lucide-react';
import { reportApi, paymentApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Company {
  cin: string; name: string; status: string;
  type?: string; state?: string;
}

export default function SearchPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { user }     = useAuthStore();

  const [query,    setQuery]    = useState(params.get('q') || params.get('name') || '');
  const [results,  setResults]  = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [paying,   setPaying]   = useState(false);
  const [focused,  setFocused]  = useState(false);
  const debounce   = useRef<NodeJS.Timeout>();
  const inputRef   = useRef<HTMLInputElement>(null);

  // Pre-select if CIN passed in URL
  useEffect(() => {
    const cin  = params.get('cin');
    const name = params.get('name');
    if (cin && name) setSelected({ cin, name, status: 'Active' });
  }, [params]);

  // Live search
  useEffect(() => {
    if (selected) return;
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await reportApi.search(query);
        setResults(res.data.data.companies || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query, selected]);

  const handleSelect = (company: Company) => {
    setSelected(company);
    setQuery(company.name);
    setFocused(false);
    setResults([]);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleGetReport = async () => {
    if (!selected) return;
    if (!user) { router.push(`/auth/login?redirect=/search?cin=${selected.cin}&name=${encodeURIComponent(selected.name)}`); return; }

    setPaying(true);
    try {
      const res   = await paymentApi.createOrder(selected.cin, selected.name);
      const order = res.data.data;

      // Load Razorpay SDK
      await loadRazorpay();

      const rzp = new (window as any).Razorpay({
        key:         order.key_id,
        order_id:    order.order_id,
        amount:      order.amount,
        currency:    'INR',
        name:        'VendorIQ',
        description: `Vendor Risk Report — ${selected.name}`,
        image:       '/logo.png',
        prefill:     { email: user.email, name: user.name },
        theme:       { color: '#1A56DB', backdrop_color: '#0F172A' },
        handler: () => {
          toast.success('Payment received! Generating your report…');
          router.push(`/reports/${order.report_id}/processing`);
        },
        modal: {
          ondismiss: () => { setPaying(false); toast.error('Payment cancelled'); },
        },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create order');
      setPaying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Search Company</h1>
        <p className="text-text-muted text-sm">Enter a company name or 21-digit CIN to get started</p>
      </motion.div>

      {/* Search box */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative mb-6">
        <div className={`flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all duration-200 ${
          focused ? 'border-brand shadow-glow-brand bg-surface-card' : 'border-surface-border bg-surface-card hover:border-surface-muted'
        }`}>
          {loading
            ? <Loader2 size={18} className="text-brand animate-spin flex-shrink-0" />
            : <Search size={18} className="text-text-muted flex-shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); if (selected) setSelected(null); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="e.g. Reliance Industries or L17110MH1973PLC019786"
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted font-mono text-sm outline-none"
            autoFocus
          />
          {selected && (
            <button onClick={handleClear} className="text-text-muted hover:text-text-primary text-xs px-2">✕</button>
          )}
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {focused && results.length > 0 && !selected && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden z-50 border border-surface-border shadow-glass"
            >
              {results.map((company) => (
                <button
                  key={company.cin}
                  onMouseDown={() => handleSelect(company)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-hover text-left transition-colors border-b border-surface-border/40 last:border-0"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0 font-bold text-brand text-sm">
                    {company.name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{company.name}</div>
                    <div className="text-xs font-mono text-text-muted">{company.cin} {company.state && `· ${company.state}`}</div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-risk-low/10 text-risk-low border border-risk-low/20 flex-shrink-0">
                    {company.status}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Selected company card */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass-card p-6 mb-6"
          >
            {/* Company header */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0 font-display font-bold text-brand text-lg">
                {selected.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-text-primary text-lg leading-snug">{selected.name}</h2>
                <p className="font-mono text-xs text-text-muted mt-0.5">{selected.cin}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-risk-low/10 text-risk-low text-[10px] font-bold border border-risk-low/20 flex-shrink-0">
                {selected.status}
              </span>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {selected.state && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <MapPin size={13} className="text-brand" />
                  {selected.state}
                </div>
              )}
              {selected.type && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Building2 size={13} className="text-brand" />
                  {selected.type}
                </div>
              )}
            </div>

            {/* What's included */}
            <div className="rounded-xl bg-surface-dark/60 border border-surface-border p-4 mb-5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">What's included in your report</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  'MCA company details', 'Director & DIN check',
                  'GST filing history', 'Legal court cases',
                  'NCLT insolvency check', 'SEBI enforcement orders',
                  'SFIO & RBI watchlists', 'AI risk narrative',
                  'Similar fraud cases', 'PDF download',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckCircle2 size={11} className="text-risk-low flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing + CTA */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold text-text-primary">₹2,000</span>
                  <span className="text-text-muted text-sm">one-time</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">Delivered in under 5 minutes</p>
              </div>
              <button
                onClick={handleGetReport}
                disabled={paying}
                className="btn-brand flex items-center gap-2 text-sm py-3 px-6"
              >
                {paying
                  ? <><Loader2 size={15} className="animate-spin" />Processing…</>
                  : <><Zap size={15} />Get Report — ₹2,000</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!selected && query.length < 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-16 text-text-muted">
          <ShieldCheck size={40} className="mx-auto mb-4 text-surface-border" />
          <p className="text-sm">Type at least 2 characters to search</p>
          <p className="text-xs mt-1 font-mono">e.g. "Tata" or "U72200MH2010PTC123456"</p>
        </motion.div>
      )}

      {/* Razorpay SDK script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}

function loadRazorpay(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) return resolve();
    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload   = () => resolve();
    document.body.appendChild(script);
  });
}
