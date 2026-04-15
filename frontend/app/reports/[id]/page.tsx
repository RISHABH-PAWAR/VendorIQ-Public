'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { reportApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ReportViewer } from '@/components/report/ReportViewer';
import { ReportViewerSkeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReportDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const { user } = useAuthStore();
  const [report,  setReport]  = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const reportId = params?.id as string;

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (!reportId) return;
    load();
  }, [user, reportId]);

  const load = async () => {
    try {
      const res = await reportApi.get(reportId);
      const r   = res.data.data.report;
      // If still processing, redirect to processing page
      if (['collecting', 'scoring', 'generating'].includes(r.status)) {
        router.replace(`/reports/${reportId}/processing`);
        return;
      }
      setReport(r);
    } catch (err: any) {
      setError(err.response?.data?.error?.code === 'REPORT_NOT_FOUND'
        ? 'Report not found or you don\'t have access to it.'
        : 'Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ReportViewerSkeleton />;

  if (error) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-risk-high/10 border border-risk-high/20 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={24} className="text-risk-high" />
      </div>
      <h2 className="text-xl font-display font-bold mb-2">Report Not Found</h2>
      <p className="text-text-muted text-sm mb-6">{error}</p>
      <Link href="/reports" className="btn-brand inline-flex items-center gap-2">
        <ArrowLeft size={15} /> Back to Reports
      </Link>
    </div>
  );

  if (report?.status === 'failed') return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-risk-high/10 border border-risk-high/20 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={24} className="text-risk-high" />
      </div>
      <h2 className="text-xl font-display font-bold mb-2">Report Failed</h2>
      <p className="text-text-muted text-sm mb-2">{report.vendor_name || report.vendor_cin}</p>
      <p className="text-text-muted text-xs mb-6">{report.error_message || 'Data collection failed. Please contact support.'}</p>
      <Link href="/search" className="btn-brand inline-flex items-center gap-2">
        Try again
      </Link>
    </div>
  );

  return report ? <ReportViewer report={report} /> : null;
}
