import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ── Obsidian Terminal Design System ───────────────────────
      colors: {
        brand:    { DEFAULT: '#1A56DB', hover: '#1E40AF', light: '#3B82F6' },
        risk: {
          high:   { DEFAULT: '#DC2626', light: '#FEE2E2', text: '#7F1D1D' },
          medium: { DEFAULT: '#F59E0B', light: '#FEF3C7', text: '#78350F' },
          low:    { DEFAULT: '#16A34A', light: '#DCFCE7', text: '#14532D' },
        },
        surface: {
          dark:   '#0F172A',  // Deepest background
          card:   '#1E293B',  // Card surface
          border: '#334155',  // Border
          muted:  '#475569',  // Muted text
          hover:  '#1E2D3D',  // Card hover
        },
        text: {
          primary:  '#F8FAFC',
          secondary:'#CBD5E1',
          muted:    '#64748B',
        },
      },

      fontFamily: {
        // Cabinet Grotesk — display/headings
        display: ['var(--font-cabinet)', 'system-ui', 'sans-serif'],
        // Satoshi — body text
        sans:    ['var(--font-satoshi)', 'system-ui', 'sans-serif'],
        // JetBrains Mono — numbers, codes, CINs
        mono:    ['var(--font-jetbrains)', 'Consolas', 'monospace'],
      },

      backgroundImage: {
        'mesh-brand':  'radial-gradient(ellipse at 20% 50%, rgba(26,86,219,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.10) 0%, transparent 60%)',
        'mesh-dark':   'radial-gradient(ellipse at 50% 0%, rgba(26,86,219,0.08) 0%, transparent 70%)',
        'glow-blue':   'radial-gradient(circle at center, rgba(26,86,219,0.4), transparent 70%)',
      },

      boxShadow: {
        'glass':      '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card':       '0 4px 24px rgba(0,0,0,0.3)',
        'glow-brand': '0 0 40px rgba(26,86,219,0.3)',
        'glow-green': '0 0 40px rgba(22,163,74,0.3)',
        'glow-red':   '0 0 40px rgba(220,38,38,0.3)',
      },

      backdropBlur: {
        xs: '2px',
        glass: '24px',
      },

      animation: {
        'shimmer':      'shimmer 2s linear infinite',
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'slide-up':     'slideUp 0.3s ease-out',
        'fade-in':      'fadeIn 0.4s ease-out',
        'count-up':     'countUp 1s ease-out forwards',
        'scan-line':    'scanLine 3s linear infinite',
      },

      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },

      borderRadius: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
}

export default config
