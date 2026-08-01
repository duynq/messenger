'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useCable } from '@/components/providers/CableProvider';
import { activeConversationId, isNotificationForConversation } from '@/lib/notifications';
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/notifications';

interface NotificationActor {
  id: number;
  full_name: string;
  avatar_url?: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  actor: NotificationActor | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const cable = useCable();
  const pathname = usePathname();
  const currentConversationId = activeConversationId(pathname);

  // Fetch initial notifications
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const data = await fetchNotificationsAction();
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.meta?.unread_count ?? 0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // WebSocket subscription
  useEffect(() => {
    if (!cable) return;

    const subscription = cable.subscriptions.create('NotificationChannel', {
      received(data: Record<string, unknown>) {
        switch (data.type) {
          case 'snapshot':
            setUnreadCount(data.unread_count as number);
            break;

          case 'notification': {
            const notif = data.notification as Notification;
            const isViewingConversation = isNotificationForConversation(
              notif,
              currentConversationId,
            );

            if (isViewingConversation) {
              const readNotification = { ...notif, read_at: new Date().toISOString() };
              setNotifications(prev => [readNotification, ...prev]);

              markNotificationReadAction(notif.id).catch(console.error);
            } else {
              setNotifications(prev => [notif, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
            break;
          }

          case 'notification_read':
            setNotifications(prev => {
              const notifIndex = prev.findIndex(n => n.id === (data.notification_id as number));

              // Only decrement if the notification exists and is currently unread
              if (notifIndex >= 0 && !prev[notifIndex].read_at) {
                setUnreadCount(current => Math.max(0, current - 1));
              }

              return prev.map(n =>
                n.id === (data.notification_id as number)
                  ? { ...n, read_at: new Date().toISOString() }
                  : n
              );
            });
            break;

          case 'notifications_read_all':
            setNotifications(prev =>
              prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
            break;

          case 'notifications_read': {
            const notificationIds = new Set(data.notification_ids as number[]);
            setNotifications(prev => prev.map(notification =>
              notificationIds.has(notification.id)
                ? { ...notification, read_at: notification.read_at || new Date().toISOString() }
                : notification
            ));
            setUnreadCount(data.unread_count as number);
            break;
          }

          case 'unread_count_updated':
            setUnreadCount(data.count as number);
            break;
        }
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cable, currentConversationId]);

  const markAsRead = useCallback(async (id: number) => {
    await markNotificationReadAction(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsReadAction();
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, isLoading }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
