'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, Eye, BarChart3,
  Settings, CreditCard, Key, ChevronRight,
  TrendingUp, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  {
    label: 'Overview',
    href:  '/dashboard',
    icon:  LayoutDashboard,
  },
  {
    label: 'Reports',
    href:  '/reports',
    icon:  FileText,
    badge: null,
  },
  {
    label: 'Monitoring',
    href:  '/monitoring',
    icon:  Eye,
    plan:  'pro', // requires pro+
  },
  {
    label: 'Bulk Audit',
    href:  '/bulk-audit',
    icon:  BarChart3,
    plan:  'enterprise',
  },
];

const BOTTOM_ITEMS = [
  { label: 'Billing',  href: '/settings/billing',  icon: CreditCard },
  { label: 'API Keys', href: '/settings/api-keys',  icon: Key,  plan: 'enterprise' },
  { label: 'Settings', href: '/settings',           icon: Settings },
];

export function SideNav() {
  const { user } = useAuthStore();
  const pathname  = usePathname();

  // Don't show sidenav on landing / auth pages
  const isLanding = pathname === '/';
  const isAuth    = pathname.startsWith('/auth');
  if (isLanding || isAuth || !user) return null;

  const tier = user?.subscription_tier || 'starter';

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-64 z-40 border-r border-surface-border bg-surface-dark/95 backdrop-blur-glass">

      {/* ── Nav Items ──────────────────────────────────────── */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive  = pathname === item.href || pathname.startsWith(item.href + '/');
          const isLocked  = item.plan &&
            ((item.plan === 'pro'        && tier === 'starter') ||
             (item.plan === 'enterprise' && tier !== 'enterprise'));

          return (
            <NavItem
              key={item.href}
              {...item}
              isActive={isActive}
              isLocked={isLocked}
              tier={tier}
            />
          );
        })}
      </nav>

      {/* ── Upgrade CTA (starter only) ────────────────────── */}
      {tier === 'starter' && (
        <div className="mx-4 mb-4">
          <Link
            href="/settings/billing"
            className="block p-4 rounded-xl border border-brand/30 bg-brand/5 hover:bg-brand/10 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-brand" />
              <span className="text-xs font-semibold text-brand uppercase tracking-wide">Upgrade Plan</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Unlock monitoring, bulk audits & API access
            </p>
            <div className="flex items-center gap-1 mt-2 text-brand text-xs font-semibold">
              View plans <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      )}

      {/* ── Bottom Items ──────────────────────────────────── */}
      <div className="p-4 pt-0 border-t border-surface-border space-y-1">
        {BOTTOM_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isLocked = item.plan === 'enterprise' && tier !== 'enterprise';
          return (
            <NavItem
              key={item.href}
              {...item}
              isActive={isActive}
              isLocked={isLocked}
              tier={tier}
              small
            />
          );
        })}
      </div>

      {/* ── Plan Badge ────────────────────────────────────── */}
      <div className="p-4 pt-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-card border border-surface-border">
          <div className="w-2 h-2 rounded-full bg-risk-low animate-pulse-slow" />
          <span className="text-xs text-text-muted">
            Plan: <span className="text-text-secondary font-semibold capitalize">{tier}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href, icon: Icon, label, isActive, isLocked, tier, small = false, badge
}: any) {
  if (isLocked) {
    return (
      <div className={clsx(
        'flex items-center gap-3 px-3 rounded-xl opacity-40 cursor-not-allowed',
        small ? 'py-2' : 'py-2.5'
      )}>
        <Icon size={small ? 15 : 17} className="text-text-muted flex-shrink-0" />
        <span className={clsx('font-medium text-text-muted', small ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-1.5 py-0.5 rounded">
          {tier === 'starter' ? 'Pro' : 'Ent'}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 rounded-xl transition-all duration-150',
        small ? 'py-2' : 'py-2.5',
        isActive
          ? 'bg-brand/15 text-brand border border-brand/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
      )}
    >
      <Icon size={small ? 15 : 17} className={clsx('flex-shrink-0', isActive ? 'text-brand' : 'text-text-muted')} />
      <span className={clsx('font-medium', small ? 'text-xs' : 'text-sm')}>{label}</span>
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-brand"
        />
      )}
      {badge && (
        <span className="ml-auto text-[10px] font-bold bg-brand/20 text-brand px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
