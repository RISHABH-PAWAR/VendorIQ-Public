# VendorIQ — Frontend Antigravity Prompt Guide
**Version:** 4.0 | **Author:** Rishabh Pawar | **Date:** March 2026
**Changes from v3.1:** Complete page coverage · Auth pages · Shared report · 404/loading/error · Zustand stores · JWT interceptors · Director D3 Graph · Socket.io bulk UI · Page transitions · Sound micro-interactions · Enhanced animation specs throughout · Full mobile specs

---

## ⚡ FRONTEND PHILOSOPHY — READ BEFORE ANY PROMPT

This is not a generic SaaS dashboard. VendorIQ's frontend must feel like a product that costs ₹50,000/month to use — even on the ₹2,000 report page.

**Design Codename:** `OBSIDIAN TERMINAL`
**Aesthetic DNA:** Bloomberg Terminal meets Apple Vision Pro meets Linear.app
**Core Emotion:** Confidence. Control. Clarity.
**What it is NOT:** Generic purple-gradient SaaS. No Inter font. No white backgrounds. No flat cards.

### The 5 Laws of VendorIQ Frontend
```
LAW 1: Every number must feel alive — counters, gauges, sparklines all animate on scroll
LAW 2: Depth always — glass layers, soft shadows, z-axis hierarchy everywhere
LAW 3: Motion has intent — nothing moves for decoration; everything communicates state
LAW 4: Dark by default, dark by design — not just dark mode, dark as the aesthetic soul
LAW 5: Premium details in the 10% — cursor glow, hover shimmer, magnetic buttons, subtle sound
```

### Animation Philosophy
```
Entry animations:  Framer Motion, stagger children 80ms, y:30→0, opacity:0→1
Page transitions:  AnimatePresence, x:20→0 exit, 300ms ease-smooth
Hover states:      CSS transitions 150ms — never Framer Motion (too slow for hover)
Data changes:      GSAP for number/gauge — precision timing control
Scroll reveals:    IntersectionObserver + CSS animation-play-state: running
Heavy animations:  GSAP for VHS gauge (1200ms), count-up (1000ms)
Micro sounds:      Web Audio API — subtle 800Hz click (8ms), success chime (400ms)
```

---

## 🎨 GLOBAL DESIGN TOKENS (globals.css — PASTE EXACT)

```css
/* ─── FONTS ──────────────────────────────────────────────── */
@import url('https://fonts.bunny.net/css?family=cabinet-grotesk:400,500,600,700,800,900&display=swap');
@import url('https://fonts.bunny.net/css?family=satoshi:300,400,500,600,700&display=swap');
@import url('https://fonts.bunny.net/css?family=jetbrains-mono:400,500,600,700&display=swap');
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap');

/* ─── SURFACE SYSTEM ─────────────────────────────────────── */
:root {
  /* Surfaces — deepest → shallowest */
  --surface-void:        #060910;
  --surface-base:        #0B1120;
  --surface-raised:      #111827;
  --surface-overlay:     #1C2333;
  --surface-glass:       rgba(255,255,255,0.04);
  --surface-glass-hover: rgba(255,255,255,0.07);
  --surface-glass-active:rgba(255,255,255,0.10);

  /* Brand */
  --brand-primary:       #1A56DB;
  --brand-light:         #3B82F6;
  --brand-glow:          rgba(26,86,219,0.35);
  --brand-subtle:        rgba(26,86,219,0.12);
  --brand-vivid:         rgba(26,86,219,0.80);

  /* Risk Tricolor System */
  --risk-high:           #EF4444;
  --risk-high-glow:      rgba(239,68,68,0.30);
  --risk-high-bg:        rgba(239,68,68,0.08);
  --risk-high-border:    rgba(239,68,68,0.30);
  --risk-medium:         #F59E0B;
  --risk-medium-glow:    rgba(245,158,11,0.30);
  --risk-medium-bg:      rgba(245,158,11,0.08);
  --risk-medium-border:  rgba(245,158,11,0.30);
  --risk-low:            #10B981;
  --risk-low-glow:       rgba(16,185,129,0.30);
  --risk-low-bg:         rgba(16,185,129,0.08);
  --risk-low-border:     rgba(16,185,129,0.30);

  /* Text */
  --ink-primary:         #F0F4FF;
  --ink-secondary:       #94A3B8;
  --ink-tertiary:        #475569;
  --ink-disabled:        #2D3748;
  --ink-inverse:         #0B1120;

  /* Borders */
  --border-subtle:       rgba(255,255,255,0.06);
  --border-default:      rgba(255,255,255,0.10);
  --border-strong:       rgba(255,255,255,0.18);
  --border-brand:        rgba(26,86,219,0.50);
  --border-brand-strong: rgba(26,86,219,0.80);

  /* Gradients */
  --gradient-brand:      linear-gradient(135deg, #1A56DB 0%, #3B82F6 100%);
  --gradient-brand-vivid:linear-gradient(135deg, #1A56DB 0%, #60A5FA 50%, #1A56DB 100%);
  --gradient-risk-high:  linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  --gradient-risk-medium:linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  --gradient-risk-low:   linear-gradient(135deg, #10B981 0%, #059669 100%);
  --gradient-glass:      linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  --gradient-hero:       radial-gradient(ellipse 80% 60% at 50% -10%, rgba(26,86,219,0.25), transparent);
  --gradient-mesh-1:     radial-gradient(ellipse at 20% 50%, rgba(26,86,219,0.18) 0%, transparent 60%);
  --gradient-mesh-2:     radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.15) 0%, transparent 60%);
  --gradient-mesh-3:     radial-gradient(ellipse at 60% 80%, rgba(16,185,129,0.08) 0%, transparent 60%);
  --gradient-vignette:   radial-gradient(ellipse at center, transparent 40%, rgba(6,9,16,0.8) 100%);

  /* Shadows */
  --shadow-card:         0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3);
  --shadow-elevated:     0 4px 12px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.4);
  --shadow-modal:        0 24px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5);
  --shadow-brand:        0 0 30px rgba(26,86,219,0.4), 0 0 60px rgba(26,86,219,0.15);
  --shadow-brand-sm:     0 0 16px rgba(26,86,219,0.25);
  --shadow-risk-high:    0 0 24px rgba(239,68,68,0.35);
  --shadow-risk-medium:  0 0 24px rgba(245,158,11,0.25);
  --shadow-risk-low:     0 0 24px rgba(16,185,129,0.35);

  /* Blur */
  --blur-sm:             blur(8px);
  --blur-glass:          blur(24px);
  --blur-heavy:          blur(40px);
  --blur-ultra:          blur(80px);

  /* Animation */
  --ease-smooth:         cubic-bezier(0.16, 1, 0.3, 1);
  --ease-bounce:         cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-snap:           cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out-expo:       cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast:            150ms;
  --dur-base:            300ms;
  --dur-slow:            600ms;
  --dur-cinematic:       1200ms;

  /* Typography */
  --font-display: 'Cabinet Grotesk', sans-serif;
  --font-clash:   'Clash Display', sans-serif;
  --font-body:    'Satoshi', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Spacing */
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-xl:   28px;
  --radius-2xl:  40px;
  --radius-pill: 999px;
}

/* ─── BASE STYLES ────────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--surface-void); color: var(--ink-primary); scroll-behavior: smooth; }
body { font-family: var(--font-body); font-size: 16px; line-height: 1.6; overflow-x: hidden; }
::selection { background: var(--brand-subtle); color: var(--brand-light); }
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: var(--surface-base); }
::-webkit-scrollbar-thumb { background: var(--surface-overlay); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--brand-vivid); }

/* ─── GLASS CARD — SIGNATURE EFFECT ─────────────────────── */
.glass-card {
  background: var(--surface-glass);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition:
    background var(--dur-base) var(--ease-smooth),
    border-color var(--dur-base) var(--ease-smooth),
    box-shadow var(--dur-base) var(--ease-smooth),
    transform var(--dur-base) var(--ease-smooth);
}
.glass-card:hover {
  background: var(--surface-glass-hover);
  border-color: var(--border-default);
  box-shadow: var(--shadow-elevated);
}

/* ─── GLASS CARD VARIANTS ────────────────────────────────── */
.glass-card-brand  { border-color: var(--border-brand);  box-shadow: var(--shadow-card), var(--shadow-brand-sm); }
.glass-card-risk-h { border-color: var(--risk-high-border); box-shadow: var(--shadow-card), var(--shadow-risk-high); }
.glass-card-risk-m { border-color: var(--risk-medium-border); box-shadow: var(--shadow-card), var(--shadow-risk-medium); }
.glass-card-risk-l { border-color: var(--risk-low-border); box-shadow: var(--shadow-card), var(--shadow-risk-low); }

/* ─── SHIMMER SKELETON ───────────────────────────────────── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(255,255,255,0.07) 50%,
    rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

/* ─── TEXT GRADIENTS ────────────────────────────────────── */
.text-gradient-brand {
  background: var(--gradient-brand);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.text-gradient-brand-vivid {
  background: var(--gradient-brand-vivid); background-size: 200% 100%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: shimmerText 3s ease-in-out infinite;
}
.text-gradient-risk-high {
  background: linear-gradient(135deg, #EF4444, #F97316);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
@keyframes shimmerText { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

/* ─── CURSOR GLOW ───────────────────────────────────────── */
.cursor-glow { position: relative; overflow: hidden; }
.cursor-glow::before {
  content: ''; position: absolute; width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(26,86,219,0.2) 0%, transparent 70%);
  border-radius: 50%; transform: translate(-50%, -50%);
  pointer-events: none; opacity: 0; transition: opacity 0.3s;
  left: var(--cursor-x, 50%); top: var(--cursor-y, 50%);
}
.cursor-glow:hover::before { opacity: 1; }

/* ─── GRAIN OVERLAY ─────────────────────────────────────── */
.grain-overlay::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}

/* ─── ANIMATED GRADIENT BORDER ──────────────────────────── */
@keyframes borderSpin {
  0%,100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.border-animated {
  background: linear-gradient(var(--surface-base), var(--surface-base)) padding-box,
              linear-gradient(135deg, #1A56DB, #7C3AED, #10B981, #1A56DB) border-box;
  border: 1px solid transparent; background-size: 300% 300%;
  animation: borderSpin 4s ease infinite;
}

/* ─── HOLOGRAPHIC SHIMMER ───────────────────────────────── */
@keyframes holographic {
  0%   { background-position: 0% 50%; filter: hue-rotate(0deg); }
  50%  { background-position: 100% 50%; filter: hue-rotate(15deg); }
  100% { background-position: 0% 50%; filter: hue-rotate(0deg); }
}
.holographic {
  background: linear-gradient(135deg,
    rgba(26,86,219,0.15), rgba(124,58,237,0.15),
    rgba(16,185,129,0.10), rgba(26,86,219,0.15));
  background-size: 300% 300%;
  animation: holographic 6s ease infinite;
}

/* ─── MAGNETIC BUTTON ───────────────────────────────────── */
.btn-magnetic { transition: transform var(--dur-base) var(--ease-bounce); }
.btn-magnetic:hover { transform: scale(1.04) translateY(-2px); }
.btn-magnetic:active { transform: scale(0.97) translateY(0px); }

/* ─── MESH FLOAT ────────────────────────────────────────── */
@keyframes meshFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.05); } }
@keyframes meshFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(0.98); } }
@keyframes meshFloat3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(15px,15px); } }

/* ─── REVEAL ON SCROLL ──────────────────────────────────── */
.reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s var(--ease-smooth), transform 0.7s var(--ease-smooth); }
.reveal.revealed { opacity: 1; transform: translateY(0); }
.reveal-delay-1 { transition-delay: 0.1s; } .reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; } .reveal-delay-4 { transition-delay: 0.4s; }

/* ─── PULSE RING ────────────────────────────────────────── */
@keyframes pulseRing {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
}
.pulse-ring::before {
  content: ''; position: absolute; inset: -6px; border-radius: inherit;
  border: 2px solid currentColor; animation: pulseRing 1.8s ease-out infinite;
}

/* ─── FLOATING BADGE ────────────────────────────────────── */
@keyframes floatBadge { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
.float-badge { animation: floatBadge 4s ease-in-out infinite; }

/* ─── REDUCE MOTION ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 🧩 CORE HOOKS & UTILITIES

### `hooks/useMousePosition.ts`
```ts
import { useEffect } from 'react';
export function useMousePosition() {
  useEffect(() => {
    const move = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);
}
```

### `hooks/useCountUp.ts`
```ts
import { useState, useRef, useEffect } from 'react';
export function useCountUp(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          const t = Math.min(elapsed / duration, 1);
          setCount(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, delay);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, delay]);
  return { count, ref };
}
```

### `hooks/useReportPolling.ts`
```ts
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useReportStore } from '@/store/reportStore';
import api from '@/lib/api';

