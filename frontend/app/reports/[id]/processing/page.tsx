'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { reportApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { ProcessingScreen } from '@/components/report/ProcessingScreen';

export default function ProcessingPage() {
  const params      = useParams();
  const router      = useRouter();
  const { user }    = useAuthStore();
  const [name, setName] = useState('');
  const reportId    = params?.id as string;

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    // Fetch just the vendor name for the display
    reportApi.getStatus(reportId)
      .then(res => {
        const data = res.data.data;
        // If already complete, go straight to report
        if (data.status === 'complete') {
          router.replace(`/reports/${reportId}`);
          return;
        }
        if (data.status === 'failed') {
          router.replace(`/reports/${reportId}`);
          return;
        }
      })
      .catch(() => {});

    // Get vendor name from the full report endpoint (best effort)
    reportApi.get(reportId)
      .then(res => setName(res.data.data.report?.vendor_name || ''))
      .catch(() => {});
  }, [user, reportId]);

  return <ProcessingScreen reportId={reportId} vendorName={name} />;
}
