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
}

export type { AuthState };

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (name: string) => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${apiBase}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
