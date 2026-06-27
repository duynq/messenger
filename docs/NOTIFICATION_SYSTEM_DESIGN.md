# Notification System Design — Messenger

Tài liệu thiết kế hệ thống notification cho ứng dụng Messenger. Được thiết kế để scale và mở rộng multi-channel trong tương lai.

---

## 1. Overview

### 1.1 Functional Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| FR1 | Gửi notification qua nhiều channels (In-app, Web Push, Email) | P1 |
| FR2 | Tôn trọng user preferences cho từng channel | P1 |
| FR3 | Tôn trọng mute settings cho từng conversation | P1 |
| FR4 | Không gửi notification cho chính mình | P1 |
| FR5 | Không notify khi user đang active trong conversation đó | P2 |
| FR6 | Scheduled notifications (future) | P3 |

### 1.2 Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| NFR1 | Không gửi duplicate notifications | 100% |
| NFR2 | Internal latency (queue → delivery) | < 1 giây |
| NFR3 | Scale capacity | 100K notifications/ngày |
| NFR4 | Fault tolerance | Retry với backoff, DLQ |
| NFR5 | Observability | Metrics, logging, alerting |

### 1.3 Notification Types

| Type | Trigger | Channels |
|------|---------|----------|
| `new_message` | Tin nhắn mới trong conversation | In-app, Web Push, Email (digest) |
| `mention` | Được @mention trong group | In-app, Web Push, Email |
| `added_to_group` | Được thêm vào group | In-app, Web Push |
| `removed_from_group` | Bị xóa khỏi group | In-app |
| `group_renamed` | Group đổi tên | In-app |
| `admin_transferred` | Được chuyển quyền admin | In-app, Web Push |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────┐                                                           │
│   │  Event Sources  │                                                           │
│   │  ─────────────  │                                                           │
│   │  • MessageCreated                                                           │
│   │  • ParticipantAdded                                                         │
│   │  • ParticipantRemoved                                                       │
│   │  • GroupRenamed                                                             │
│   │  • AdminTransferred                                                         │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐      │
│   │                    Notification Service                              │      │
│   │  ┌─────────────────────────────────────────────────────────────┐    │      │
│   │  │  1. Validate event                                          │    │      │
│   │  │  2. Get recipients (exclude actor, check mute)              │    │      │
│   │  │  3. Get user preferences (cached)                           │    │      │
│   │  │  4. Create notification records                             │    │      │
│   │  │  5. Enqueue delivery jobs per channel                       │    │      │
│   │  └─────────────────────────────────────────────────────────────┘    │      │
│   └────────┬────────────────────────────────────────────────────────────┘      │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐      │
│   │                         Redis                                        │      │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │      │
│   │  │ Sidekiq Queues  │  │ User Prefs      │  │ Distributed Locks   │  │      │
│   │  │ • in_app        │  │ Cache           │  │ (dedup)             │  │      │
│   │  │ • web_push      │  │ TTL: 5min       │  │                     │  │      │
│   │  │ • email         │  │                 │  │                     │  │      │
│   │  └────────┬────────┘  └─────────────────┘  └─────────────────────┘  │      │
│   └───────────┼─────────────────────────────────────────────────────────┘      │
│               │                                                                 │
│               ▼                                                                 │
│   ┌───────────────────────────────────────────────────────────────────────┐    │
│   │                      Delivery Workers (Sidekiq)                        │    │
│   │                                                                        │    │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │    │
│   │   │  In-App Worker  │  │ Web Push Worker │  │   Email Worker      │   │    │
│   │   │                 │  │                 │  │                     │   │    │
│   │   │ 1. Acquire lock │  │ 1. Acquire lock │  │ 1. Acquire lock     │   │    │
│   │   │ 2. Check status │  │ 2. Check status │  │ 2. Check status     │   │    │
│   │   │ 3. Broadcast    │  │ 3. Send via     │  │ 3. Render template  │   │    │
│   │   │    ActionCable  │  │    Web Push API │  │ 4. Send via SMTP    │   │    │
│   │   │ 4. Update status│  │ 4. Update status│  │ 5. Update status    │   │    │
│   │   │ 5. Release lock │  │ 5. Release lock │  │ 6. Release lock     │   │    │
│   │   └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘   │    │
│   │            │                    │                      │              │    │
│   │            ▼                    ▼                      ▼              │    │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │    │
│   │   │  ActionCable    │  │   Web Push API  │  │   SMTP / SendGrid   │   │    │
│   │   │  (real-time)    │  │   (browser)     │  │   (email)           │   │    │
│   │   └─────────────────┘  └─────────────────┘  └─────────────────────┘   │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐      │
│   │                         PostgreSQL                                   │      │
│   │  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │      │
│   │  │ notifications│  │notification_      │  │ push_subscriptions   │  │      │
│   │  │              │  │ deliveries        │  │                      │  │      │
│   │  └──────────────┘  └───────────────────┘  └──────────────────────┘  │      │
│   └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- =============================================
-- notifications: Parent record cho mỗi notification event
-- =============================================
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    
    -- Recipient & Actor
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Polymorphic reference to source entity
    notifiable_type VARCHAR(50) NOT NULL,  -- 'Message', 'Conversation', etc.
    notifiable_id BIGINT NOT NULL,
    
    -- Notification metadata
    notification_type VARCHAR(50) NOT NULL,  -- 'new_message', 'mention', etc.
    data JSONB DEFAULT '{}',                  -- Extra payload
    
    -- Status tracking
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT idx_notifications_user_read 
        UNIQUE (user_id, read_at, created_at DESC)
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_notifiable ON notifications(notifiable_type, notifiable_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- =============================================
-- notification_deliveries: Track delivery per channel
-- =============================================
CREATE TABLE notification_deliveries (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- Channel info
    channel VARCHAR(20) NOT NULL,  -- 'in_app', 'web_push', 'email'
    
    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  
        -- pending, processing, delivered, failed, skipped
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error tracking
    last_error TEXT,
    
    -- Timestamps
    delivered_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate deliveries
    CONSTRAINT idx_notification_deliveries_unique 
        UNIQUE (notification_id, channel)
);

CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_retry ON notification_deliveries(next_retry_at) 
    WHERE status = 'pending';

-- =============================================
-- push_subscriptions: Web Push subscriptions
-- =============================================
CREATE TABLE push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Web Push subscription data
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    
    -- Device info
    user_agent TEXT,
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT idx_push_subscriptions_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE active = TRUE;
```

### 3.2 User Preferences (Update users table)

```sql
-- Add notification_preferences JSONB column to users
ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{
    "channels": {
        "in_app": true,
        "web_push": true,
        "email": false
    },
    "types": {
        "new_message": true,
        "mention": true,
        "added_to_group": true,
        "removed_from_group": true,
        "group_renamed": true,
        "admin_transferred": true
    },
    "email_digest": "none",
    "quiet_hours": null
}'::jsonb;

-- Add muted_at to conversation_participants
ALTER TABLE conversation_participants 
    ADD COLUMN muted_at TIMESTAMP;
```

### 3.3 Sample Data Structure

```json
// notification_preferences example
{
    "channels": {
        "in_app": true,
        "web_push": true,
        "email": false
    },
    "types": {
        "new_message": true,
        "mention": true,
        "added_to_group": true
    },
    "email_digest": "daily",  // none, instant, daily, weekly
    "quiet_hours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00",
        "timezone": "Asia/Ho_Chi_Minh"
    }
}

