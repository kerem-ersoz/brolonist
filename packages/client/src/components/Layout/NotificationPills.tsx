import { useNotificationStore } from '../../store/notificationStore';

export function NotificationPills() {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          onClick={() => removeNotification(notif.id)}
          className={`pointer-events-auto cursor-pointer px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg backdrop-blur-sm animate-slide-up whitespace-nowrap ${
            notif.type === 'error'
              ? 'bg-red-600/90'
              : 'bg-amber-600/90'
          }`}
        >
          ⚠️ {notif.message}
        </div>
      ))}
    </div>
  );
}
