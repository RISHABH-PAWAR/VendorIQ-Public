import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api' || 'http://localhost:4000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: inject request ID ─────────────────────
api.interceptors.request.use((config) => {
  config.headers['x-request-id'] = `fe_${Date.now().toString(36)}`;
  return config;
});

// ── Response interceptor: handle 401 globally ─────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      localStorage.removeItem('vendoriq_token');
      delete api.defaults.headers.common['Authorization'];
      if (typeof window !== 'undefined') {
        const current = window.location.pathname;
        if (current !== '/auth/login' && current !== '/auth/register' && current !== '/') {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(current)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Typed API helpers ─────────────────────────────────────────
export const reportApi = {
  search:     (q: string) => api.get(`/reports/search?q=${encodeURIComponent(q)}`),
  list:       (params?: Record<string, any>) => api.get('/reports', { params }),
  get:        (id: string) => api.get(`/reports/${id}`),
  getStatus:  (id: string) => api.get(`/reports/${id}/status`),
  getShared:  (token: string) => api.get(`/reports/shared/${token}`),
  refreshPdf: (id: string) => api.post(`/reports/${id}/refresh-pdf`),
};

export const paymentApi = {
  createOrder: (cin: string, vendorName: string) =>
    api.post('/payments/create-order', { cin, vendor_name: vendorName }),
  verify: (orderId: string) => api.get(`/payments/verify/${orderId}`),
};

export const subscriptionApi = {
  plans:   () => api.get('/subscriptions/plans'),
  current: () => api.get('/subscriptions/current'),
  upgrade: (tier: 'pro' | 'enterprise') => api.post('/subscriptions/upgrade', { tier }),
  cancel:  () => api.post('/subscriptions/cancel'),
};

export const monitorApi = {
  list:   () => api.get('/monitors'),
  add:    (data: any) => api.post('/monitors', data),
  get:    (id: string) => api.get(`/monitors/${id}`),
  update: (id: string, data: any) => api.patch(`/monitors/${id}`, data),
  delete: (id: string) => api.delete(`/monitors/${id}`),
  run:    (id: string) => api.post(`/monitors/${id}/run`),
  alerts: (id: string) => api.get(`/monitors/${id}/alerts`),
};

export const bulkAuditApi = {
  upload:  (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/bulk-audit', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  list:    (params?: Record<string, any>) => api.get('/bulk-audit', { params }),
  get:     (id: string) => api.get(`/bulk-audit/${id}`),
  delete:  (id: string) => api.delete(`/bulk-audit/${id}`),
};

export const apiKeyApi = {
  list:   () => api.get('/keys'),
  create: (name: string) => api.post('/keys', { name }),
  revoke: (keyId: string) => api.delete(`/keys/${keyId}`),
};

export const graphApi = {
  get: (reportId: string) => api.get(`/reports/${reportId}/graph`),
};