// notification.data example
{
    "conversation_id": 123,
    "conversation_name": "Project Team",
    "message_preview": "Hey, check this out...",
    "is_group": true
}
```

---

## 4. API Design

### 4.1 REST Endpoints

```yaml
# =============================================
# Notifications
# =============================================

GET /api/v1/notifications:
  description: List notifications for current user
  params:
    - page: integer (default: 1)
    - per_page: integer (default: 20, max: 50)
    - unread_only: boolean (default: false)
  response:
    notifications: Notification[]
    meta: { current_page, total_pages, unread_count }

GET /api/v1/notifications/unread_count:
  description: Get unread notification count
  response:
    count: integer

PATCH /api/v1/notifications/:id/read:
  description: Mark single notification as read
  response:
    notification: Notification

POST /api/v1/notifications/read_all:
  description: Mark all notifications as read
  response:
    updated_count: integer

DELETE /api/v1/notifications/:id:
  description: Delete a notification
  response:
    success: boolean

# =============================================
# Notification Preferences
# =============================================

GET /api/v1/notification_preferences:
  description: Get current user's notification preferences
  response:
    preferences: NotificationPreferences

PATCH /api/v1/notification_preferences:
  description: Update notification preferences
  body:
    channels: { in_app: boolean, web_push: boolean, email: boolean }
    types: { new_message: boolean, mention: boolean, ... }
    email_digest: string
    quiet_hours: object | null
  response:
    preferences: NotificationPreferences

