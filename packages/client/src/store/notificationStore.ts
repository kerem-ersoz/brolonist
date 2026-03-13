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

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (message, type = 'warning') => {
    const id = `notif-${++nextId}`;
    set((s) => ({
      notifications: [...s.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }));
    }, 3500);
  },
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}));
