import {
  activeConversationId,
  isNotificationForConversation,
  notificationConversationId,
} from '@/lib/notifications';
import type { Notification } from '@/components/providers/NotificationProvider';

function notification(conversationId: number | string): Notification {
  return {
    id: 1,
    notification_type: 'new_message',
    actor: null,
    data: { conversation_id: conversationId },
    read_at: null,
    created_at: new Date().toISOString(),
  };
}

describe('notification conversation matching', () => {
  it.each([
    ['/chat/2003', 2003],
    ['/vi/chat/2003', 2003],
    ['/en/chat/2003/', 2003],
    ['/dashboard', null],
  ])('extracts the active conversation from %s', (pathname, expected) => {
    expect(activeConversationId(pathname)).toBe(expected);
  });

  it('normalizes numeric and string conversation IDs', () => {
    expect(notificationConversationId(notification(2003))).toBe(2003);
    expect(notificationConversationId(notification('2003'))).toBe(2003);
  });

  it('matches only notifications from the active conversation', () => {
    expect(isNotificationForConversation(notification(2003), 2003)).toBe(true);
    expect(isNotificationForConversation(notification(2004), 2003)).toBe(false);
    expect(isNotificationForConversation(notification(2003), null)).toBe(false);
  });
});