# =============================================
# Push Subscriptions
# =============================================

POST /api/v1/push_subscriptions:
  description: Register a new push subscription
  body:
    endpoint: string
    keys: { p256dh: string, auth: string }
    user_agent: string (optional)
  response:
    subscription: PushSubscription

DELETE /api/v1/push_subscriptions:
  description: Remove push subscription
  body:
    endpoint: string
  response:
    success: boolean

# =============================================
# Conversation Mute
# =============================================

POST /api/v1/conversations/:id/mute:
  description: Mute notifications for a conversation
  response:
    conversation: Conversation

DELETE /api/v1/conversations/:id/mute:
  description: Unmute notifications for a conversation
  response:
    conversation: Conversation
```

### 4.2 WebSocket Events (ActionCable)

```yaml
# =============================================
# NotificationChannel
# =============================================

Subscribe:
  channel: NotificationChannel
  # No params needed - scoped to current_user

Server → Client Events:

  # On subscribe - send initial state
  snapshot:
    type: "snapshot"
    unread_count: integer

  # New notification received
  notification:
    type: "notification"
    notification:
      id: integer
      notification_type: string
      actor: { id, full_name, avatar_url }
      data: object
      read_at: timestamp | null
      created_at: timestamp

  # Notification read (synced across devices)
  notification_read:
    type: "notification_read"
    notification_id: integer

  # All notifications read
  notifications_read_all:
    type: "notifications_read_all"

  # Unread count updated
  unread_count_updated:
    type: "unread_count_updated"
    count: integer
```

---

## 5. Service Layer

### 5.1 Notification Creation Service

```ruby
# app/services/notifications/creation_service.rb
module Notifications
  class CreationService
    include Callable

    NOTIFICATION_TYPES = %w[
      new_message
      mention
      added_to_group
      removed_from_group
      group_renamed
      admin_transferred
    ].freeze

    def initialize(recipients:, actor:, notifiable:, type:, data: {})
      @recipients = Array(recipients)
      @actor = actor
      @notifiable = notifiable
      @type = type
      @data = data
    end

    def call
      return Result.failure(error: 'Invalid notification type') unless valid_type?
      return Result.success(value: []) if @recipients.empty?

      notifications = []

      @recipients.each do |recipient|
        next if should_skip?(recipient)

        notification = create_notification(recipient)
        enqueue_deliveries(notification, recipient)
        notifications << notification
      end

      Result.success(value: notifications)
    end

    private

    def valid_type?
      NOTIFICATION_TYPES.include?(@type)
    end

    def should_skip?(recipient)
      recipient.id == @actor&.id ||                    # Don't notify self
        type_disabled?(recipient) ||                    # Type disabled in prefs
        conversation_muted?(recipient) ||               # Conversation muted
        user_in_quiet_hours?(recipient)                 # Quiet hours active
    end

    def type_disabled?(recipient)
      prefs = get_preferences(recipient)
      prefs.dig('types', @type) == false
    end

    def conversation_muted?(recipient)
      return false unless @notifiable.respond_to?(:conversation_id)

      ConversationParticipant
        .where(user: recipient, conversation_id: conversation_id)
        .where.not(muted_at: nil)
        .exists?
    end

    def conversation_id
      @notifiable.is_a?(Conversation) ? @notifiable.id : @notifiable.conversation_id
    end

    def user_in_quiet_hours?(recipient)
      prefs = get_preferences(recipient)
      quiet = prefs['quiet_hours']
      return false unless quiet&.dig('enabled')

      # Check if current time is within quiet hours
      QuietHoursChecker.quiet?(
        start_time: quiet['start'],
        end_time: quiet['end'],
        timezone: quiet['timezone']
      )
    end

    def get_preferences(user)
      Rails.cache.fetch("user_prefs:#{user.id}", expires_in: 5.minutes) do
        user.notification_preferences || {}
      end
    end

    def create_notification(recipient)
      Notification.create!(
        user: recipient,
        actor: @actor,
        notifiable: @notifiable,
        notification_type: @type,
        data: @data
      )
    end

    def enqueue_deliveries(notification, recipient)
      prefs = get_preferences(recipient)
      channels = prefs.fetch('channels', {})

      channels.each do |channel, enabled|
        next unless enabled

        delivery = NotificationDelivery.create!(
          notification: notification,
          channel: channel,
          status: 'pending'
        )

        # Enqueue to appropriate queue
        NotificationDeliveryJob.perform_async(delivery.id)
      end
    end
  end
