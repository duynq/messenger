'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createConsumer } from '@rails/actioncable';
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

interface NotificationProviderProps {
  token?: string;
  children: React.ReactNode;
}

export function NotificationProvider({ token, children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const wsUrl = apiUrl.replace('http', 'ws').replace('/api/v1', '') + '/cable?token=' + token;

    const consumer = createConsumer(wsUrl);

    const subscription = consumer.subscriptions.create('NotificationChannel', {
      received(data: Record<string, unknown>) {
        switch (data.type) {
          case 'snapshot':
            setUnreadCount(data.unread_count as number);
            break;

          case 'notification':
            setNotifications(prev => [data.notification as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            break;

          case 'notification_read':
            setNotifications(prev =>
              prev.map(n =>
                n.id === (data.notification_id as number)
                  ? { ...n, read_at: new Date().toISOString() }
                  : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            break;

          case 'notifications_read_all':
            setNotifications(prev =>
              prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
            break;

          case 'unread_count_updated':
            setUnreadCount(data.count as number);
            break;
        }
      },
    });

    return () => {
      subscription.unsubscribe();
      consumer.disconnect();
    };
  }, [token]);

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
