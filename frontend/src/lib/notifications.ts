import type { Notification } from '@/components/providers/NotificationProvider';

export function activeConversationId(pathname: string): number | null {
  const match = pathname.match(/\/chat\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

export function notificationConversationId(notification: Notification): number | null {
  const value = notification.data.conversation_id;
  const id = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function isNotificationForConversation(
  notification: Notification,
  conversationId: number | null,
): boolean {
  return conversationId !== null
    && notificationConversationId(notification) === conversationId;
}