end
```

### 5.2 Delivery Job

```ruby
# app/jobs/notification_delivery_job.rb
class NotificationDeliveryJob
  include Sidekiq::Job

  sidekiq_options(
    queue: :notifications,
    retry: 3,
    dead: true,  # Move to DLQ after max retries
    backtrace: true
  )

  # Retry with exponential backoff
  sidekiq_retry_in do |count, _exception|
    (count ** 4) + 15 + (rand(10) * (count + 1))
  end

  def perform(delivery_id)
    delivery = NotificationDelivery.find(delivery_id)
    notification = delivery.notification

    # Idempotency: Skip if already delivered
    return if delivery.delivered?

    # Distributed lock to prevent race condition
    lock_key = "notif_delivery:#{delivery_id}"
    
    Kredis.with_lock(lock_key, expires_in: 30.seconds) do
      # Double-check status after acquiring lock
      delivery.reload
      return if delivery.delivered?

      # Mark as processing
      delivery.update!(status: 'processing')

      # Deliver based on channel
      case delivery.channel
      when 'in_app'
        deliver_in_app(notification)
      when 'web_push'
        deliver_web_push(notification)
      when 'email'
        deliver_email(notification)
      end

      # Mark as delivered
      delivery.update!(
        status: 'delivered',
        delivered_at: Time.current
      )
    end
  rescue Kredis::LockError
    # Another worker is processing, skip
    Rails.logger.info "Lock contention for delivery #{delivery_id}, skipping"
  rescue StandardError => e
    handle_failure(delivery, e)
    raise e  # Re-raise to trigger Sidekiq retry
  end

  private

  def deliver_in_app(notification)
    NotificationChannel.broadcast_to(
      notification.user,
      {
        type: 'notification',
        notification: NotificationBlueprint.render_as_hash(notification)
      }
    )
  end

  def deliver_web_push(notification)
    subscriptions = notification.user.push_subscriptions.active

    subscriptions.find_each do |subscription|
      payload = build_push_payload(notification)
      
      Webpush.payload_send(
        message: payload.to_json,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
        vapid: vapid_keys,
        ttl: 86400  # 24 hours
      )

      subscription.touch(:last_used_at)
    rescue Webpush::ExpiredSubscription
      subscription.update!(active: false)
    end
  end

  def deliver_email(notification)
    # Skip if email digest is not instant
    prefs = notification.user.notification_preferences
    return unless prefs.dig('email_digest') == 'instant'

    NotificationMailer
      .with(notification: notification)
      .notification_email
      .deliver_now
  end

  def build_push_payload(notification)
    {
      title: push_title(notification),
      body: push_body(notification),
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      tag: "notification-#{notification.id}",
      data: {
        url: notification_url(notification),
        notification_id: notification.id
      }
    }
  end

  def push_title(notification)
    case notification.notification_type
    when 'new_message'
      notification.actor&.full_name || 'New message'
    when 'mention'
      "#{notification.actor&.full_name} mentioned you"
    when 'added_to_group'
      'Added to group'
    else
      'Messenger'
    end
  end

  def push_body(notification)
    notification.data['message_preview'] || 
      I18n.t("notifications.#{notification.notification_type}.body")
  end

  def notification_url(notification)
    conversation_id = notification.data['conversation_id']
    "/chat/#{conversation_id}" if conversation_id
  end

  def vapid_keys
    {
      subject: "mailto:#{Rails.application.config.vapid_contact}",
      public_key: Rails.application.credentials.vapid[:public_key],
      private_key: Rails.application.credentials.vapid[:private_key]
    }
  end

  def handle_failure(delivery, error)
    delivery.increment!(:attempts)
    delivery.update!(
      last_error: error.message,
      status: delivery.attempts >= delivery.max_attempts ? 'failed' : 'pending',
      next_retry_at: Time.current + retry_delay(delivery.attempts)
    )
  end

  def retry_delay(attempts)
    (attempts ** 4) + 15 + rand(10)
  end
