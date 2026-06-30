'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, type Notification } from '@/components/providers/NotificationProvider';
import { useRouter } from 'next/navigation';

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getNotificationText(notification: Notification): string {
  const data = notification.data as Record<string, string | boolean>;

  switch (notification.notification_type) {
    case 'new_message':
      return data.is_group
        ? `sent a message in ${data.conversation_name}`
        : 'sent you a message';
    case 'mention':
      return `mentioned you in ${data.conversation_name}`;
    case 'added_to_group':
      return `added you to ${data.conversation_name}`;
    case 'removed_from_group':
      return `removed you from ${data.conversation_name}`;
    case 'group_renamed':
      return `renamed the group to ${data.conversation_name}`;
    case 'admin_transferred':
      return `made you admin of ${data.conversation_name}`;
    default:
      return 'sent you a notification';
  }
}

export function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    const data = notification.data as Record<string, string>;
    const url = data.conversation_id
      ? `/chat/${data.conversation_id}`
      : '/dashboard';

    router.push(url);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white/70" />

        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 
                       rounded-full text-[10px] text-white flex items-center 
                       justify-center font-bold animate-in zoom-in duration-200"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-80 bg-[#111111]/95 backdrop-blur-lg
                     border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50
                     animate-in fade-in slide-in-from-top-2 duration-200`}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-semibold text-white text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto hide-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-white/40 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((notification) => {
                const isUnread = !notification.read_at;

                return (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 
                                transition-colors text-left ${isUnread ? 'bg-brand-500/5' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center 
                                    justify-center text-brand-300 font-semibold text-sm shrink-0">
                      {notification.actor?.full_name?.[0]?.toUpperCase() || 'N'}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${isUnread ? 'text-white' : 'text-white/60'}`}>
                        <span className="font-medium">{notification.actor?.full_name}</span>
                        {' '}
                        <span className="text-white/50">
                          {getNotificationText(notification)}
                        </span>
                      </p>

                      {(notification.data as Record<string, string>).message_preview && (
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {(notification.data as Record<string, string>).message_preview}
                        </p>
                      )}

                      <p className="text-[10px] text-white/30 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
