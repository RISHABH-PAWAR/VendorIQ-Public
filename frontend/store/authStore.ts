import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  _id:               string;
  name:              string;
  email:             string;
  company?:          string;
  phone?:            string;
  subscription_tier: 'starter' | 'pro' | 'enterprise';
  subscription_status: string;
  reports_used_this_month: number;
  plan_reports_limit: number | null;
  monitors_used:     number;
  plan_monitors_limit: number | null;
  plan_api_calls_limit: number;
}

interface AuthState {
  user:    User | null;
  token:   string | null;
  loading: boolean;

  // Actions
  login:          (email: string, password: string) => Promise<void>;
  register:       (data: { name: string; email: string; password: string; company?: string }) => Promise<void>;
  logout:         () => void;
  restoreSession: () => void;
  updateUser:     (updates: Partial<User>) => void;
  refreshMe:      () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:    null,
  token:   null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data.data;
      localStorage.setItem('vendoriq_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, token, loading: false });
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err.response?.data?.error?.message || 'Login failed');
    }
  },

  register: async (data) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', data);
      const { token, user } = res.data.data;
      localStorage.setItem('vendoriq_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, token, loading: false });
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err.response?.data?.error?.message || 'Registration failed');
    }
  },

  logout: () => {
    localStorage.removeItem('vendoriq_token');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null });
  },

  restoreSession: () => {
    const token = localStorage.getItem('vendoriq_token');
    if (!token) return;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ token });
    // Fetch fresh user data
    get().refreshMe().catch(() => get().logout());
  },

  refreshMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data.user });
    } catch {
      get().logout();
    }
  },

  updateUser: (updates) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...updates } });
  },
}));
