'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'event' | 'casino';
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));

    // Автоудаление через 5 секунд
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({
  notifications,
  onRemove
}: {
  notifications: Notification[];
  onRemove: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          onClick={() => onRemove(notification.id)}
        >
          <div className="notification-icon">
            {notification.type === 'success' && '✅'}
            {notification.type === 'warning' && '⚠️'}
            {notification.type === 'event' && '🎉'}
            {notification.type === 'casino' && '🎰'}
            {notification.type === 'info' && 'ℹ️'}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
          </div>
          <button className="notification-close">✕</button>
        </div>
      ))}
    </div>
  );
}

// Компонент для отображения событий в чате
export function ChatEventBanner({
  event,
  onClaim,
  claimed
}: {
  event: {
    id: string;
    type: string;
    title: string;
    description: string;
    reward: number;
    endTime: number;
  };
  onClaim: () => void;
  claimed: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((event.endTime - Date.now()) / 1000));
      setTimeLeft(left);
    }, 100);
    return () => clearInterval(interval);
  }, [event.endTime]);

  if (timeLeft === 0) return null;

  return (
    <div className={`chat-event-banner ${event.type}`}>
      <div className="event-icon">
        {event.type === 'coin_rain' && '💰'}
        {event.type === 'xp_bonus' && '⭐'}
        {event.type === 'lucky_user' && '🍀'}
        {event.type === 'jackpot' && '🎰'}
      </div>
      <div className="event-content">
        <div className="event-title">{event.title}</div>
        <div className="event-description">{event.description}</div>
        <div className="event-timer">{timeLeft}с</div>
      </div>
      {!claimed ? (
        <button className="event-claim-btn" onClick={onClaim}>
          Забрать +{event.reward} XP!
        </button>
      ) : (
        <span className="event-claimed">✅ Забрано!</span>
      )}
    </div>
  );
}
