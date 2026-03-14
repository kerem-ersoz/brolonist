import { create } from 'zustand';

interface User {
  id: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (name: string) => Promise<void>;
  logout: () => void;
  validateToken: () => Promise<void>;
}

export type { AuthState };

const apiBase = import.meta.env.VITE_API_URL || '';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (name: string) => {
    const res = await fetch(`${apiBase}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  validateToken: async () => {
    const token = get().token || localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    try {
      // Validate + get user info
      const meRes = await fetch(`${apiBase}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        // Token invalid/expired — clear it
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }
      const meData = await meRes.json();
      set({ user: meData.user, isAuthenticated: true });

      // Auto-refresh token (extends expiry)
      const refreshRes = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem('token', refreshData.token);
        set({ token: refreshData.token });
      }
    } catch {
      // Network error — keep existing token, don't logout
    }
  },
}));
