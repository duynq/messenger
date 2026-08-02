module Messages
  class UpdateService
    def self.call(message:, user:, content:)
      new(message: message, user: user, content: content).call
    end

    def initialize(message:, user:, content:)
      @message = message
      @user = user
      @content = content
    end

    def call
      return unauthorized_error unless authorized?
      return time_exceeded_error if time_limit_exceeded?
      return invalid_content_error if @content.blank?

      update_message
      broadcast_updated_message
      Result.success(@message)
    rescue => e
      Result.failure(error_payload(e.message, :unprocessable_entity))
    end

    private

    def authorized?
      MessagePolicy.new(@user, @message).update?
    end

    def time_limit_exceeded?
      @message.created_at < 15.minutes.ago
    end

    def update_message
      @message.update!(content: @content, edited_at: Time.current)
    end

    def broadcast_updated_message
      message_hash = MessageBlueprint.render_as_hash(@message)
      
      broadcast_to_conversation(message_hash)
      broadcast_to_users(message_hash)
    end

    def broadcast_to_conversation(message_hash)
      ActionCable.server.broadcast("conversation_#{@message.conversation_id}", { action: 'message_updated', message: message_hash })
    end

    def broadcast_to_users(message_hash)
      preview = last_message_preview
      @message.conversation.users.each do |u|
        ActionCable.server.broadcast("user_#{u.id}_conversations", updated_message_payload(message_hash, preview))
      end
    end

    def last_message_preview
      { content: @content.truncate(50), sender_name: @user.full_name, created_at: @message.created_at, edited_at: @message.edited_at }
    end

    def updated_message_payload(message_hash, preview)
      { action: 'message_updated', conversation_id: @message.conversation_id, message: message_hash, last_message: preview }
    end

    def unauthorized_error
      Result.failure(error_payload(I18n.t('errors.unauthorized'), :forbidden))
    end

    def time_exceeded_error
      Result.failure(error_payload(I18n.t('errors.edit_time_exceeded'), :unprocessable_entity))
    end

    def invalid_content_error
      Result.failure(error_payload('Content cannot be empty', :unprocessable_entity))
    end

    def error_payload(msg, status)
      { message: msg, status: status }
    end
  end
end