end
```

### 5.3 Event Triggers

```ruby
# app/services/messages/creation_service.rb
module Messages
  class CreationService
    # ... existing code ...

    def call
      # ... create message ...

      if result.success?
        # Trigger notification
        notify_participants(result.value)
      end

      result
    end

    private

    def notify_participants(message)
      recipients = message.conversation.users.where.not(id: Current.user.id)
      
      Notifications::CreationService.call(
        recipients: recipients,
        actor: Current.user,
        notifiable: message,
        type: 'new_message',
        data: {
          conversation_id: message.conversation_id,
          conversation_name: message.conversation.display_name,
          message_preview: message.content.truncate(100),
          is_group: message.conversation.is_group
        }
      )
    end
  end
end
```

---

## 6. Frontend Implementation

### 6.1 NotificationProvider

```typescript
// components/providers/NotificationProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { createConsumer } from '@rails/actioncable';

interface Notification {
  id: number;
  notification_type: string;
  actor: { id: number; full_name: string; avatar_url?: string } | null;
  data: Record<string, any>;
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
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;

    fetchNotifications();
  }, [user]);

  // WebSocket subscription
  useEffect(() => {
    if (!user || !token) return;

    const cable = createConsumer(
      `${process.env.NEXT_PUBLIC_WS_URL}/cable?token=${token}`
    );

    const subscription = cable.subscriptions.create('NotificationChannel', {
      received(data: any) {
        switch (data.type) {
          case 'snapshot':
            setUnreadCount(data.unread_count);
            break;

          case 'notification':
            setNotifications(prev => [data.notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            break;

          case 'notification_read':
            setNotifications(prev =>
              prev.map(n =>
                n.id === data.notification_id
                  ? { ...n, read_at: new Date().toISOString() }
                  : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            break;

          case 'notifications_read_all':
            setNotifications(prev =>
              prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
            break;

          case 'unread_count_updated':
            setUnreadCount(data.count);
            break;
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [user, token]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/notifications');
      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.meta.unread_count);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = useCallback(async (id: number) => {
    await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
  }, []);

  const markAllAsRead = useCallback(async () => {
    await fetch('/api/v1/notifications/read_all', { method: 'POST' });
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
```

### 6.2 NotificationBell Component

```typescript
// components/layout/NotificationBell.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
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

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    const url = notification.data.conversation_id
      ? `/chat/${notification.data.conversation_id}`
      : '/dashboard';

    router.push(url);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 
                       rounded-full text-xs text-white flex items-center 
                       justify-center font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-lg 
                       border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 20).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-white/10">
                <button
                  onClick={() => {
                    router.push('/notifications');
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-purple-400 
                             hover:text-purple-300 py-1"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onClick 
}: { 
  notification: any; 
  onClick: () => void;
}) {
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 
                  transition-colors text-left ${isUnread ? 'bg-purple-500/10' : ''}`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-purple-600/50 flex items-center 
                      justify-center text-white font-medium shrink-0">
        {notification.actor?.full_name?.[0] || 'N'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isUnread ? 'text-white' : 'text-gray-300'}`}>
          <span className="font-medium">{notification.actor?.full_name}</span>
          {' '}
          <span className="text-gray-400">
            {getNotificationText(notification)}
          </span>
        </p>
        
        {notification.data.message_preview && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {notification.data.message_preview}
          </p>
        )}
        
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-2" />
      )}
    </button>
  );
}

function getNotificationText(notification: any): string {
  switch (notification.notification_type) {
    case 'new_message':
      return notification.data.is_group
        ? `sent a message in ${notification.data.conversation_name}`
        : 'sent you a message';
    case 'mention':
      return `mentioned you in ${notification.data.conversation_name}`;
    case 'added_to_group':
      return `added you to ${notification.data.conversation_name}`;
    case 'removed_from_group':
      return `removed you from ${notification.data.conversation_name}`;
    case 'group_renamed':
      return `renamed the group to ${notification.data.conversation_name}`;
    case 'admin_transferred':
      return `made you admin of ${notification.data.conversation_name}`;
    default:
      return 'sent you a notification';
  }
}
```

---

## 7. Duplicate Prevention Strategy

### 7.1 Multiple Layers of Protection

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DUPLICATE PREVENTION LAYERS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: Database Unique Constraint                                │
│  ─────────────────────────────────────                              │
│  UNIQUE (notification_id, channel) on notification_deliveries       │
│  → Prevents creating duplicate delivery records                     │
│                                                                     │
│  Layer 2: Distributed Lock (Redis)                                  │
│  ─────────────────────────────────                                  │
│  SETNX notif_delivery:{id} worker-id EX 30                         │
│  → Only one worker can process a delivery at a time                │
│                                                                     │
│  Layer 3: Optimistic Locking (DB Status Check)                      │
│  ─────────────────────────────────────────────                      │
│  UPDATE notification_deliveries                                     │
│  SET status = 'processing'                                          │
│  WHERE id = ? AND status = 'pending'                                │
│  → Atomic status transition, second worker gets 0 rows affected     │
│                                                                     │
│  Layer 4: Idempotency Check Before Delivery                         │
│  ──────────────────────────────────────────                         │
│  return if delivery.delivered?                                      │
│  → Final check after acquiring lock                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Race Condition Scenario

```
Timeline:
─────────────────────────────────────────────────────────────────────
Worker A                              Worker B
─────────────────────────────────────────────────────────────────────
1. Try acquire lock                   
   SETNX → SUCCESS ✓                 

                                      2. Try acquire lock
                                         SETNX → FAIL (locked) ✗
                                         → Skip, will retry later

3. Check status = 'pending' ✓
4. UPDATE status = 'processing'
5. Send notification
6. UPDATE status = 'delivered'
7. Release lock

                                      8. Retry: Try acquire lock
                                         SETNX → SUCCESS ✓
                                      9. Check status = 'delivered'
                                         → Skip (already done) ✗
─────────────────────────────────────────────────────────────────────
Result: Only 1 notification sent ✓
```

---

## 8. Retry & Dead Letter Queue

### 8.1 Retry Strategy

```ruby
# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.death_handlers << ->(job, ex) do
    delivery_id = job['args'].first
    delivery = NotificationDelivery.find_by(id: delivery_id)
    
    if delivery
      delivery.update!(
        status: 'failed',
        last_error: "Moved to DLQ: #{ex.message}"
      )
      
      # Alert ops team
      NotificationFailureAlert.notify(delivery, ex)
    end
  end
end
```

### 8.2 Retry Schedule

| Attempt | Delay | Total elapsed |
|---------|-------|---------------|
| 1 | Immediate | 0s |
| 2 | ~30s | 30s |
| 3 | ~2min | 2.5min |
| 4 (DLQ) | - | Failed |

---

## 9. Monitoring & Observability

### 9.1 Key Metrics

| Metric | Description | Alert threshold |
|--------|-------------|-----------------|
| `notifications.created` | Total created/min | - |
| `notifications.delivered` | Successful deliveries/min | < 90% of created |
| `notifications.failed` | Failed deliveries/min | > 5% of created |
| `notifications.latency_p99` | 99th percentile latency | > 5s |
| `notifications.dlq_size` | Items in dead letter queue | > 100 |
| `notifications.retry_rate` | Retries per delivery | > 1.5 avg |

### 9.2 Logging

```ruby
# Structured logging for each delivery
Rails.logger.info({
  event: 'notification_delivered',
  notification_id: notification.id,
  delivery_id: delivery.id,
  channel: delivery.channel,
  user_id: notification.user_id,
  type: notification.notification_type,
  latency_ms: (Time.current - delivery.created_at) * 1000,
  attempts: delivery.attempts
}.to_json)
```

---

## 10. Implementation Phases

### Phase 1: In-App Notifications (MVP)
- [ ] Database migrations
- [ ] Notification model + delivery model
- [ ] CreationService
- [ ] DeliveryJob (in_app channel only)
- [ ] NotificationChannel (ActionCable)
- [ ] API endpoints
- [ ] Frontend: NotificationProvider + NotificationBell

### Phase 2: Preferences & Muting
- [ ] User notification_preferences column
- [ ] Conversation muting (muted_at)
- [ ] Preferences API
- [ ] Frontend: Settings UI

### Phase 3: Web Push
- [ ] VAPID keys setup
- [ ] PushSubscription model
- [ ] Web Push delivery
- [ ] Service Worker
- [ ] Frontend: Permission prompt

### Phase 4: Email Notifications
- [ ] NotificationMailer
- [ ] Email templates
- [ ] Digest job (daily/weekly)
- [ ] Unsubscribe links

---

## 11. References

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [ActionCable Guide](https://guides.rubyonrails.org/action_cable_overview.html)
- [Sidekiq Best Practices](https://github.com/mperham/sidekiq/wiki/Best-Practices)
- [Redis Distributed Locks](https://redis.io/docs/manual/patterns/distributed-locks/)

---

*Document version: 1.0 | Created: 2026-06-27 | Author: AI Assistant*
