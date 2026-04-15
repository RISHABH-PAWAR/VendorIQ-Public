'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { reportApi } from '@/lib/api';
import { ReportViewer } from '@/components/report/ReportViewer';
import { ReportViewerSkeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

export default function SharedReportPage() {
  const params    = useParams();
  const token     = params?.token as string;
  const [report,  setReport]  = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!token) return;
    reportApi.getShared(token)
      .then(res  => setReport(res.data.data.report))
      .catch(() => setError('This report link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <ReportViewerSkeleton />;

  if (error) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <AlertTriangle size={40} className="mx-auto mb-4 text-risk-high" />
      <h2 className="text-xl font-display font-bold mb-2">Link Expired</h2>
      <p className="text-text-muted text-sm mb-6">{error}</p>
      <Link href="/" className="btn-brand inline-flex items-center gap-2">
        <Zap size={15} /> Try VendorIQ
      </Link>
    </div>
  );

  return (
    <>
      {/* Shared report banner */}
      <div className="bg-brand/10 border-b border-brand/20 py-3 px-4 text-center">
        <p className="text-sm text-text-secondary">
          This report was shared via{' '}
          <Link href="/" className="text-brand font-semibold hover:underline">VendorIQ</Link>
          {' '}— AI-powered vendor due diligence for India.{' '}
          <Link href="/auth/register" className="text-brand underline text-xs">Get your own report →</Link>
        </p>
      </div>
      {report ? <ReportViewer report={report} /> : null}
    </>
  );
}
