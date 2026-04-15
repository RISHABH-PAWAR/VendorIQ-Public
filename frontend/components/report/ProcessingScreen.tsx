'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { reportApi } from '@/lib/api';
import { useReportSocket } from '@/hooks/useReportSocket';

const STEPS = [
  'Verifying CIN with MCA',
  'Fetching company registration details',
  'Retrieving director & DIN information',
  'Checking GST filing history',
  'Scanning eCourts for legal cases',
  'Checking NCLT insolvency portal',
  'Querying SEBI enforcement orders',
  'Scanning SFIO watchlist & RBI defaulters',
  'Aggregating news & market signals',
  'Calculating Vendor Health Score',
  'Generating AI narrative with Gemini',
  'Building your PDF report',
];

interface Props {
  reportId:   string;
  vendorName: string;
}

export function ProcessingScreen({ reportId, vendorName }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus]           = useState<'processing' | 'complete' | 'failed'>('processing');
  const [dotCount, setDotCount]       = useState(0);

  // Real-time socket progress (upgrades the visual step when server emits)
  const socketProgress = useReportSocket(reportId);
  useEffect(() => {
    if (!socketProgress.step) return;
    const socketToVisualStep = { 1: 0, 2: 9, 3: 10, 4: 11, 5: 11 };
    const visualStep = socketToVisualStep[socketProgress.step as 1|2|3|4|5];
    if (visualStep !== undefined && visualStep > currentStep) {
      setCurrentStep(visualStep);
    }
    if (socketProgress.status === 'complete') {
      setStatus('complete');
    } else if (socketProgress.status === 'failed') {
      setStatus('failed');
    }
  }, [socketProgress.step, socketProgress.status]);

  // Advance visual steps regardless of real progress (UX trick)
  useEffect(() => {
    const timings = [2, 3, 3, 3, 4, 3, 3, 3, 4, 2, 8, 5]; // seconds per step
    let stepIdx = 0;
    const advance = () => {
      if (stepIdx >= STEPS.length - 1) return;
      stepIdx++;
      setCurrentStep(stepIdx);
      const delay = (timings[stepIdx] ?? 3) * 1000;
      setTimeout(advance, delay);
    };
    const first = setTimeout(advance, (timings[0] ?? 2) * 1000);
    return () => clearTimeout(first);
  }, []);

  // Animate dots
  useEffect(() => {
    const t = setInterval(() => setDotCount(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  // Poll report status every 4s
  const poll = useCallback(async () => {
    try {
      const res  = await reportApi.getStatus(reportId);
      const data = res.data.data;
      if (data.status === 'complete') {
        setStatus('complete');
        setCurrentStep(STEPS.length - 1);
        setTimeout(() => router.push(`/reports/${reportId}`), 1200);
      } else if (data.status === 'failed') {
        setStatus('failed');
      }
    } catch {}
  }, [reportId, router]);

  useEffect(() => {
    const interval = setInterval(poll, 4000);
    poll(); // immediate first poll
    return () => clearInterval(interval);
  }, [poll]);

  const dots = '.'.repeat(dotCount);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-dark">
      <div className="w-full max-w-lg">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {status === 'failed' ? (
            <div className="w-16 h-16 rounded-full bg-risk-high/10 border border-risk-high/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-risk-high" size={28} />
            </div>
          ) : (
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-brand/20 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 rounded-full border-2 border-brand/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold text-brand text-xl">V</span>
              </div>
            </div>
          )}

          <h1 className="text-xl font-display font-bold text-text-primary mb-1">
            {status === 'complete' ? 'Report Ready!' :
             status === 'failed'  ? 'Report Failed' :
             `Analysing ${vendorName || 'vendor'}`}
          </h1>

          {status === 'processing' && (
            <p className="text-sm text-text-muted">
              {STEPS[currentStep]}{dots}
            </p>
          )}
          {status === 'failed' && (
            <p className="text-sm text-risk-high mt-1">
              Something went wrong. Please try again or contact support.
            </p>
          )}
        </motion.div>

        {/* Steps list */}
        <div className="glass-card p-5 space-y-3">
          {STEPS.map((step, i) => {
            const done    = i < currentStep || status === 'complete';
            const active  = i === currentStep && status === 'processing';
            const pending = i > currentStep && status !== 'complete';
            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3"
              >
                {done ? (
                  <CheckCircle2 size={16} className="text-risk-low flex-shrink-0" />
                ) : active ? (
                  <Loader2 size={16} className="text-brand animate-spin flex-shrink-0" />
                ) : (
                  <Circle size={16} className="text-surface-border flex-shrink-0" />
                )}
                <span className={`text-sm ${done ? 'text-text-secondary' : active ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                  {step}
                </span>
                {active && (
                  <div className="ml-auto flex gap-1">
                    {[0,1,2].map(d => (
                      <div
                        key={d}
                        className="w-1 h-1 rounded-full bg-brand"
                        style={{ animation: `pulse 1s ease-in-out ${d * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          You can close this tab — your report will be ready in your dashboard
        </p>
      </div>
    </div>
  );
}