export function useReportPolling(reportId: string, interval = 3000) {
  const router = useRouter();
  const { setStatus, setReport } = useReportStore();
  
  const poll = useCallback(async () => {
    try {
      const { data } = await api.get(`/reports/${reportId}`);
      const report = data.data;
      setStatus(report.status);
      setReport(report);
      if (report.status === 'complete') {
        setTimeout(() => router.push(`/report/${reportId}`), 800);
        return false; // stop polling
      }
      if (report.status === 'failed') return false;
      return true; // continue polling
    } catch { return true; }
  }, [reportId, router, setStatus, setReport]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const run = async () => {
      const shouldContinue = await poll();
      if (shouldContinue) timer = setTimeout(run, interval);
    };
    run();
    return () => clearTimeout(timer);
  }, [poll, interval]);
}
```

### `hooks/useScrollReveal.ts`
```ts
import { useEffect, useRef } from 'react';
export function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('revealed'); observer.unobserve(el); }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return ref;
}
```

### `hooks/useSound.ts` (Web Audio — subtle UI sounds)
```ts
import { useCallback, useRef } from 'react';
export function useSound() {
  const ctx = useRef<AudioContext | null>(null);
  const getCtx = () => { if (!ctx.current) ctx.current = new AudioContext(); return ctx.current; };

  const playClick = useCallback(() => {
    try {
      const ac = getCtx(); const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 800; o.type = 'sine';
      g.gain.setValueAtTime(0.03, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
      o.start(); o.stop(ac.currentTime + 0.08);
    } catch {}
  }, []);

  const playSuccess = useCallback(() => {
    try {
      const ac = getCtx();
      [440, 554, 659].forEach((freq, i) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.frequency.value = freq; o.type = 'sine';
        const t = ac.currentTime + i * 0.08;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.start(t); o.stop(t + 0.25);
      });
    } catch {}
  }, []);

  const playError = useCallback(() => {
    try {
      const ac = getCtx(); const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 200; o.type = 'sawtooth';
      g.gain.setValueAtTime(0.02, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      o.start(); o.stop(ac.currentTime + 0.15);
    } catch {}
  }, []);

  return { playClick, playSuccess, playError };
}
```

---

## 🗃️ ZUSTAND STORES

### `store/authStore.ts`
```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; name: string; email: string; subscription_tier: 'starter'|'pro'|'enterprise'; reports_used_this_month: number; }
interface AuthStore {
  user: User | null; token: string | null; isAuthenticated: boolean;
  setUser: (user: User) => void; setToken: (token: string) => void; logout: () => void;
}
export const useAuthStore = create<AuthStore>()(persist(
  (set) => ({
    user: null, token: null, isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: true }),
    setToken: (token) => set({ token }),
    logout: () => set({ user: null, token: null, isAuthenticated: false }),
  }),
  { name: 'vendoriq-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
));
```

### `store/reportStore.ts`
```ts
import { create } from 'zustand';

interface ReportStore {
  status: string; report: any | null;
  currentReportId: string | null;
  setStatus: (status: string) => void;
  setReport: (report: any) => void;
  setCurrentReportId: (id: string) => void;
  reset: () => void;
}
export const useReportStore = create<ReportStore>((set) => ({
  status: 'idle', report: null, currentReportId: null,
  setStatus: (status) => set({ status }),
  setReport: (report) => set({ report }),
  setCurrentReportId: (id) => set({ currentReportId: id }),
  reset: () => set({ status: 'idle', report: null, currentReportId: null }),
}));
```

### `store/monitoringStore.ts`
```ts
import { create } from 'zustand';

interface MonitoringStore {
  monitors: any[]; alerts: any[];
  setMonitors: (monitors: any[]) => void;
  addMonitor: (monitor: any) => void;
  removeMonitor: (id: string) => void;
  setAlerts: (alerts: any[]) => void;
}
export const useMonitoringStore = create<MonitoringStore>((set) => ({
  monitors: [], alerts: [],
  setMonitors: (monitors) => set({ monitors }),
  addMonitor: (monitor) => set((s) => ({ monitors: [monitor, ...s.monitors] })),
  removeMonitor: (id) => set((s) => ({ monitors: s.monitors.filter(m => m._id !== id) })),
  setAlerts: (alerts) => set({ alerts }),
}));
```

---

## 🔌 LIB FILES

### `lib/api.ts` — Axios with JWT interceptors
```ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### `lib/auth.ts` — NextAuth config
```ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, credentials);
        return res.data.data ? { ...res.data.data.user, accessToken: res.data.data.token } : null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => { if (user) { token.accessToken = (user as any).accessToken; token.user = user; } return token; },
    session: async ({ session, token }) => { session.accessToken = token.accessToken as string; session.user = token.user as any; return session; },
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
};
```

### `lib/utils.ts`
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatCurrency = (paise: number, compact = false) => {
  const rupees = paise / 100;
  if (compact && rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(0)} Cr`;
  if (compact && rupees >= 100000) return `₹${(rupees / 100000).toFixed(0)} L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rupees);
};

export const formatCIN = (cin: string) => cin?.match(/^([LU])(\d{5})([A-Z]{2})(\d{4})([A-Z]{3})(\d{6})$/)?.slice(1).join('-') ?? cin;

export const getInitials = (name: string) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '??';

