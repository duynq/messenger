module Conversations
  class MarkAsReadService
    def self.call(conversation:, user:)
      new(conversation: conversation, user: user).call
    end

    def initialize(conversation:, user:)
      @conversation = conversation
      @user = user
    end

    def call
      now = Time.current

      update_last_read(now)
      mark_notifications_as_read(now)
    end

    private

    def update_last_read(now)
      participant = @conversation.conversation_participants.find_by(user_id: @user.id)
      return unless participant&.update(last_read_at: now)

      ActionCable.server.broadcast(
        "conversation_#{@conversation.id}",
        {
          action: 'read_receipt',
          user_id: @user.id,
          last_read_at: participant.last_read_at
        }
      )
    end

    def mark_notifications_as_read(now)
      notifications = @user.notifications.unread.where(
        "notifications.data ->> 'conversation_id' = ?",
        @conversation.id.to_s
      )
      notification_ids = notifications.pluck(:id)
      return if notification_ids.empty?

      notifications.update_all(read_at: now, updated_at: now)

      ActionCable.server.broadcast(
        "notification_user_#{@user.id}",
        {
          type: 'notifications_read',
          notification_ids: notification_ids,
          unread_count: @user.notifications.unread.count
        }
      )
    end
  end
end
