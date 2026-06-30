module Notifications
  class CreationService
    def self.call(recipients:, payload:)
      new(recipients: recipients, payload: payload).call
    end

    def initialize(recipients:, payload:)
      @recipients = Array(recipients)
      @payload = payload
    end

    def call
      return Result.failure(error: 'Invalid notification type') unless valid_type?
      return Result.success([]) if @recipients.empty?

      Result.success(create_notifications)
    end

    private

    def valid_type?
      Notification::TYPES.include?(@payload[:type])
    end

    def create_notifications
      @recipients.filter_map { |recipient| process_recipient(recipient) }
    end

    def process_recipient(recipient)
      return if should_skip?(recipient)

      notification = create_notification(recipient)
      enqueue_deliveries(notification, recipient)
      notification
    end

    def should_skip?(recipient)
      recipient.id == @payload[:actor]&.id || type_disabled?(recipient) || conversation_muted?(recipient)
    end

    def type_disabled?(recipient)
      get_preferences(recipient).dig('types', @payload[:type]) == false
    end

    def conversation_muted?(recipient)
      return false unless conversation_id

      ConversationParticipant
        .where(user: recipient, conversation_id: conversation_id)
        .where.not(muted_at: nil)
        .exists?
    end

    def conversation_id
      n = @payload[:notifiable]
      @conversation_id ||= n.is_a?(Conversation) ? n.id : n.try(:conversation_id)
    end

    def get_preferences(user)
      Rails.cache.fetch("user_prefs:#{user.id}", expires_in: 5.minutes) do
        user.notification_preferences || {}
      end
    end

    def create_notification(recipient)
      Notification.create!(user: recipient, actor: @payload[:actor], notifiable: @payload[:notifiable], notification_type: @payload[:type], data: @payload[:data] || {})
    end

    def enqueue_deliveries(notification, recipient)
      channels = enabled_channels(recipient)

      channels.each do |channel|
        delivery = create_delivery(notification, channel)
        NotificationDeliveryJob.perform_now(delivery.id)
      end
    end

    def enabled_channels(recipient)
      prefs = get_preferences(recipient)
      channels = prefs.fetch('channels', { 'in_app' => true })
      channels.select { |_channel, enabled| enabled }.keys
    end

    def create_delivery(notification, channel)
      NotificationDelivery.create!(notification: notification, channel: channel, status: 'pending')
    end
  end
end
