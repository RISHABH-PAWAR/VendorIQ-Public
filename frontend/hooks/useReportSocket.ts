'use client';

/**
 * VendorIQ — useReportSocket
 * ============================
 * Connects to the Socket.io server and listens for real-time
 * progress updates for a specific report ID.
 *
 * Usage:
 *   const { step, status, message, connected } = useReportSocket(reportId);
 *
 * Emitted events from server:
 *   report_progress → { reportId, step, status, message }
 *
 * Auto-disconnects when the component unmounts or reportId changes.
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ReportProgress {
  step:      number;      // 1–5
  status:    'collecting' | 'scoring' | 'analyzing' | 'generating' | 'complete' | 'failed';
  message:   string;
  reportId?: string;
}

interface UseReportSocketReturn extends Partial<ReportProgress> {
  connected: boolean;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useReportSocket(reportId: string | null): UseReportSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected,  setConnected]  = useState(false);
  const [progress,   setProgress]   = useState<Partial<ReportProgress>>({});

  useEffect(() => {
    if (!reportId) return;

    // Create socket connection (singleton per component mount)
    const socket = io(SOCKET_URL, {
      transports:       ['websocket', 'polling'],
      reconnection:     true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout:          10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_report', reportId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('report_progress', (data: ReportProgress) => {
      if (data.reportId === reportId) {
        setProgress(data);
      }
    });

    socket.on('connect_error', () => {
      // Silently fail — polling fallback handles this
      setConnected(false);
    });

    return () => {
      socket.emit('leave_report', reportId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [reportId]);

  return { connected, ...progress };
}
