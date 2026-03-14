import { create } from 'zustand';

export interface Notification {
  id: string;
  message: string;
  type: 'warning' | 'error';
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (message: string, type?: 'warning' | 'error') => void;
  removeNotification: (id: string) => void;
}

let nextId = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  addNotification: (message, type = 'warning') => {
    const existing = get().notifications.find((n) => n.message === message);
    if (existing) {
      // Refresh the timer for the existing notification
      const prevTimer = timers.get(existing.id);
      if (prevTimer) clearTimeout(prevTimer);
      const timer = setTimeout(() => {
        timers.delete(existing.id);
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== existing.id),
        }));
      }, 3500);
      timers.set(existing.id, timer);
      return;
    }

    const id = `notif-${++nextId}`;
    set((s) => ({
      notifications: [...s.notifications, { id, message, type }],
    }));
    const timer = setTimeout(() => {
      timers.delete(id);
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }));
    }, 3500);
    timers.set(id, timer);
  },
  removeNotification: (id) => {
    const timer = timers.get(id);
    if (timer) { clearTimeout(timer); timers.delete(id); }
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },
}));