export const timeAgo = (date: string | Date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const hashColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#1A56DB','#7C3AED','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899'];
  return colors[Math.abs(hash) % colors.length];
};
```

### `lib/riskStyles.ts`
```ts
export function getRiskStyles(vhs: number) {
  if (vhs >= 66) return {
    color: 'var(--risk-low)', bg: 'var(--risk-low-bg)', border: 'var(--risk-low-border)',
    glow: 'var(--risk-low-glow)', shadow: 'var(--shadow-risk-low)',
    label: 'LOW RISK', recommendation: 'APPROVE', gradient: 'var(--gradient-risk-low)',
    cardClass: 'glass-card-risk-l'
  };
  if (vhs >= 41) return {
    color: 'var(--risk-medium)', bg: 'var(--risk-medium-bg)', border: 'var(--risk-medium-border)',
    glow: 'var(--risk-medium-glow)', shadow: 'var(--shadow-risk-medium)',
    label: 'MEDIUM RISK', recommendation: 'INVESTIGATE', gradient: 'var(--gradient-risk-medium)',
    cardClass: 'glass-card-risk-m'
  };
  return {
    color: 'var(--risk-high)', bg: 'var(--risk-high-bg)', border: 'var(--risk-high-border)',
    glow: 'var(--risk-high-glow)', shadow: 'var(--shadow-risk-high)',
    label: 'HIGH RISK', recommendation: 'REJECT', gradient: 'var(--gradient-risk-high)',
    cardClass: 'glass-card-risk-h'
  };
}
```

---

## 🧩 SHARED COMPONENT REFERENCE (implement alongside prompts)

### `components/ui/GlassCard.tsx`
```tsx
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
type Glow = 'brand' | 'risk-high' | 'risk-medium' | 'risk-low' | 'none';
interface Props extends HTMLMotionProps<'div'> { glow?: Glow; hover?: boolean; lift?: number; }
const glowShadow: Record<Glow, string> = {
  brand: 'var(--shadow-brand)', 'risk-high': 'var(--shadow-risk-high)',
  'risk-medium': 'var(--shadow-risk-medium)', 'risk-low': 'var(--shadow-risk-low)', none: 'none',
};
export function GlassCard({ children, className, glow = 'none', hover = true, lift = 4, ...props }: Props) {
  return (
    <motion.div
      className={cn('glass-card cursor-glow', glow !== 'none' && `glass-card-risk-${glow.replace('risk-','') as any}`, className)}
      whileHover={hover ? { y: -lift, boxShadow: `var(--shadow-elevated), ${glowShadow[glow]}` } : undefined}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={glow !== 'none' ? { boxShadow: `var(--shadow-card), ${glowShadow[glow]}` } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### `components/ui/RiskBadge.tsx`
```tsx
import { cn } from '@/lib/utils';
import { getRiskStyles } from '@/lib/riskStyles';
interface Props { vhs: number; size?: 'xs'|'sm'|'md'|'lg'; pulse?: boolean; className?: string; }
const sizes = { xs:'text-[10px] px-1.5 py-0.5 gap-1', sm:'text-xs px-2.5 py-1 gap-1.5', md:'text-sm px-3 py-1.5 gap-1.5', lg:'text-base px-4 py-2 gap-2' };
export function RiskBadge({ vhs, size = 'md', pulse = true, className }: Props) {
  const s = getRiskStyles(vhs);
  return (
    <span className={cn('inline-flex items-center font-bold rounded-full font-mono tracking-widest', sizes[size], className)}
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}`, boxShadow: `0 0 12px ${s.glow}` }}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', pulse && 'pulse-ring')} style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
}
```

### `components/ui/AnimatedNumber.tsx`
```tsx
import { useCountUp } from '@/hooks/useCountUp';
interface Props { value: number; prefix?: string; suffix?: string; duration?: number; decimals?: number; delay?: number; className?: string; }
export function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1200, decimals = 0, delay = 0, className }: Props) {
  const { count, ref } = useCountUp(value, duration, delay);
  const display = decimals > 0 ? count.toFixed(decimals) : count.toLocaleString('en-IN');
  return (
    <span ref={ref as any} className={className} style={{ fontFamily: 'var(--font-mono)' }}>
      {prefix}{display}{suffix}
    </span>
  );
}
```

### `components/ui/SkeletonCard.tsx`
```tsx
import { cn } from '@/lib/utils';
interface Props { lines?: number; className?: string; header?: boolean; }
export function SkeletonCard({ lines = 3, className, header = true }: Props) {
  return (
    <div className={cn('glass-card p-6 space-y-3', className)}>
      {header && <div className="skeleton h-5 w-1/3 mb-4" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${100 - i * 15}%`, opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}
```

### `components/ui/EmptyState.tsx`
```tsx
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
interface Props { icon: LucideIcon; title: string; description: string; action?: () => void; actionLabel?: string; }
export function EmptyState({ icon: Icon, title, description, action, actionLabel }: Props) {
  return (
    <motion.div className="glass-card flex flex-col items-center justify-center p-16 text-center"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="w-16 h-16 rounded-2xl glass-card-brand flex items-center justify-center mb-6">
        <Icon size={28} style={{ color: 'var(--brand-light)' }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-primary)' }}>{title}</h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--ink-secondary)' }}>{description}</p>
      {action && <button onClick={action} className="btn-magnetic px-6 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: 'var(--gradient-brand)' }}>{actionLabel}</button>}
    </motion.div>
  );
}
```

### `components/ui/ConfidenceMeter.tsx`
```tsx
const SOURCE_NAMES = ['MCA Company','MCA Directors','MCA GST','MCA Charges','PAN','GST Portal','Google News','GDELT','BSE/NSE','eCourts','NCLT','SEBI','SFIO'];
interface Props { sourcesAvailable: number; confidence: number; }
export function ConfidenceMeter({ sourcesAvailable, confidence }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1" title={`${sourcesAvailable}/13 data sources active`}>
        {SOURCE_NAMES.map((name, i) => (
          <div key={name} title={name} className="flex-1 h-2 rounded-full transition-all duration-500"
            style={{ background: i < sourcesAvailable ? 'var(--brand-primary)' : 'var(--surface-raised)', transitionDelay: `${i * 30}ms` }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {sourcesAvailable}/13 sources · {confidence}% confidence
        {sourcesAvailable < 7 && <span style={{ color: 'var(--risk-medium)' }}> · Partial report</span>}
      </p>
    </div>
  );
}
```

### `components/shared/ProtectedRoute.tsx`
```tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

export function ProtectedRoute({ children, requiredTier }: { children: React.ReactNode; requiredTier?: 'pro'|'enterprise' }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?redirect=' + window.location.pathname);
  }, [status, router]);

  if (status === 'loading') return (
    <div className="p-8 grid gap-4">
      {[1,2,3].map(i => <SkeletonCard key={i} lines={3} />)}
    </div>
  );
  if (status === 'unauthenticated') return null;

  if (requiredTier) {
    const tiers = { starter:0, pro:1, enterprise:2 };
    const userTier = (session?.user as any)?.subscription_tier ?? 'starter';
    if ((tiers[userTier] ?? 0) < tiers[requiredTier]) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="glass-card glass-card-brand p-12 text-center max-w-md">
            <div className="text-4xl mb-4">🔒</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, marginBottom:8 }}>
              {requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'} Plan Required
            </h2>
            <p style={{ color:'var(--ink-secondary)', marginBottom:24 }}>
              Upgrade to unlock this feature.
            </p>
            <a href="/billing" className="btn-magnetic inline-block px-8 py-3 rounded-full font-semibold text-white"
              style={{ background:'var(--gradient-brand)' }}>
              Upgrade Now →
            </a>
          </div>
        </div>
      );
    }
  }
  return <>{children}</>;
}
```

---

## 📋 PAGE-BY-PAGE PROMPT SPECIFICATIONS

---

### PROMPT F-0 — App Shell: Layout + TopNav + SideNav + Page Transitions

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Create the complete app shell. IMPLEMENT ALL CODE EXACTLY as specified — no placeholders.

═══ 1. app/layout.tsx ═══

"use client" NOT on this file — it's a Server Component.
Import all 4 fonts via <link> tags with preconnect.
Import globals.css.
Apply class "grain-overlay" to <body>.
Wrap children in:
  <SessionProvider> (next-auth)
  <Providers> (client wrapper below)
  <Toaster position="bottom-right" theme="dark" richColors closeButton />

Providers client wrapper (app/providers.tsx):
  Cursor glow: useMousePosition() hook
  AnimatePresence: wraps {children} with mode="wait"
  PageWrapper: motion.div, key=pathname, initial={opacity:0,x:20}, animate={opacity:1,x:0},
               exit={opacity:0,x:-20}, transition={duration:0.3,ease:[0.16,1,0.3,1]}

═══ 2. components/shared/TopNav.tsx ═══

Fixed top, z-50, full width.
Background: transparent initially → on scroll > 20px: rgba(6,9,16,0.85) + blur(20px)
Border-bottom: none → on scroll: 1px solid var(--border-subtle)
Smooth CSS transition on both (0.3s ease).
Height: 64px desktop, 56px mobile.

LEFT: VendorIQ logo
  SVG spark icon (4 pointed star, brand blue, 20px) + "VendorIQ" Cabinet Grotesk 700 20px
  Link to /

CENTER (hidden mobile <768px):
  Nav links with animated underline:
    "How It Works" | "Pricing" | "API Docs" | "Changelog"
    CSS: ::after pseudo-element, width 0 → 100%, height 2px, brand blue, transition 0.2s
    Gap: 32px

RIGHT:
  Unauthenticated: "Sign In" ghost button + "Check a Vendor →" filled brand button (pill)
  Authenticated: notification bell (with badge if alerts) + user avatar dropdown
    Dropdown (glass-card): Plan tier badge | "Dashboard" | "Reports" | "Settings" | "Sign Out"
    Avatar: initials in colored circle (hashColor from utils.ts)

MOBILE (< 768px):
  Hamburger button (right side)
  Sheet/Drawer component: full-height, 280px, slides in from right
  Contains: all nav links (vertical) + auth CTAs at bottom
  Close on outside tap or X button

═══ 3. components/shared/SideNav.tsx ═══

DESKTOP (≥ 1024px): Fixed left, 240px width, full height, var(--surface-base) bg
TABLET (768–1023px): Hidden by default, slide-in drawer
MOBILE (< 768px): Hidden entirely (bottom tab bar instead — see below)

TOP SECTION: VendorIQ logo + plan tier badge

NAV SECTIONS with group labels (Cabinet Grotesk 11px, --ink-tertiary, uppercase, letter-spacing 1.5px):
  MAIN
    BarChart3  Overview         /dashboard
    FileText   Reports          /reports
    Eye        Monitoring       /monitoring
  ENTERPRISE
    Upload     Bulk Audit       /bulk-audit     [Enterprise lock icon if not enterprise]
    Key        API Keys         /settings#api-keys [Enterprise lock icon]
  ACCOUNT
    CreditCard Billing          /billing
    Settings2  Settings         /settings

Active item (current route):
  Left border: 3px solid var(--brand-primary)
  Background: var(--brand-subtle)
  Text: var(--ink-primary)
  Icon: brand blue

Inactive item:
  Text: var(--ink-tertiary)
  Hover: text var(--ink-secondary) + bg var(--surface-glass)
  Transition: 150ms

COLLAPSE BUTTON (bottom of nav):
  ChevronLeft icon, toggles to 60px icon-only mode
  In collapsed mode: icons only, Tooltip on hover showing label
  Framer Motion: animate width 240 ↔ 60, duration 0.3s

BOTTOM SECTION: User info
  Avatar (40px circle, initials, hashColor) + name + plan badge
  "↑ Upgrade" link if starter tier (brand blue, small)

MOBILE BOTTOM TAB BAR (< 768px, fixed bottom):
  5 tabs: Home(/) | Reports | Monitoring | Dashboard | Profile
  Active: brand blue, inactive: --ink-tertiary
  Safe area padding (env(safe-area-inset-bottom))

═══ 4. App Router file structure (create placeholders) ═══
  app/(dashboard)/layout.tsx — ProtectedRoute wraps children, SideNav + main content
  app/(auth)/layout.tsx — centered, no SideNav
  All pages get loading.tsx and error.tsx siblings

Acceptance: localhost:3000 → grain overlay, cursor glow, TopNav scrolls correctly, AnimatePresence page transition fires
```

---

### PROMPT F-0.5 — loading.tsx + error.tsx Files

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Create Next.js App Router loading and error boundaries for all routes.

1. app/loading.tsx (root):
   Full-screen centered: VendorIQ logo pulsing (scale 1 ↔ 1.05, 1.5s)
   3 horizontal shimmer bars below (skeleton, 200px, 16px, 8px wide)

2. app/error.tsx:
   Full-screen glass-card centered:
   Red XCircle icon (large) + "Something went wrong" + error.message (dim)
   Two buttons: "Try Again" (reset()) + "Go Home" (href="/")
   Add Sentry.captureException(error) call

3. app/(dashboard)/loading.tsx:
   SideNav-aware (240px left margin) skeleton layout:
   Header skeleton (200px wide, 36px tall)
   Grid of 4 SkeletonCard components
   Below: full-width SkeletonCard with 5 lines

4. app/report/[id]/loading.tsx:
   Centered, full-height:
   Blurred VHS gauge placeholder (200px circle, skeleton)
   3 section skeleton cards below

5. app/search/loading.tsx:
   Two-panel layout: left skeleton search, right 3 SkeletonCard rows

All error.tsx files: use 'use client' directive, receive {error, reset} props.
All loading.tsx files: automatically shown by Next.js — no need to manually trigger.

Acceptance: Navigate slowly to /dashboard → skeleton appears then real content
```

---

### PROMPT F-1 — Hero Section + Animated Search

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/page.tsx and components/landing/HeroSection.tsx + LandingSearchBar.tsx.

═══ HERO SECTION ═══

Full viewport height (100svh mobile safe), min-height 700px.
Background: var(--surface-void).

GRADIENT MESH (3 absolutely-positioned divs, pointer-events: none):
  Mesh 1: 600px × 600px blur(120px) blob, rgba(26,86,219,0.18), top-left
          animation: meshFloat1 10s ease-in-out infinite
  Mesh 2: 500px × 500px blur(100px) blob, rgba(124,58,237,0.15), top-right  
          animation: meshFloat2 12s ease-in-out infinite reverse
  Mesh 3: 400px × 400px blur(80px) blob, rgba(16,185,129,0.08), bottom-center
          animation: meshFloat3 8s ease-in-out infinite
  All: z-index 0, position absolute, border-radius 50%

CONTENT (z-index 10, relative, text-center, max-width 900px, mx-auto, pt-32 pb-20):

  Step 1 (animate in, delay 0):
    Pill badge: glass-card, border var(--border-brand), bg var(--brand-subtle)
    "◆ 13 data sources · 85-88% accuracy · ₹2,000/report"
    Font: Satoshi 13px, color var(--brand-light), letter-spacing 0.5px
    float-badge animation class

  Step 2 (animate in, delay 100ms):
    Headline: Clash Display, 88px desktop / 48px tablet / 36px mobile, line-height 1.0
    "Vendor Risk" — color var(--ink-primary)
    "Intelligence." — color var(--ink-primary)
    "In 5 Minutes." — class text-gradient-brand-vivid (animated shimmer)
    Word-by-word entry: each word wraps in a <span>, Framer Motion y:40→0, opacity:0→1, stagger 0.1s

  Step 3 (animate in, delay 300ms):
    Subheadline: Satoshi 400, 20px desktop / 16px mobile, var(--ink-secondary), max-width 580px, mx-auto
    "AI-powered due diligence for Indian companies."
    "MCA · eCourts · SEBI · NCLT · RBI Defaulters — all in one PDF."

  Step 4 (animate in, delay 450ms):
    LandingSearchBar (see below)

  Step 5 (animate in, delay 600ms):
    OR separator: horizontal line + "OR" in center
    CTA button (below OR): "Browse Our Features ↓" ghost, scrolls to features section on click

  Step 6 (animate in, delay 700ms):
    Social proof: 5 greyscale company logo shapes (SVG rectangles 60×20, opacity 0.25)
    Separator text: "Trusted by 500+ procurement teams"

FLOATING MOCK CARD (right side, desktop ≥ 1280px only):
  Position: absolute, right: -80px, top: 50%, transform: translateY(-40%)
  glass-card glass-card-risk-l, width: 300px, padding 24px, rotation: -2deg
  float-badge animation
  Contents:
    "Tata Consultancy Services Ltd." Cabinet Grotesk 14px bold truncated
    CIN: JetBrains Mono 11px --ink-tertiary "L22210MH1995PLC084781"
    VHS gauge (size sm, score=81, animated=false static display)
    RiskBadge vhs=81 size="sm"
    "APPROVE" text in risk-low color, Cabinet Grotesk bold
    Horizontal line
    "Confidence: 13/13 sources" in --ink-tertiary 11px
  Entry: x:80→0, opacity:0→1, delay 800ms, duration 700ms

═══ LANDING SEARCH BAR ═══

Wrapper: max-width 640px, mx-auto, relative

Outer container: glass-card, p-1, border transition on focus-within
  On focus-within: border-color var(--border-brand), box-shadow var(--shadow-brand)
  Transition: 0.2s

Inner row: flex, align-center, gap-2
  Left icon: Search (Lucide 18px, --ink-tertiary) → spins when loading
  Input: flex-1, bg transparent, border none, Cabinet Grotesk 16px, color --ink-primary
         py-3, placeholder --ink-tertiary, outline none
  Clear button (shown when text): X icon, 20px, --ink-tertiary, fade in
  Divider: 1px vertical line, --border-default
  Right: "Enter ↵" pill (hidden on mobile) — dim, 12px

TYPEAHEAD DROPDOWN:
  Absolute, top: calc(100% + 8px), full width, glass-card, overflow hidden, z-50
  Max-height: 320px, overflow-y auto
  
  LOADING (3 skeleton rows):
    Each: flex, gap-3, p-3: circle skeleton(40px) + two line skeletons
  
  RESULTS (each row):
    Padding: 12px 16px, flex, gap-3, align-center
    Hover: bg var(--surface-glass-hover), cursor pointer
    Left: 40px square, border-radius 10px, bg hashColor(cin), white initial letter Cabinet Grotesk bold 18px
    Middle:
      Company name: Cabinet Grotesk 15px bold, --ink-primary, truncate
      CIN: JetBrains Mono 11px, --ink-tertiary, mt-0.5
    Right:
      Status badge: "ACTIVE" → green, "STRUCK_OFF" → red, others → amber
      Satoshi 11px bold pill, matching color system
  
  Keyboard: ArrowUp/Down to highlight (bg var(--surface-glass-active)), Enter to select, Esc close
  
  EMPTY STATE:
    Centered, p-8: Search icon dim + "No companies found for '{query}'" + "Try the full CIN"

On company select:
  Close dropdown, fill input with company_name
  Show inline company card below input (mini CompanyDetailCard)
  "Generate Report — ₹2,000 →" button appears

MOBILE SEARCH (< 640px):
  Full width, p-4 sides
  Tap → expands to fullscreen search modal (Framer Motion height: 0 → 100vh)

Acceptance:
  Mesh gradient animates, hero staggers in
  Search typeahead calls /api/reports/search?q= with 300ms debounce
  Dropdown renders results with correct status colors
  Company select shows mini card + CTA
```

---

### PROMPT F-2 — Stats + Features + Pricing + Competitor + Testimonials + Footer

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build all remaining landing page sections. Each section: reveal class (scroll-triggered fade-up).

═══ StatsSection ═══
Full width, py-24, max-w-6xl mx-auto.
4 columns (2×2 mobile), dividers between cols on desktop.
Each stat card: glass-card, py-10 px-8, text-center, hover lift -6px.

Stats (all AnimatedNumber with useCountUp):
  "₹5,545 Cr" — "India's B2B Risk Market" — sub: "Growing 18% YoY"
  "0" — "Pure-AI Competitors" — sub: "We're the first"
  "85-88%" — "Report Accuracy" — sub: "Validated against known outcomes" (text, not animated)
  "5 Min" — "Average Report Time" — sub: "P50 timing" (text)

Number: JetBrains Mono 56px, text-gradient-brand
Label: Cabinet Grotesk 16px, --ink-primary, mt-2
Sub: Satoshi 13px, --ink-tertiary, mt-1

═══ HowItWorksSection ═══
Section title: "Due Diligence in 3 Steps" Clash Display 48px, text-center
Subtitle: "No contract. No setup. Pay per report."

3 step cards (max-w-5xl, 3-col grid, gap-8):
Step 1: Search → Step 2: Analyze → Step 3: Download

Connecting lines BETWEEN cards (desktop only):
  SVG dashed line: <svg width="100%" height="2"><line strokeDasharray="6,4" stroke="var(--border-brand)" …/></svg>
  On scroll: animate stroke-dashoffset from total → 0 (IntersectionObserver)

Each card: glass-card, p-8
  Number badge: 48px circle, border-animated, Cabinet Grotesk 20px bold, centered
  Icon: 32px Lucide (Search/Cpu/FileDown), brand blue, mt-4 mb-3
  Title: Cabinet Grotesk 20px bold, --ink-primary
  Desc: Satoshi 14px, --ink-secondary, leading-relaxed

═══ FeatureShowcaseSection ═══
Title: "Everything Your Procurement Team Needs"
3 large feature cards, asymmetric grid (60%/40% first row, full-width last):

Card A — "Vendor Health Score™" (glass-card-brand, p-10):
  Left col (60%): Mini VHS gauge (size=md, score=78, animated on scroll) + score breakdown bars (5 animated)
  Right col (40%): Feature bullets:
    "✦ 0–100 composite score from 5 sub-categories"
    "✦ 6 hard disqualifiers trigger instant VHS=0"
    "✦ Sector-adjusted weightings (Pharma, FMCG, etc.)"
  Background: holographic class on entire card (subtle iridescent effect)

Card B — "AI Risk Narrative" (glass-card, p-10, dark surface var(--surface-base)):
  Code editor aesthetic: left 40px column with line numbers (1,2,3...) in --ink-tertiary, border-right --border-subtle
  Main area: Typewriter effect — displays sample narrative typing letter by letter (useEffect, 30ms per char):
    "Based on VendorIQ's analysis of 13 independent data sources, Satyam Computer Services Limited presents a HIGH RISK profile with a VHS score of 12/100..."
  Blinking cursor: 1px blue rect, animation blink 1s step-end infinite
  Bottom: "Powered by Gemini 1.5 Flash" badge in --ink-tertiary

Card C — "Real-Time Monitoring" (glass-card-risk-l, p-10):
  Stacked alert cards sliding in from bottom sequentially (Framer Motion, stagger 2s between each):
    Alert 1: green — "VHS Maintained: 82/100" — 2 min ago
    Alert 2: amber — "VHS Drop: 74 → 51" — 1 hour ago
    Alert 3: red — "CRITICAL: DIN Disqualified" — 3 hours ago
  Each alert: glass-card, flex, Bell icon, company name, change description, time
  Loop: after all 3 shown, fade out and restart after 8s

═══ PricingSection ═══
Title: "Transparent Pricing. No Surprises."
Subtitle: "Start with a single report. Scale as you grow."

Toggle: Monthly / Annual pill switch
  Annual savings: show "Save 20%" badge on toggle
  Spring animation on thumb: Framer Motion layoutId="pricingThumb"

3-column grid + CA Partner row below.

STARTER (glass-card, border-default):
  Label: "PAY-PER-USE" — Satoshi 12px, --ink-tertiary, tracking-widest
  Price: "₹2,000" JetBrains Mono 48px, --ink-primary + "/report" Satoshi 20px --ink-tertiary
  Subtext: "No subscription. Pay only when you need."
  Divider: --border-subtle
  Features (Lucide Check, 14px, risk-low green):
    ✓ VHS Score (0–100)
    ✓ AI Risk Narrative (800 words)
    ✓ Board-ready PDF
    ✓ Shareable report link (90 days)
    ✓ 6 hard-flag disqualifiers
  CTA: ghost button, border var(--border-brand), "Get Started Free →"

PROFESSIONAL (border-animated, scale-[1.04], z-10, shadow-brand):
  "MOST POPULAR" badge: absolute top -12px center, brand gradient pill
  Label: "PROFESSIONAL"
  Price: Monthly "₹9,999" / Annual toggle → "₹7,999" (cross-out ~~₹9,999~~, subtle)
  AnimatePresence for price change (y:10→0, opacity: 0→1)
  Subtext: "50 reports · 20 monitors per month"
  Features: all Starter + "Director network graph" + "Sector risk profile" + "API access (100/mo)" + "WhatsApp + email alerts"
  CTA: filled brand gradient, large pill, "Start 14-Day Free Trial →"

ENTERPRISE (glass-card, border-default):
  Label: "ENTERPRISE"
  Price: "₹34,999" / Annual toggle → "₹27,999" with "Save ₹84,000/yr" badge
  Features: all Pro + "Unlimited reports + monitors" + "Bulk audit (500 vendors)" + "White-label PDF" + "CA Partner API (₹9/report)" + "Priority SLA"
  CTA: ghost, "Contact Sales →"

CA PARTNER BANNER (full-width below grid, glass-card-brand, holographic):
  Left: "CA Firms & CFO Advisors" h3 + "Embed VendorIQ under your brand name."
  Center: "₹69,000 setup · ₹9/report" in JetBrains Mono large
  Right: "Explore CA Partner →" button
  Background: subtle mesh gradient overlay

═══ CompetitorTableSection ═══
Title: "The Only AI-Native Vendor Risk Platform in India"

Sticky-header table (max-w-4xl mx-auto, glass-card overflow-hidden):
  Header: Feature | VendorIQ (brand blue bg) | AuthBridge | Manual/Consultant
  VendorIQ column: slightly glowing (box-shadow var(--shadow-brand-sm))

Rows with alternating subtle background:
  Feature                    VendorIQ          AuthBridge        Manual
  Setup time                 ✅ 5 minutes       ❌ 2-3 weeks      ❌ 3-5 days
  Price per report           ✅ ₹2,000          ❌ ₹8,000+        ❌ ₹10,000+
  AI narrative               ✅ Gemini 1.5      ❌ None           ❌ None
  13 data sources            ✅ All active       ⚠️ Partial        ⚠️ Manual only
  eCourts scraping           ✅ Automated        ❌ No             ✅ Manual
  Director DIN check         ✅ MCA CSV daily    ❌ No             ❌ No
  NCLT/CIRP check            ✅ Realtime         ❌ No             ✅ Manual
  RBI defaulter check        ✅ Quarterly PDF    ❌ No             ✅ Manual
  Monitoring alerts          ✅ WhatsApp + Email ❌ No             ❌ No
  Report in 5 minutes        ✅ Yes             ❌ Hours          ❌ Days

Icons: ✅ green check, ❌ red x, ⚠️ amber warning — Lucide CheckCircle2, XCircle, AlertTriangle

═══ TestimonialsSection ═══
Title: "What Our Clients Say"
Horizontal marquee (auto-scrolling, pause on hover):
  animation: marquee 40s linear infinite
  @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  Duplicate cards (2× for seamless loop)

3 testimonial cards (glass-card, p-6, min-width 340px):
  Card 1: "Caught a supplier with a disqualified DIN that our legal team missed for 2 years."
    — Ritu Sharma, Head of Procurement, TechCorp India · ★★★★★
  Card 2: "The eCourts scraping alone saved us ₹40L in a bad vendor deal."
    — Ajay Mishra, CFO, Manufacturing Co · ★★★★★
  Card 3: "We now run every vendor through VendorIQ before raising a PO. Non-negotiable."
    — CA Priya Kapoor, Partner, PKC & Associates · ★★★★★
  Avatar: initials circle, hashColor, 44px
  Stars: 5 filled stars in amber

═══ FooterSection ═══
Background: var(--surface-base), border-top var(--border-subtle), pt-16 pb-8
4-column grid (2×2 mobile):
  Col 1: Logo + "AI-powered vendor due diligence for Indian businesses." tagline
          Social: LinkedIn + Twitter + GitHub icons (ghost, 32px)
          "Made with ♥ in India 🇮🇳"
  Col 2: Product — How It Works | Pricing | API Docs | Changelog | Status
  Col 3: Company — About | Blog | Careers | Press | Contact
  Col 4: Legal — Privacy Policy | Terms of Service | Refund Policy | Cookie Policy

Divider line + bottom bar:
  "© 2026 VendorIQ Technologies Pvt. Ltd. All rights reserved."
  Right: "Secured by Razorpay" + "ISO 27001 Compliant" badges (placeholder SVG pills)

Acceptance:
  All sections visible and scroll-triggered reveals fire
  Pricing toggle animates price correctly with AnimatePresence
  Marquee loops seamlessly
  Competitor table renders with correct icons
```

---

### PROMPT F-3 — Search Page + CompanyDetailCard + PaymentModal

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build the complete search and payment flow.

═══ app/search/page.tsx ═══
Public page (no auth required). Two-panel layout.

LEFT PANEL (fixed, 420px, desktop only):
  Background: var(--surface-base), border-right: 1px var(--border-subtle)
  Padding: 32px
  
  "Check a Vendor" — Cabinet Grotesk 28px bold, mb-2
  "Search 10 lakh+ Indian companies" — Satoshi 14px, --ink-tertiary, mb-6
  
  Full-width LandingSearchBar (search-page variant: no floating hero card)
  
  Filter pills (horizontal scroll, gap-2, mt-4):
    "All" | "Active" | "MSME" | "Listed" | "Manufacturing" | "IT Services" | "Pharma" | "FMCG"
    Each pill: glass-card, 12px Satoshi, active → brand blue bg + border
  
  Recent searches (if any in localStorage):
    Label: "Recent" — --ink-tertiary 11px uppercase
    List: company name pills with X to remove, click → refills search
  
  Bottom of panel: "Can't find your company?" → MCA search link

RIGHT PANEL (flex-1, scrollable, p-8):
  States:
    IDLE: EmptyState component — Search icon, "Search for a company to get started"
    LOADING: 3 skeleton rows matching CompanyDetailCard height
    RESULTS: results count label + list of CompanyDetailCard
    EMPTY: EmptyState — AlertCircle icon, "No companies found for '{q}'"
    SELECTED: CompanyDetailCard pinned at top (highlighted) + PaymentModal trigger

═══ CompanyDetailCard ═══
glass-card, p-6, hover → y:-3, border-color var(--border-default)
Framer Motion entry: x:-20→0, opacity:0→1, stagger 80ms between cards

LAYOUT:
  ROW 1: flex, align-start, gap-4
    Avatar: 52px square, border-radius 14px, bg hashColor(cin), white initial Cabinet Grotesk 22px
    Middle (flex-1):
      Company name: Cabinet Grotesk 17px bold, --ink-primary, leading-tight
      CIN: JetBrains Mono 12px, --ink-tertiary, mt-1, format with formatCIN()
      Status badge: StatusBadge component, mt-1
    Right: VHS score preview (if cached report exists) — mini gauge
  
  ROW 2: flex, gap-2, flex-wrap, mt-4
    Data pills (glass-card inner, px-3 py-1.5, Satoshi 12px, --ink-secondary):
      Calendar icon + incorporation date
      Building2 icon + company type
      MapPin icon + state
      Briefcase icon + sector (if known from CIN)
  
  ROW 3: flex, justify-between, align-center, mt-4, pt-4, border-top var(--border-subtle)
    Left: "Paid-up: ₹{formatCurrency(capital)}" in --ink-tertiary 13px
    Right: "Generate Report — ₹2,000 →" btn-magnetic, brand gradient, rounded-full, py-2 px-5, 14px

═══ PaymentModal ═══
shadcn Dialog, max-width 480px.
Background: var(--surface-base), border var(--border-default), shadow var(--shadow-modal)
Framer Motion: scale: 0.95→1, opacity: 0→1 on open

HEADER:
  "Generate Vendor Risk Report" — Cabinet Grotesk 22px
  X close button (top right)

COMPANY MINI CARD (glass-card-brand, p-4, mb-6):
  Company name + CIN (mono) + status badge
  Small "Powered by 13 sources" label

WHAT'S INCLUDED (6-item list, gap-3):
  Each: flex, align-start, gap-3
    Icon: colored circle bg (14px), Lucide icon inside (10px white)
    Text: feature name bold + description dim
  
  ✦ (brand) Vendor Health Score — 0–100 composite from 5 sub-scores
  ✦ (brand) AI Risk Narrative — 800-word board-ready analysis
  ✦ (brand) Board-ready PDF — Download & share anytime
  ✦ (amber) 13 Data Sources — MCA, eCourts, SEBI, SFIO, RBI & more
  ✦ (red) Hard Flag Detection — NCLT, Defaulters, DIN, SEBI debarment
  ✦ (green) 90-Day Access — Revisit anytime, shareable link included

PRICE DISPLAY:
  Large price: "₹2,000" JetBrains Mono 40px, --ink-primary
  "One-time · No subscription required" Satoshi 13px, --ink-tertiary
  "via Razorpay" small, with Razorpay logo SVG

PAY BUTTON:
  Full width, py-4, brand gradient, "Pay ₹2,000 & Generate Report"
  Loading state: spinner + "Creating payment order..."
  useSound().playClick() on press
  
  Razorpay flow:
    1. POST /api/payments/create-order { cin }
    2. Load script if needed
    3. new window.Razorpay({ key, amount:200000, currency:"INR", name:"VendorIQ",
         description:`Risk Report — ${company_name}`, order_id, theme:{color:"#1A56DB"},
         handler: async (r) → POST /api/payments/verify → toast.success + redirect /processing/{id},
         modal: { ondismiss: () → toast.error("Payment cancelled") }
       }).open()

FOOTER:
  "🔒 256-bit SSL encryption · Razorpay PCI-DSS compliant"
  Satoshi 11px, --ink-tertiary, text-center

MOBILE: Full-screen bottom sheet (height: 85vh, border-radius top 24px)

Acceptance:
  Search works with real API
  CompanyDetailCard shows real data from Sandbox.co.in
  Razorpay modal opens in TEST mode for ₹2,000 (200000 paise)
  On payment success → /processing/{reportId}
```

---

### PROMPT F-4 — Processing Page (12-Step Animated)

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/processing/[id]/page.tsx + components/processing/ReportLoadingProgress.tsx.
Uses useReportPolling hook from hooks/useReportPolling.ts.

═══ PAGE LAYOUT ═══
Background: var(--surface-void). Full height (100svh). No TopNav/SideNav.
Single centered column (max-width 600px, px-6, py-16).

Play useSound().playSuccess() when status transitions to 'complete'.
Play useSound().playError() when status transitions to 'failed'.

═══ TOP: BLURRED VHS PREVIEW ═══
230px × 230px circle, centered, mb-8.
Processing state: 
  glass-card circle + border-animated class
  Inside: "?" in JetBrains Mono 64px, --ink-tertiary, opacity 0.3
  Outer ring: 4px border, border-brand, animation: spin 20s linear infinite
  Inner ring (smaller): 2px border, rgba(26,86,219,0.2), animation: spin 15s linear infinite reverse
  Pulsing glow: box-shadow animates between var(--shadow-brand) and var(--shadow-brand-sm), 2s ease

Complete state (Framer Motion transition):
  Ring animations stop, border becomes risk-color
  "?" fades out, actual VHS score counts up from 0 (GSAP, 800ms)
  Blur: filter blur(20px) → blur(0) simultaneously
  Glow: switches to risk-level glow color

Status text below circle:
  "Analyzing Vendor Risk" Cabinet Grotesk 22px, --ink-primary
  Dynamic subtitle:
    pending/collecting: "Processing 13 data sources · Usually 3–5 minutes"
    scoring: "Calculating Vendor Health Score..."
    generating: "AI is writing your risk narrative..."
    complete: "Report ready! Redirecting..."
    failed: "Report generation failed"
  Satoshi 14px, --ink-secondary

═══ PROGRESS STEPS (12 steps) ═══
Space between each: 6px. Contain in a scrollable div (max-height: 400px on small screens).

Steps array (exact from MVP_TECH_DOC.md):
  1. Fetching company registry (MCA21)
  2. Verifying director profiles + DINs  
  3. Checking GST compliance history
  4. Reviewing loan + charge register
  5. Checking RBI, SEBI, SFIO blacklists
  6. Scanning eCourts district records
  7. Checking NCLT insolvency portal
  8. Reviewing SEBI enforcement orders
  9. Analyzing media coverage + GDELT
  10. Calculating Vendor Health Score
  11. Running AI risk assessment (Gemini)
  12. Generating board-ready PDF report

Status mapping (from reportWorker.js):
  pending    → currentStep = 0
  collecting → currentStep cycles 1–9 (visual only, +1 every 5s)
  scoring    → currentStep = 9
  generating → currentStep cycles 10–11 (visual only, +1 every 8s)
  complete   → currentStep = 12

Each step row (px-4 py-3, rounded-xl, flex, gap-3, align-center):
  COMPLETED: bg var(--risk-low-bg), border none
    Icon: CheckCircle2 14px, risk-low color
    Text: 13px, risk-low color, line-through (subtle)
  
  ACTIVE: bg var(--brand-subtle), border 1px var(--border-brand), shadow var(--shadow-brand-sm)
    Icon: Loader2 14px, brand blue, animate-spin
    Text: 13px, var(--brand-light), font-medium
    Animated chevron arrow (→) on right, oscillates x: 0 ↔ 4px
  
  PENDING: no bg, no border
    Icon: 6px dot, --ink-disabled
    Text: 13px, --ink-tertiary

Framer Motion initial mount: all steps x:-20→0, opacity:0→1, stagger 0.04s delay.

═══ PROGRESS BAR ═══
Below steps, mt-4:
  Track: full width, 4px height, var(--surface-raised), rounded
  Fill: width = (currentStep/12)*100%, brand gradient, rounded, transition 0.8s ease
  Label: "{currentStep} of 12 complete" right-aligned, 11px JetBrains Mono, --ink-tertiary

═══ ESTIMATED TIME ═══
"Estimated time remaining: ~{N} min" in --ink-tertiary 12px text-center
  steps 0-4: ~4 min | steps 5-8: ~2 min | steps 9-11: ~1 min | step 12: "Finalizing..."

═══ BLURRED REPORT GHOST (desktop only) ═══
Position: fixed bottom-0 left-0 right-0 (below the main column)
Height: 120px, overflow hidden
z-index: -1, pointer-events: none
Blurred/ghosted document shapes: 3 glass-card placeholders side by side
filter: blur(8px), opacity: 0.08
"Preview will be ready soon" centered in --ink-tertiary 11px

═══ ERROR STATE ═══
Replace step list entirely:
  XCircle icon (56px, red, mb-4)
  "Report Generation Failed" Cabinet Grotesk 24px, red
  error_message from API, Satoshi 14px, --ink-secondary
  "⚠ Your payment was not charged. A refund was initiated automatically."
  Two buttons: "Try Again →" (brand) | "Contact Support" (ghost)

Acceptance:
  useReportPolling fires every 3s
  Steps advance in sync with status changes
  VHS reveals on complete with GSAP blur→clear + count-up
  Sound plays on complete/error
  Redirects to /report/{id} after 800ms delay on complete
```

---

### PROMPT F-5 — Report Viewer (/report/[id] and /report/shared/[token])

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build two report pages:
1. app/report/[id]/page.tsx — authenticated, fetches via GET /api/reports/:id
2. app/report/shared/[token]/page.tsx — public, fetches via GET /api/reports/shared/:token
   (no auth, redact payment info, show "View Full Dashboard →" CTA for unauthenticated users)

Both share the same ReportViewer component.

═══ PAGE LAYOUT ═══
No SideNav. Custom minimal header.
Header: height 56px, TopNav-style but simplified: logo left + action buttons right.
Action buttons: "⬇ Download PDF" (filled brand) | "🔗 Share" (ghost) | "← Back" (ghost)

Desktop: sticky TOC left (220px) + report content (flex-1, max-w-4xl, mx-auto)
Mobile: content full-width, floating FAB (Download) bottom-right

TOC (sticky, top: 72px, scrollspy):
  "REPORT CONTENTS" label (11px, --ink-tertiary, tracking-widest, mb-4)
  Links (13px, Satoshi):
    ACTIVE: brand primary color, left border 2px brand, pl-3
    INACTIVE: --ink-tertiary, hover --ink-secondary
  Links: Risk Verdict | Score Breakdown | AI Narrative | Financial Health | GST Compliance | Legal Standing | Director Integrity | Market Reputation | Similar Cases | Data Sources

Scrollspy: IntersectionObserver on each section, updates active TOC link.

═══ SECTION 1: RISK VERDICT (id="risk-verdict") ═══
Full-width banner, NOT a glass-card:
  Background: risk level bg color (risk-{level}-bg at 12%)
  Border-top: 4px solid risk-level color
  Box-shadow: risk-level shadow
  Padding: 40px

LEFT COLUMN:
  Recommendation text: "APPROVE" / "INVESTIGATE" / "REJECT"
    Clash Display 72px, risk color, letter-spacing: -2px
    Framer Motion: x:-40→0, opacity:0→1, duration 0.5s
  "for {vendor_name}" Satoshi 20px, --ink-secondary, mt-2
  CIN: JetBrains Mono 13px, --ink-tertiary, mt-1
  "Report ID: {report_id} · {formatDate(created_at)}" 11px, --ink-tertiary

RIGHT: VHSGauge component (size="xl", animated=true, delay=0.5)
       RiskBadge below gauge (size="lg")

FAR RIGHT (action column):
  "⬇ Download PDF" — btn-magnetic, brand gradient pill
    onClick: window.open(pdf_url, '_blank'), useSound().playClick()
  "🔗 Share Report" — ghost pill
    onClick: navigator.clipboard.writeText(shareableUrl), toast.success("Link copied!")
  "📊 New Report →" — ghost pill, href="/search"

Partial report banner (if raw_data.partial_report = true):
  Amber banner below verdict: "⚠ Partial Report: {13 - sources_available} of 13 sources unavailable. Score may be understated."
  Confidence: ConfidenceMeter component

═══ SECTION 2: SCORE BREAKDOWN (id="score-breakdown") ═══
glass-card, p-8.
"Score Breakdown" Cabinet Grotesk 24px + score out of 100.

5 sub-score bars:
Each row: flex, align-center, gap-4, mb-5
  Label (120px fixed): Satoshi 14px, --ink-secondary
    Sub-label: weight "(30%)" in --ink-tertiary 11px below
  Bar track (flex-1): height 10px, bg var(--surface-raised), border-radius pill, overflow hidden
    Bar fill: width = score%, color = risk color of that score
    CSS transition: width 0 → X% over 1s (scroll-triggered, IntersectionObserver)
    transitionDelay per bar: 0s, 0.1s, 0.2s, 0.3s, 0.4s
  Score (60px right): JetBrains Mono 16px bold, --ink-primary

Bar colors: score ≥ 66 → risk-low | ≥ 41 → risk-medium | < 41 → risk-high
On hover: bar brightens (filter: brightness(1.2))

HARD FLAGS (shown only if hard_flags.length > 0):
  glass-card-risk-h, mt-6, p-6
  "⚠ Critical Flags Detected — VHS Score Overridden to 0" Cabinet Grotesk 16px, risk-high
  Each flag: flex, gap-3: AlertTriangle icon (risk-high) + flag.message (Satoshi 14px)
  "Any single CRITICAL flag forces VHS to 0 regardless of other scores." dim note

═══ SECTION 3: AI NARRATIVE (id="ai-narrative") ═══
glass-card, p-8, overflow hidden.

Header row: "AI Risk Assessment" Cabinet Grotesk 24px + "Gemini 1.5 Flash" badge (pill, brand subtle)
           "Generated in ~{elapsed}s" in --ink-tertiary 12px

NARRATIVE TEXT (Satoshi 16px, --ink-secondary, line-height 1.85):
  Parse narrative into sections by double-newline or known headers.
  Sub-headings (Executive Summary, Financial Health, Legal Standing, GST Compliance, Director Integrity, Market Reputation, Conclusion):
    Cabinet Grotesk 18px, --ink-primary, mt-6 mb-2
  Body: Satoshi 16px, --ink-secondary

KEY FLAGS SIDEBAR (right, 280px, desktop only):
  "Key Risk Flags" label
  Each flag card (glass-card, p-4, mb-3):
    Severity icon + colored bg:
      CRITICAL: red AlertTriangle
      HIGH: amber AlertOctagon
      MEDIUM: blue Info
    flag.message Satoshi 14px, --ink-primary

CONFIDENCE + CONDITIONS (bottom):
  ConfidenceMeter component
  Conditions (if any): "Approval Conditions: ..." in amber box

═══ SECTION 4: FINANCIAL HEALTH (id="financial") ═══
glass-card, p-8.
3×3 grid of data cells:
  Company Status | Incorporation Date | Company Age
  Paid-up Capital | Authorized Capital | Company Type
  Last Annual Return | Balance Sheet Year | ROC Filing Status

Each cell: glass-card inner (bg var(--surface-raised)), p-4
  Label: Satoshi 11px, --ink-tertiary, uppercase, tracking-wide
  Value: Cabinet Grotesk 16px bold, --ink-primary
  Special values: status uses StatusBadge, currency uses formatCurrency()

Charges subsection (if charges_data exists):
  "Active Charges Register" subtitle
  Table: Charge holder | Amount | Date | Status (satisfied/active)
  Active charges: amber border row, Satisfied: green dim

═══ SECTION 5: GST COMPLIANCE (id="gst") ═══
glass-card, p-8.
GSTIN display: JetBrains Mono pill, glass-card-brand.

12-MONTH GRID (horizontal, gap-2):
  Each month: 40px × 40px square, border-radius 8px
    Filed: bg var(--risk-low), opacity 0.8
    Not Filed: bg var(--risk-high), opacity 0.8
    N/A: bg var(--surface-raised)
    Unknown: bg var(--surface-raised) with "?" 
  Month label below (3-letter, 10px, --ink-tertiary)
  Tooltip on hover: "March 2026 — Filed ✓" / "October 2025 — Not Filed ✗"
  Animate in: squares scale: 0→1 with stagger 30ms each (on scroll)

Summary: "{N}/12 filed · {N}% compliance rate" in Satoshi 14px
If GST cancelled: full-width red banner "GST Registration CANCELLED — Score automatically 0"
If GST suspended: amber banner

No GSTIN provided: amber notice "GSTIN not provided. Score estimated from MCA filing history."

═══ SECTION 6: LEGAL STANDING (id="legal") ═══
glass-card, p-8.

COURT CASES (from courts_data):
  Zero cases: "✓ No court cases found in eCourts India" — green check glass-card
  Cases: Accordion component (shadcn Accordion)
    Each case header: case_number + court_name + state + filing_year + status badge
    Expanded body: petitioner | respondent | sections (IPC 420 = red highlight) | next hearing
    Critical sections (IPC 420, cheating, fraud): red background highlight

NCLT STATUS:
  cirp_admitted=true OR local_checks.nclt_active=true:
    RED full card: "⚠ Active NCLT CIRP Proceedings — Company Under Insolvency"
    IP name, admission date, case type
  Clean: Green check card

SEBI + SFIO:
  Active orders: red/amber cards with details
  Clean: green compact cards

═══ SECTION 7: DIRECTOR INTEGRITY (id="directors") ═══
glass-card, p-8.

DIRECTOR TABLE (responsive):
  Desktop: table with columns: Director | DIN | Designation | Appointed | Status | Co's
  Mobile: card per director

Each row:
  Avatar: 36px circle, hashColor(name), initials
  Name: Cabinet Grotesk 14px
  DIN: JetBrains Mono 12px, --ink-tertiary
  Designation: Satoshi 13px, --ink-secondary
  Appointed: date formatted
  Status: "ACTIVE" green / "DISQUALIFIED" red (critical — bold, pulsing dot)
  Companies: count badge; on click → expand modal showing all companies

DISQUALIFIED row: entire row red-tinted bg, border-left 3px risk-high, ⚠ icon before name.

Summary pills (below table):
  "{X} directors with clean record" (green) | "{Y} directors in 5+ companies" (amber) | "{Z} disqualified DINs" (red)

═══ SECTION 8: MARKET REPUTATION (id="market") ═══
glass-card, p-8.

NEWS ARTICLES (from news_rss + news_gdelt combined):
  Deduplicated, sorted by date desc, max 15 shown
  Each article: flex, gap-3, py-3, border-bottom var(--border-subtle)
    Source: 16px favicon placeholder circle + source name (13px)
    Headline: Satoshi 14px, --ink-primary, hover → brand color link
    Date: 11px, --ink-tertiary
    Sentiment pill: based on keyword check (fraud/scam/penalty = red NEGATIVE, default NEUTRAL)

GDELT TONE CHART (if gdelt data):
  Recharts AreaChart, height 120px, minimal axes
  Data: average tone per week over 6 months
  Area: below 0 → red fill, above 0 → green fill, zero baseline
  Tooltip: "Week of {date}: avg tone {n}"
  Title: "Media Sentiment Trend (GDELT, 6 months)"

No news: "No significant coverage found in Indian media databases." neutral note

═══ SECTION 9: SIMILAR CASES (id="similar-cases") ═══
glass-card, p-8.
"Historical Risk Precedents — from 500 Indian Case Studies" title
3 case cards (3-col desktop, 1-col mobile):
  Each: glass-card inner, p-6
    "SIMILAR RISK PROFILE" badge (amber)
    Company type + sector
    outcome: green/red/amber badge
    key_flags summary
    source: "VendorIQ Case Database" dim

═══ SECTION 10: DATA SOURCES (id="data-sources") ═══
glass-card, p-8.
"Data Source Status" title + ConfidenceMeter component

2-column grid (13 source cards):
  Each: glass-card inner, flex, gap-3, p-3
    Icon: colored circle (source category color) + source name (Satoshi 13px)
    Status: ✓ Available (green) / ✗ Unavailable (red dim) / ⚠ Partial (amber)
  Category colors: Paid=blue, Free API=green, Scraper=amber, Local DB=purple

"Last generated: {timestamp}" + "Data valid for 48 hours" in --ink-tertiary 12px

═══ SHARED REPORT PAGE DIFFERENCES ═══
No auth required.
Show "🔗 Shared Report" badge in header.
Hide: API keys, payment info, "Re-run Report" button.
Show at bottom: "Powered by VendorIQ · Generate your own report at vendoriq.in →" CTA banner.
For unauthenticated users: sticky banner top "Sign up free to monitor this vendor →"

Acceptance:
  /report/{id} loads with real report data
  TOC scrollspy updates correctly
  VHS gauge animates on page load (GSAP, delay 0.5s)
  /report/shared/{token} loads without auth
  PDF download opens pre-signed S3 URL
```

---

### PROMPT F-6 — Dashboard Overview

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/(dashboard)/dashboard/page.tsx. Wrap in ProtectedRoute.
Data: GET /api/subscriptions/status + GET /api/reports?limit=10 + GET /api/monitors?active=true

═══ HEADER ═══
"Good morning, {firstName}" — Cabinet Grotesk 32px (time-based greeting)
"{plan} Plan · {reports_used}/{plan_limit} reports used this month" — Satoshi 14px, --ink-tertiary
Right: "Generate New Report →" btn-magnetic, brand gradient

═══ STAT CARDS (4 cards, 4-col grid, 2×2 mobile) ═══
All: glass-card, p-6, hover → y:-4

Card 1 — Reports This Month:
  Value: AnimatedNumber, large JetBrains Mono
  Mini donut chart (SVG, 48px): brand blue arc for used portion
  Usage text: "{used}/{limit} reports"
  Warning (>80%): amber border + amber "X remaining" text

Card 2 — Active Monitors:
  Value: AnimatedNumber
  Eye icon (brand blue, 24px)
  "{used}/{limit} monitors active"

Card 3 — Avg VHS Score (across all reports):
  Colored by average risk level
  Mini VHSGauge (size="sm") showing average
  Trend arrow: ↑ +3 this month (green) or ↓ -5 (red)

Card 4 — Alerts Sent (30d):
  Bell icon (amber if > 0)
  "{count} alerts triggered" 
  Framer Motion: number pops in (scale 0.8→1, bounce ease)

Entry animation: stagger 100ms between cards, y:20→0, opacity:0→1.

═══ ACTIVITY + CHART ROW (2-column, 60/40) ═══
LEFT — Recent Reports (glass-card):
  "Recent Reports" title + "View All →" link top-right
  List of last 8 reports (compact rows):
    Row: avatar 32px + company name (Cabinet Grotesk 14px) + VHS mini (mono 14px, risk colored) + 
         risk badge (xs size) + time ago (11px, --ink-tertiary) + "→" link
    Hover: bg var(--surface-glass-hover), cursor pointer
  Loading: 5 skeleton rows
  Empty: EmptyState — FileText icon, "No reports yet"

RIGHT — VHS Distribution (glass-card):
  "Your Risk Distribution" title
  Recharts BarChart (height: 200px):
    5 bins: 0-20 (red), 20-40 (red dim), 40-60 (amber), 60-80 (green dim), 80-100 (green)
    Bar label: count inside bar or above
    Custom tooltip: "{N} companies scored {range}"
    X axis: "0-20 | 20-40 | 40-60 | 60-80 | 80-100"
    No Y axis lines (clean minimal)

═══ ALERTS FEED (full width glass-card, mt-6) ═══
Title: "Recent Monitoring Alerts" + alert count badge

If alerts exist:
  Alert rows (last 10, gap-2):
    Row: colored left border (risk color) + company name + "VHS {old} → {new}" 
         + change type badge + time ago + "View →" link
    Color: CRITICAL=red, HIGH=amber, MEDIUM=blue

If no monitors set up:
  EmptyState — Eye icon, "Start monitoring vendors for real-time risk alerts"
  CTA: "Add Your First Monitor →" → /monitoring

═══ QUICK ACTIONS (3-col glass cards row) ═══
"Check New Vendor" → /search — Search icon, brand
"Upload Bulk CSV" → /bulk-audit — Upload icon, amber (Enterprise badge if not enterprise)
"Generate API Key" → /settings#api-keys — Key icon, green (Enterprise badge if not enterprise)

═══ PLAN UPGRADE BANNER (shown if >80% usage OR trial expiring) ═══
Amber glass-card, border-animated, p-6, flex justify-between
Left: "You've used {N}/{limit} reports. Upgrade before you run out."
Right: "Upgrade to Enterprise →" brand button

Acceptance:
  All data loads with real API calls
  Stat cards animate in on mount
  VHS distribution chart renders with Recharts
  Upgrade banner shown/hidden based on usage %
```

---

### PROMPT F-7 — Reports List Page

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/(dashboard)/reports/page.tsx.

HEADER: "Reports" + count badge + "New Report +" button (brand, right)

FILTERS BAR (glass-card, sticky top 64px, py-4 px-6, z-40):
  Grid: [search input flex-1] [date range dropdown] [risk pills] [status pills] [sort] [export btn]
  
  Search: glass-card inner input, filter by company name (client-side, debounced 200ms)
  
  Date range: dropdown glass-card: "This Month" | "Last 3 Months" | "All Time" | custom date range
  
  Risk filter pills (multi-select):
    "ALL" (default) | "HIGH" (red) | "MEDIUM" (amber) | "LOW" (green)
    Active: filled background + white text, inactive: glass-card border
  
  Status pills: "All" | "Complete" | "Processing" | "Failed"
  
  Sort dropdown: "Newest First" | "Oldest First" | "Highest Risk" | "Lowest VHS" | "Name A-Z"
  
  Export CSV (Enterprise): button with Download icon, POST /api/reports/export

URL sync: all filters → URL query params (page, risk, status, sort, q) for shareable URLs.

REPORTS TABLE (desktop) / CARD LIST (mobile):

Desktop table (glass-card, overflow-hidden):
  Sticky header row: bg var(--surface-raised), border-bottom var(--border-default)
  Columns: Vendor | CIN | VHS | Risk | Status | Generated | Actions
  
  Each row (py-4 px-6, hover: bg var(--surface-glass-hover), cursor pointer):
    VENDOR: 40px company avatar (initials, hashColor) + name (Cabinet Grotesk 14px) + sector tag (pill, dim)
    CIN: JetBrains Mono 12px, --ink-tertiary
    VHS: JetBrains Mono 16px bold, risk-colored + mini spark bar (8px tall)
    RISK: RiskBadge xs size
    STATUS: StatusBadge with colored dot
    GENERATED: timeAgo() + tooltip with full date
    ACTIONS: "View →" link + "⋯" dropdown:
              Share | Re-run (if <48h) | Delete (confirmation required)
  
  Row click anywhere → /report/{id}
  
  LOADING: 5 skeleton rows (matching column widths)

Mobile card list (gap-3):
  Each card: glass-card, p-5
    Top: company avatar (32px) + name + VHS score (right, JetBrains Mono, risk-colored)
    Middle: CIN (mono 11px) + risk badge
    Bottom: date + "View Report →" (small brand link)

PAGINATION (bottom center):
  "Showing {from}–{to} of {total} reports"
  Prev / [1] [2] [3] ... [N] / Next pills (glass-card active = brand)
  Per-page selector: 10 | 20 | 50

EMPTY STATE: EmptyState — FileText icon, "No reports yet", "Generate Your First Report" CTA

Acceptance:
  Pagination works (GET /api/reports?page=N&limit=20&risk=HIGH...)
  Filters update URL and re-fetch
  Export triggers download for Enterprise users
  Delete shows shadcn AlertDialog confirmation
```

---

### PROMPT F-8 — Vendor Monitoring Page

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/(dashboard)/monitoring/page.tsx. Pro/Enterprise only (show ProtectedRoute requiredTier="pro").

HEADER: "Vendor Monitors" + "{N} active" count badge (green pulsing dot)
Right: "Add Vendor Monitor +" btn-magnetic (brand)

PLAN LIMIT BANNER (if monitors_used >= monitors_limit):
  Amber glass-card: "You're monitoring {N}/{limit} vendors. Upgrade to Enterprise for unlimited."
  "Upgrade →" brand link right

ADD MONITOR MODAL:
  shadcn Dialog, max-w 480px, glass-card style
  "Monitor a Vendor" title
  Step 1: Company search (LandingSearchBar, full-width mode, no floating card)
  Step 2 (appears after selection): Alert configuration
    Mini company card (selected company)
    Alert config:
      "Alert me on WhatsApp" toggle + phone input (shown if on)
      "Alert me via Email" toggle (email pre-filled)
      "Minimum VHS drop to trigger alert" slider (5–30, default 10)
        Show preview: "Alert if VHS drops by more than {N} points"
      "Alert frequency" radio: Immediate | Daily digest | Weekly summary
  Confirm: "Start Monitoring" btn → POST /api/monitors → useMonitoringStore.addMonitor()

MONITORS GRID (3-col desktop, 2-col tablet, 1-col mobile):
  Each VendorMonitorCard: glass-card, p-6, hover → y:-4

  VendorMonitorCard layout:
    TOP ROW: company avatar (52px, hashColor) + name (Cabinet Grotesk 16px bold) + active dot (green pulse)
    
    CIN: JetBrains Mono 12px, --ink-tertiary
    
    VHS SECTION (mt-4, centered):
      VHSGauge size="md" (140px), current VHS score, animated=false (static)
      RiskBadge below, size="sm"
    
    TREND SPARKLINE (if vhs_history available):
      Recharts LineChart, height 40px, no axes, no tooltip
      Line color: risk-level color of last point
      Last 7 data points
      Below: "↑+3 this week" (green) or "↓-8 this week" (red) or "→ stable"
    
    DIVIDER: border var(--border-subtle)
    
    FOOTER ROW:
      Left: "Checked {timeAgo(last_checked)}"
        Icons: 📱 (green if whatsapp active, dim if not) + 📧 (green/dim)
      Right: "⋯" dropdown:
               "View Latest Report" | "Edit Alert Config" | "Stop Monitoring" (danger)
    
    CHANGE DETECTED (if vhs changed since last check):
      Amber border (glass-card-risk-m)
      Banner above footer: "VHS changed: {last_vhs} → {current_vhs}" amber colored

  Framer Motion: stagger 80ms on grid mount, x:-20→0, opacity:0→1
  
  Remove animation: scale → 0.9, opacity → 0, height → 0 (LayoutAnimation)

ALERTS SIDEBAR (right, 300px fixed, desktop ≥ 1440px only; otherwise below grid):
  "Recent Alerts" title
  Scrollable list of last 20 alerts:
    Each: glass-card inner (compact), border-left 3px risk-color
    Company name (13px bold) + "VHS {old} → {new}" + timeAgo
    Click → /report/{latest_report_id_for_this_company}
  Empty: "No alerts in the last 30 days" dim note

GLOBAL SETTINGS CARD (bottom, full-width):
  "Alert Preferences" title
  Default WhatsApp number (input + verify OTP button)
  Default min VHS drop threshold (slider)
  "Apply to all new monitors" note

Acceptance:
  Grid loads monitors from GET /api/monitors
  Add modal → POST /api/monitors → new card appears with addMonitor() in Zustand
  Stop monitoring → DELETE + removeMonitor() → card removes with animation
  Pro/Enterprise gate works
```

---

### PROMPT F-9 — Bulk Audit Page

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/(dashboard)/bulk-audit/page.tsx.

NON-ENTERPRISE GATE (tier !== 'enterprise'):
  Full-page centered (min-h 70vh):
  LockKeyhole icon (64px, brand blue, mb-6)
  "Bulk Vendor Audit" Cabinet Grotesk 32px
  "Upload up to 500 vendor CINs. Get ranked risk reports in under 2 hours."
  Pricing breakdown: "₹2,000/vendor · Minimum 50 vendors · ₹1,00,000 minimum order"
  Features: ✓ Ranked Excel output ✓ All 13 sources ✓ Real-time progress ✓ Instant download
  "Upgrade to Enterprise →" btn-magnetic, brand gradient, large
  "Already Enterprise? Contact support" dim link below

ENTERPRISE VIEW:

UPLOAD ZONE (glass-card, p-8):
  react-dropzone:
    Default: dashed border (2px dashed var(--border-default)), rounded-2xl, p-16, text-center
    Drag active: border-brand, bg var(--brand-subtle), scale 1.01 (Framer Motion)
    
    Upload icon (Cloud, 48px, --ink-tertiary animated float-badge)
    "Drag & drop your CSV file here"
    "or click to select a file" — brand link
    Small print: "Required column: CIN · Max 500 vendors · CSV format only"
    "Download sample CSV template →" dim link
  
  ON FILE SELECT:
    Show file info: filename + row count + "Valid ✓" or error list
    Validation:
      Check CSV has 'CIN' column (papaparse client-side parse first 3 rows)
      Valid CINs count vs invalid CINs count
      Show invalid CIN list (max 5 shown, "and N more" if > 5)
    
    PRICING CALCULATOR (glass-card-brand, p-6, mt-6):
      "{N} vendors detected" Cabinet Grotesk 24px
      "Estimated cost: ₹{N * 2000}" JetBrains Mono 36px, brand colored
      "Estimated completion: ~{Math.ceil(N/10)} minutes" Satoshi 14px
      "Minimum: 50 vendors (₹1,00,000)" note if N < 50
      "Pay ₹{max(N,50) * 2000} & Start Audit →" btn-magnetic (disabled if invalid)
        → Razorpay flow for total amount

ACTIVE AUDIT PANEL (shown while audit in progress — Socket.io live updates):
  Header: "{completed}/{total} vendors processed ({Math.round(completed/total*100)}%)"
  
  Progress bar: brand gradient, animated width, 8px tall, rounded pill
  Estimated time remaining: "~{remaining} minutes"
  
  Live feed (last 5 completions, scroll up as new ones arrive):
    Each row: company name + VHS gauge (mini) + risk badge + "just processed"
    Entry animation: slide in from left, fade in
    Framer Motion AnimatePresence on the list
  
  "Running in background" note — "You can close this tab and come back"
  
  Socket.io implementation:
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL)
    socket.emit('join', auditId)
    socket.on('audit:progress', ({ completed, total, latest }) => { ... })
    socket.on('audit:complete', ({ downloadUrl }) => { ... })
    Cleanup: socket.disconnect() on unmount

  COMPLETE STATE (audit done):
    CheckCircle icon (large, green) + "{total} vendors analyzed"
    "Download Excel Report →" btn-magnetic, brand gradient, links to S3 URL
    Quick stats: X HIGH risk | Y MEDIUM | Z LOW from the batch
    useSound().playSuccess()

PAST AUDITS TABLE (below active audit or upload zone):
  "Previous Audits" title
  Columns: Date | Vendors | Status | Actions
  "Download" button links to Excel S3 URL (if complete)
  Status: Complete (green) | Processing (amber spinner) | Failed (red)
  Empty: dim note "No bulk audits yet"

Acceptance:
  Enterprise lock works
  CSV drag-and-drop works with client-side validation
  Pricing calculator updates with vendor count
  Socket.io progress updates in real time during active audit
  Download button works when audit complete
```

---

### PROMPT F-10 — Auth Pages (Login + Register)

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/(auth)/login/page.tsx and app/(auth)/register/page.tsx.
These are Phase 3 pages but scaffold them now.

SHARED AUTH LAYOUT (app/(auth)/layout.tsx):
  Split screen: left 45% (branding) + right 55% (form)
  No TopNav/SideNav. Background: var(--surface-void).

  LEFT PANEL (hidden mobile):
    Background: gradient mesh (mesh-1 + mesh-2 blobs)
    VendorIQ logo + tagline: "Vendor Risk Intelligence. In 5 Minutes."
    Large VHS gauge mock (size="lg", score=78, animated=true, static=false)
    3 micro testimonial pills at bottom (glass-card, 1 line each):
      "Saved ₹40L in a bad vendor deal" — Ajay M., CFO
      "Caught disqualified DIN our team missed" — Ritu S., Procurement
      "Non-negotiable part of every PO process" — CA Priya K.

  RIGHT PANEL:
    Centered card (max-w 420px, glass-card, p-10)

LOGIN PAGE (/login):
  "Welcome back" — Cabinet Grotesk 28px
  "Sign in to VendorIQ" — Satoshi 14px, --ink-tertiary
  
  Google OAuth button (full-width, glass-card border-default):
    Google G logo SVG + "Continue with Google" — Cabinet Grotesk 15px
    onClick: signIn('google', { callbackUrl: '/dashboard' })
  
  OR divider (horizontal lines + "OR")
  
  Form (React Hook Form + Zod):
    Email input: glass-card style, Mail icon left
    Password input: glass-card style, Lock icon left, Eye toggle right
    "Forgot password?" link (right-aligned, brand color, small)
    "Sign In →" full-width, brand gradient, btn-magnetic
      Loading: spinner + "Signing in..."
      useSound().playClick() on click
  
  Error toast: useSound().playError() + toast.error(error.message)
  Success: useSound().playSuccess() + redirect to callbackUrl or /dashboard
  
  Bottom: "Don't have an account? Sign up →" link

REGISTER PAGE (/register):
  "Create your account" — Cabinet Grotesk 28px
  "Start your first report in 5 minutes" — dim
  
  Google OAuth (same as login)
  OR divider
  
  Form:
    Full name (User icon) + Company name (Building icon)
    Work email (Mail icon) — validate @company domains preferred
    Password (Lock icon, min 8 chars) + Confirm password
    Sector dropdown (8 sectors from ARCHITECTURE.md) — Satoshi
    "I agree to Terms of Service and Privacy Policy" checkbox (required)
    "Create Account →" brand gradient, btn-magnetic
  
  Auto-login after register: setToken() + setUser() + redirect /dashboard
  
  Bottom: "Already have an account? Sign in →"

FORGOT PASSWORD MODAL (shown on "Forgot password?" click):
  shadcn Dialog: email input + "Send Reset Link" button
  POST /api/auth/forgot-password
  Success: "Check your email for a reset link"

Acceptance:
  Google OAuth redirects correctly (placeholder — needs GOOGLE_CLIENT_ID)
  Credentials login works (POST /api/auth/login)
  Register form validates all fields
  After login → /dashboard with ProtectedRoute working
  Auth redirects: unauthenticated → /login?redirect=X → post-login → X
```

---

### PROMPT F-11 — Billing + Settings Pages

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build app/(dashboard)/billing/page.tsx and app/(dashboard)/settings/page.tsx.

═══ BILLING PAGE ═══
ProtectedRoute (all tiers).

CURRENT PLAN CARD (glass-card, p-8, mb-8):
  Plan name: Cabinet Grotesk 32px, --ink-primary
  Status indicator: pulsing green dot + "Active" / "Past Due" (red) / "Cancelled"
  Tier badge: "STARTER" / "PRO" / "ENTERPRISE" (pill, matching risk colors: blue/purple/gold)
  
  For paid plans:
    "Next billing date: {date}" — Satoshi 14px
    "Billing amount: ₹{amount}/month" — JetBrains Mono
    "Cancel subscription" — danger text link, small, triggers confirmation modal

  USAGE METERS (3 horizontal progress bars):
    Reports: {used}/{limit} — color: green <50%, amber 50-80%, red >80%
    Monitors: {used}/{limit} — same coloring
    API Calls: {used}/{limit} — Enterprise only, hidden if not enterprise
  
  Each bar: track (4px, var(--surface-raised)) + fill (transition 1s on mount)

UPGRADE PLAN SECTION (3 mini plan cards):
  Starter → Pro → Enterprise progression
  Current plan: "Current Plan" badge, no CTA
  Other plans: "Upgrade →" CTA that triggers Razorpay subscription
  
  Annual toggle (pill): shows monthly vs annual prices
  AnimatePresence on price change

  Razorpay subscription flow:
    POST /api/subscriptions/create { plan: 'pro', billing: 'monthly' }
    Razorpay Subscription checkout (not order — different API)
    On success: toast.success + refetch subscription status

INVOICE HISTORY (glass-card):
  "Invoice History" title
  Table: Date | Amount | Status | Invoice link
  "Download PDF" links to Razorpay invoice URLs
  Empty: "No invoices yet (you're on the free Starter plan)"

═══ SETTINGS PAGE ═══
Tab layout: Profile | Notifications | API Keys | Security

Tabs component (glass-card tabs bar, horizontal scroll mobile):
  Active tab: bg var(--brand-subtle), border-b 2px brand, text brand
  Inactive: text --ink-tertiary, hover --ink-secondary

PROFILE TAB:
  Avatar circle (80px, initials, hashColor) — "Change photo (coming soon)" dim link below
  Form (React Hook Form):
    Full Name* | Company Name* | Work Email (read-only, verified badge)
    Phone | Designation | Onboarding Sector (dropdown)
  "Save Changes" btn at bottom — PATCH /api/users/me
  toast.success("Profile updated!") + useSound().playSuccess() on save

  PASSWORD CHANGE (separate section, divider above):
    Current Password | New Password | Confirm New Password
    "Update Password" button — POST /api/auth/change-password

  DANGER ZONE (red border-top glass-card, bottom of page):
    "Delete Account" — opens confirmation modal requiring type "DELETE" to confirm
    "This will permanently delete all your reports and data. This cannot be undone."

NOTIFICATIONS TAB:
  WhatsApp section: 
    Phone input + "Send OTP" button → OTP verify input (6-digit)
    "WhatsApp alerts enabled" toggle (shown after verification)
  
  Email: toggle per alert type:
    "VHS score changes" | "Hard flags detected" | "New court cases" | "Monitoring check complete"
    "Weekly summary email" | "Monthly account report"
  
  Digest frequency: radio buttons "Immediate" / "Daily 9am digest" / "Weekly Friday digest"
  
  "Save Preferences" button — PATCH /api/users/me/notifications

API KEYS TAB (Enterprise gate — ProtectedRoute requiredTier="enterprise"):
  Warning banner: glass-card-risk-h, "API keys are shown once only. Store them securely in a password manager."
  
  "Generate New Key" button → modal:
    Label input: "Key name (e.g., Production App)"
    Generate button → POST /api/keys/generate
    Success modal: shows full key (viq_live_xxxxxxxx) in mono input
    "Copy Key" button (copies + useSound().playClick())
    "I've saved this key ✓" button closes modal
  
  KEYS TABLE:
    Columns: Label | Prefix | Created | Last Used | Requests (30d) | Actions
    Prefix: JetBrains Mono (first 12 chars visible, rest masked)
    Actions: "Revoke" (danger, confirmation modal)
    Empty: "No API keys yet"
  
  Rate limits info: "Enterprise: 1,000 requests/hour · API Docs →"

SECURITY TAB:
  Active sessions: list of devices (browser + OS + last seen + "Revoke" button)
  Two-factor authentication: "Coming soon" placeholder
  Login history: last 10 logins (device, IP, time, location)

Acceptance:
  Billing shows correct plan and usage
  Razorpay subscription upgrade works
  Profile saves via API
  API key generation shows key exactly once
  Enterprise gate blocks non-enterprise users on API tab
```

---

### PROMPT F-12 — Director Network Graph (Phase 4)

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.
Reference ARCHITECTURE.md Phase 4 Section 4.3 for data structure.

Build components/report/DirectorNetworkGraph.tsx.
Used inside the Report Viewer's Director section as an expandable panel.

DATA STRUCTURE (from /api/reports/:id → raw_data.director_data):
  {
    directors: [{ name, din, companies: [{ cin, name, status, vhs_score? }] }]
  }
  Transform this into D3 graph data: { nodes, links }

D3 FORCE SIMULATION:
  Import: import * as d3 from 'd3'
  
  Nodes: this company (center) + all other companies directors sit on + each director
  Node types:
    type="main": this company (large circle, brand blue, 30px radius)
    type="company": connected company (medium circle, risk-colored by vhs_score, 20px)
    type="director": director (small circle, purple, 12px, diamond shape via path)
    type="struck_off": struck-off company (red, dashed border, 20px)
  
  Links:
    company → director: solid line, brand subtle
    director → other_company: dashed line, --ink-tertiary opacity 0.3
  
  Force config:
    d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width/2, height/2))
      .force('collision', d3.forceCollide().radius(d => d.r + 10))
  
  SVG (responsive width, height=500px):
    Background: var(--surface-base)
    Border-radius: var(--radius-lg)
    Zoom + pan: d3.zoom().scaleExtent([0.3, 3]) attached to svg

NODE RENDERING:
  Each company node: SVG circle + company name below (truncate 20 chars)
  VHS score inside circle (if available): JetBrains Mono 10px white
  Struck-off: red fill, dashed stroke (stroke-dasharray: 4,3)
  
  Tooltip on hover: glass-card style (position absolute, pointer-events none)
    Company name + CIN + status + VHS score if available + "View VendorIQ Report →" link
  
  Click node: opens company details in right-side panel (slides in from right)

DIRECTOR NODE (diamond shape):
  d3.symbol().type(d3.symbolDiamond).size(200)
  Color: purple (#7C3AED)
  Name below: truncated
  DIN tooltip: "DIN: {din} · {N} companies"

CONTROLS:
  Top-right overlay (glass-card): Zoom In | Zoom Out | Reset | Fullscreen
  Legend bottom-left: ● This Company (blue) | ● Connected (grey) | ◆ Director (purple) | ● Struck-off (red)
  "Expand/Collapse" button (shown in report section header, lazy-loads the graph)

LAZY LOADING:
  Graph is NOT rendered on initial page load
  Show: "View Director Network →" button in Director Integrity section
  On click: graph renders with Framer Motion height: 0 → 500px + D3 simulation starts
  Loading state: skeleton 500px rectangle with "Building director network..." centered

PERFORMANCE:
  Max nodes: 50 (if director_data has more companies, show message + truncate)
  D3 simulation alpha decay: 0.028 (not too fast, not too slow)
  Stop simulation on unmount: simulation.stop()

Acceptance:
  Graph renders with real director data from report
  Zoom/pan works
  Tooltip shows on node hover
  Struck-off companies show in red
  Lazy loads correctly (not rendered until expanded)
  Cleanup on unmount (no memory leaks)
```

---

### PROMPT F-13 — 404 + Error Pages

```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Build the 404 and error pages.

1. app/not-found.tsx:
   Background: var(--surface-void), full height, centered.
   
   Animated: large "404" in Clash Display 180px desktop / 100px mobile
     text-gradient-brand-vivid (shimmer animation)
     float-badge animation (gentle up-down float)
   
   Below: VendorIQ logo (small)
   
   "Page not found" Cabinet Grotesk 28px, --ink-primary, mt-6
   "The vendor risk report you're looking for doesn't exist or has expired."
   Satoshi 16px, --ink-secondary, mt-3, max-w-md centered
   
   "90-day expiry note" (if path contains /report/):
     "Note: VendorIQ reports expire after 90 days. The report may have expired."
     amber glass-card pill
   
   Two buttons (mt-8, gap-4):
     "← Go Home" btn-magnetic, brand gradient
     "Check a New Vendor →" ghost btn
   
   Below buttons (mt-12):
     Mini search bar (LandingSearchBar, compact version)
     "Or search directly:" label above

2. app/error.tsx:
   'use client' directive.
   Full-height centered.
   
   Large AlertOctagon icon (56px, --risk-high, mb-6)
   "Something went wrong" Cabinet Grotesk 28px
   error.message in a glass-card code-style box (JetBrains Mono 12px, --ink-secondary)
   
   If Sentry configured: Sentry.captureException(error)
   
   Buttons:
     "Try Again" (brand, calls reset())
     "Go Home" (ghost, href="/")
     "Report this issue" (dim link, opens Sentry feedback widget or email link)

3. app/(dashboard)/error.tsx:
   Dashboard-aware: shows within the SideNav layout
   Same design but more compact (no full-screen)
   Includes "Your data is safe. This was a display error." reassurance note

Acceptance:
  Navigate to /report/invalid-id → 404 page with mini search bar shows
  Trigger an error → error.tsx shows with Try Again button
```

---

## 🔧 DEBUGGING PROMPTS (FRONTEND)

### When Styles Look Wrong
```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Visual issue in [component/page]:
[describe: element, what it looks like, what it should look like]

Design system checklist:
1. Background must always be var(--surface-void) or --surface-base on cards — never white or grey
2. Cards must use glass-card class — backdrop-filter blur(24px) + rgba(255,255,255,0.04)
3. Font: Cabinet Grotesk (display/headings) | Satoshi (body) | JetBrains Mono (numbers/CINs)
4. Risk colors: EXACT hex only — #EF4444 high | #F59E0B medium | #10B981 low
5. Money format: ₹2,000 (comma separated, rupee symbol, never "Rs." or "INR" in UI)
6. CIN format: use formatCIN() from lib/utils.ts for display
7. Hover animations: CSS only (150ms) for frequent interactions, Framer Motion for entry only

Fix ONLY the visual issue. Do not touch API calls, VHS weights, or price constants.
```

### When D3 Graph Has Issues
```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

D3 DirectorNetworkGraph issue: [describe — nodes overlapping / graph not rendering / memory leak]

D3 checklist:
1. Always cleanup: return () => simulation.stop() in useEffect
2. SVG viewBox must be set: `0 0 ${width} ${height}` with preserveAspectRatio="xMidYMid meet"
3. D3 and React refs: use useRef<SVGSVGElement>(null), access via ref.current only inside useEffect
4. Zoom: use d3.zoom() attached to the root SVG, not to a group
5. Rerender: D3 mutates the DOM directly — don't use React state for node positions
6. Node count: if > 50 nodes, truncate with warning message (performance)
7. Never call simulation.tick() manually — let d3 auto-run with requestAnimationFrame

Fix only the D3 issue — do not modify React component structure outside of the useEffect.
```

### When Razorpay Modal Has Issues
```
Read CONTEXT.md.

Razorpay issue: [describe — modal not opening / showing wrong amount / handler not firing]

Checklist:
1. Script must load before open(): check window.Razorpay exists before calling new window.Razorpay()
2. Amount: ALWAYS 200000 (hardcoded constant REPORT_PRICE_PAISE) — never from state or props
3. Key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID (must have NEXT_PUBLIC_ prefix for browser env)
4. order_id: from POST /api/payments/create-order response — never hardcoded
5. handler fires on success: POST /api/payments/verify with { razorpay_order_id, razorpay_payment_id, razorpay_signature }
6. modal.ondismiss: show toast "Payment cancelled" — DO NOT throw error
7. In Next.js: load script with next/script, strategy="lazyOnload"

Never change REPORT_PRICE_PAISE value (200000). Never read amount from user input or component state.
```

### When Animations Feel Wrong
```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Animation issue: [describe]

Standards:
- Page entry: Framer Motion, 300ms, ease:[0.16,1,0.3,1], y:20→0, opacity:0→1
- Page transition (AnimatePresence): 300ms, x:20→0 enter, x:-20→0 exit
- VHS gauge: GSAP, 1200ms, power2.out (strokeDashoffset)
- Count-up numbers: GSAP or useCountUp, 1000ms, cubic ease-out
- Hover effects: CSS transition 150ms ONLY (never Framer Motion on hover — causes jank)
- Stagger lists: 50–80ms between items max (more = feels slow)
- Skeleton shimmer: CSS animation 1.8s linear infinite (not JS)
- Mesh gradient float: CSS animation 8–12s ease-in-out infinite (not JS)
- Sound: Web Audio API, max gain 0.04 (subtle), max 250ms duration

Fix timing/easing only — do not restructure component or change data logic.
```

### When Socket.io Bulk Audit Doesn't Update
```
Read CONTEXT.md and VENDORIQ_FRONTEND_PROMPT_GUIDE.md.

Socket.io bulk audit progress not updating. Checklist:

1. Connection: io(process.env.NEXT_PUBLIC_SOCKET_URL, { auth: { token: useAuthStore.getState().token } })
2. Join room: socket.emit('join-audit', auditId) — must emit AFTER connect event
3. Events: 'audit:progress' → { completed, total, latest } | 'audit:complete' → { downloadUrl }
4. Cleanup: socket.disconnect() in useEffect return function (prevent duplicate listeners)
5. Error handling: socket.on('error', (err) => toast.error(err.message))
6. If in dev: check NEXT_PUBLIC_SOCKET_URL = http://localhost:4000 (not HTTPS in local dev)
7. CORS: Express must allow socket.io origin: process.env.FRONTEND_URL

Never assume socket is connected — always wait for 'connect' event before emitting.
```

---

## 📅 FRONTEND BUILD SEQUENCE

| Week | Prompt | Milestone |
|------|--------|-----------|
| 4 | F-0, F-0.5 | Shell, tokens, TopNav, SideNav, page transitions, loading/error |
| 5 | F-1 | Hero + animated search (first visual) |
| 5 | F-2 | Full landing page with pricing |
| 6 | F-3 | Search + CompanyDetailCard + Razorpay ₹2,000 |
| 6 | F-4 | Processing page + 12-step loading + polling |
| 6 | F-5 | **Report viewer → first full report rendered** |
| 7 | F-10 | Auth login + register |
| 7 | F-6 | Dashboard overview |
| 7 | F-7 | Reports list with filters |
| 8 | F-8 | Vendor monitoring |
| 8 | F-9 | Bulk audit + Socket.io |
| 9 | F-11 | Billing + Settings (all 4 tabs) |
| 9 | F-13 | 404 + error pages |
| 10 | F-12 | Director Network D3 Graph |

---

## ⚡ COMPLETE COMPONENT & FILE HIERARCHY

```
frontend/
├── app/
│   ├── layout.tsx                    (F-0 — grain, fonts, providers, AnimatePresence)
│   ├── page.tsx                      (F-1, F-2 — landing)
│   ├── not-found.tsx                 (F-13 — 404)
│   ├── error.tsx                     (F-13)
│   ├── loading.tsx                   (F-0.5)
│   ├── providers.tsx                 (F-0 — client wrapper, cursor glow)
│   ├── globals.css                   (F-0 — all design tokens)
│   ├── (auth)/
│   │   ├── layout.tsx                (F-10 — split screen)
│   │   ├── login/page.tsx            (F-10)
│   │   └── register/page.tsx         (F-10)
│   ├── search/
│   │   ├── page.tsx                  (F-3)
│   │   └── loading.tsx               (F-0.5)
│   ├── processing/[id]/
│   │   ├── page.tsx                  (F-4)
│   │   └── loading.tsx               (F-0.5)
│   ├── report/
│   │   ├── [id]/
│   │   │   ├── page.tsx              (F-5 — auth)
│   │   │   └── loading.tsx           (F-0.5)
│   │   └── shared/[token]/
│   │       └── page.tsx              (F-5 — public)
│   └── (dashboard)/
│       ├── layout.tsx                (F-0 — ProtectedRoute + SideNav)
│       ├── error.tsx                 (F-13)
│       ├── loading.tsx               (F-0.5)
│       ├── dashboard/page.tsx        (F-6)
│       ├── reports/page.tsx          (F-7)
│       ├── monitoring/page.tsx       (F-8)
│       ├── bulk-audit/page.tsx       (F-9)
│       ├── billing/page.tsx          (F-11)
│       └── settings/page.tsx         (F-11)
│
├── components/
│   ├── ui/
│   │   ├── GlassCard.tsx             (Core — all prompts reference)
│   │   ├── RiskBadge.tsx             (Core)
│   │   ├── AnimatedNumber.tsx
│   │   ├── SkeletonCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ConfidenceMeter.tsx
│   │   └── StatusBadge.tsx
│   ├── shared/
│   │   ├── TopNav.tsx                (F-0)
│   │   ├── SideNav.tsx               (F-0)
│   │   └── ProtectedRoute.tsx
│   ├── landing/
│   │   ├── HeroSection.tsx           (F-1)
│   │   ├── LandingSearchBar.tsx      (F-1, F-3 reused)
│   │   ├── StatsSection.tsx          (F-2)
│   │   ├── HowItWorksSection.tsx     (F-2)
│   │   ├── FeatureShowcaseSection.tsx(F-2)
│   │   ├── PricingSection.tsx        (F-2)
│   │   ├── CompetitorTable.tsx       (F-2)
│   │   ├── Testimonials.tsx          (F-2)
│   │   └── FooterSection.tsx         (F-2)
│   ├── search/
│   │   ├── CompanyDetailCard.tsx     (F-3)
│   │   └── PaymentModal.tsx          (F-3)
│   ├── processing/
│   │   └── ReportLoadingProgress.tsx (F-4)
│   ├── report/
│   │   ├── VHSGauge.tsx              (FC-2 — GSAP)
│   │   ├── ScoreBreakdownBars.tsx    (F-5)
│   │   ├── NarrativeSection.tsx      (F-5)
│   │   ├── GSTComplianceGrid.tsx     (F-5)
│   │   ├── CourtsAccordion.tsx       (F-5)
│   │   ├── DirectorTable.tsx         (F-5)
│   │   ├── DirectorNetworkGraph.tsx  (F-12 — D3.js)
│   │   ├── DataSourceStatus.tsx      (F-5)
│   │   └── MarketReputation.tsx      (F-5)
│   ├── dashboard/
│   │   ├── StatCard.tsx              (F-6)
│   │   ├── AlertFeed.tsx             (F-6, F-8)
│   │   └── VHSDistributionChart.tsx  (F-6)
│   └── bulk-audit/
│       ├── DropZone.tsx              (F-9)
│       ├── BulkProgress.tsx          (F-9 — Socket.io)
│       └── BulkResults.tsx           (F-9)
│
├── hooks/
│   ├── useCountUp.ts
│   ├── useMousePosition.ts
│   ├── useReportPolling.ts
│   ├── useScrollReveal.ts
│   └── useSound.ts
│
├── store/
│   ├── authStore.ts
│   ├── reportStore.ts
│   └── monitoringStore.ts
│
├── lib/
│   ├── api.ts                        (Axios + JWT interceptors)
│   ├── auth.ts                       (NextAuth config)
│   ├── utils.ts                      (cn, formatCurrency, formatCIN, timeAgo, hashColor)
│   └── riskStyles.ts                 (getRiskStyles)
│
└── types/
    ├── report.ts                     (Report, VHSScore, RawData interfaces)
    ├── user.ts                       (User, Subscription interfaces)
    └── api.ts                        (ApiResponse<T>, ErrorResponse interfaces)
```

---

## 🎯 DESIGN QUALITY SCORECARD (target after implementing all prompts)

| Dimension | Target | Key Details |
|-----------|--------|-------------|
| Visual Aesthetic | 9.5/10 | Glass morphism, mesh gradients, grain overlay, holographic shimmer |
| Animation Quality | 9/10 | GSAP gauge, Framer Motion entries, CSS hovers, sound, Web Audio |
| Component Coverage | 10/10 | All 13 pages, 30+ components, all hooks, all stores |
| Mobile Responsiveness | 9/10 | Bottom tab bar, full-screen search modal, sheet drawers |
| Data Integration | 9.5/10 | All 13 sources displayed, JWT interceptors, Socket.io |
| Accessibility | 7/10 | prefers-reduced-motion, keyboard nav, ARIA labels on gauges |
| Performance | 8.5/10 | Lazy D3, lazy Razorpay script, IntersectionObserver, skeleton loading |
| Premium Details | 9/10 | Cursor glow, sounds, magnetic buttons, holographic cards, scrollspy |

---

*₹2,000/report · 13 sources · Gemini AI · D3 Director Graph · Socket.io · Web Audio*
*Cabinet Grotesk + Satoshi + JetBrains Mono · Dark only · No Inter · Ship it.*

---
*End of VendorIQ Frontend Antigravity Prompt Guide v4.0*
