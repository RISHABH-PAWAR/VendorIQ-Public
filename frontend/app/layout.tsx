import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { TopNav } from '@/components/shared/TopNav';
import { SideNav } from '@/components/shared/SideNav';
import { MainContentWrapper } from '@/components/shared/MainContentWrapper';
import { CursorGlow } from '@/components/ui/CursorGlow';

export const metadata: Metadata = {
  title: 'VendorIQ — AI-Powered Vendor Due Diligence',
  description: 'Get a complete vendor risk report in under 5 minutes. VHS score, legal checks, GST compliance, director analysis — all in one AI-powered report.',
  keywords: ['vendor due diligence', 'vendor risk', 'CIN search', 'MCA company check', 'GST compliance', 'India'],
  openGraph: {
    title: 'VendorIQ — AI-Powered Vendor Due Diligence',
    description: 'Instant vendor risk reports for Indian companies. ₹2,000 per report.',
    type: 'website',
    locale: 'en_IN',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Cabinet Grotesk — display font */}
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link
          href="https://fonts.cdnfonts.com/css/cabinet-grotesk"
          rel="stylesheet"
        />
        {/* Satoshi — body font */}
        <link
          href="https://fonts.cdnfonts.com/css/satoshi"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface-dark text-text-primary antialiased">
        <Providers>
          {/* Premium cursor glow — 5th Law */}
          <CursorGlow />

          {/* Top navigation bar */}
          <TopNav />

          {/* Main layout — sidebar + content */}
          <div className="flex min-h-screen pt-16">
            <SideNav />
            <MainContentWrapper>
              {children}
            </MainContentWrapper>
          </div>

          {/* Toast notifications handled inside Providers (client component) */}
        </Providers>
      </body>
    </html>
  );
}
