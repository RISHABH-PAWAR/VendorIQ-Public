'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, LogOut, Settings, User, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

export function TopNav() {
  const { user, logout } = useAuthStore();
  const pathname         = usePathname();
  const router           = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isLanding = pathname === '/';

  return (
    <header className={clsx(
      'fixed top-0 left-0 right-0 z-50 h-16',
      'flex items-center justify-between px-4 lg:px-6',
      'border-b border-surface-border',
      'transition-all duration-300',
      isLanding
        ? 'bg-transparent backdrop-blur-sm'
        : 'bg-surface-dark/90 backdrop-blur-glass'
    )}>

      {/* ── Logo ─────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
        <div className="relative w-8 h-8">
          {/* Animated logo mark */}
          <div className="absolute inset-0 rounded-lg bg-brand opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="absolute inset-0 rounded-lg border border-brand/40 group-hover:border-brand/60 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={16} className="text-brand" />
          </div>
        </div>
        <span className="font-display font-bold text-lg tracking-tight">
          Vendor<span className="text-brand">IQ</span>
        </span>
      </Link>

      {/* ── Centre: CIN Search Trigger ───────────────────── */}
      {user && (
        <button
          onClick={() => router.push('/search')}
          className={clsx(
            'hidden md:flex items-center gap-3 mx-4 flex-1 max-w-md',
            'px-4 py-2.5 rounded-xl',
            'bg-surface-card border border-surface-border',
            'text-text-muted text-sm font-mono',
            'hover:border-brand/40 hover:bg-surface-hover',
            'transition-all duration-200',
            'cursor-pointer'
          )}
        >
          <Search size={14} />
          <span>Search company CIN or name...</span>
          <span className="ml-auto flex gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-surface-border text-text-muted">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-surface-border text-text-muted">K</kbd>
          </span>
        </button>
      )}

      {/* ── Right: Actions ───────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {user ? (
          <>
            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand rounded-full" />
            </button>

            {/* Mobile search */}
            <button
              onClick={() => router.push('/search')}
              className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Search size={18} />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-text-secondary max-w-[120px] truncate">
                  {user.name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} className={clsx('text-text-muted transition-transform', menuOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 glass rounded-xl py-2 z-50"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-surface-border">
                      <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                      <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-brand/15 text-brand text-[10px] font-semibold uppercase tracking-wide">
                        {user.subscription_tier}
                      </span>
                    </div>

                    {/* Menu items */}
                    {[
                      { href: '/settings', icon: Settings, label: 'Settings' },
                      { href: '/settings/billing', icon: User, label: 'Billing' },
                    ].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                      >
                        <item.icon size={15} className="text-text-muted" />
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t border-surface-border mt-1 pt-1">
                      <button
                        onClick={() => { logout(); setMenuOpen(false); router.push('/'); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-risk-high hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">
              Sign in
            </Link>
            <Link href="/auth/register" className="btn-brand text-sm py-2 px-4">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
