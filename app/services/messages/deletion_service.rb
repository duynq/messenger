module Messages
  class DeletionService
    def self.call(message:, user:)
      new(message: message, user: user).call
    end

    def initialize(message:, user:)
      @message = message
      @user = user
    end

    def call
      return unauthorized_error unless authorized?

      if @message.soft_delete
        broadcast_deletion
        Result.success(@message)
      else
        Result.failure(error_payload('Failed to delete message', :unprocessable_entity))
      end
    rescue => e
      Result.failure(error_payload(e.message, :unprocessable_entity))
    end

    private

    def authorized?
      MessagePolicy.new(@user, @message).destroy?
    end

    def unauthorized_error
      Result.failure(error_payload(I18n.t('errors.unauthorized'), :forbidden))
    end

    def error_payload(msg, status)
      { message: msg, status: status }
    end

    def broadcast_deletion
      broadcast_to_conversation
      broadcast_to_users
    end

    def broadcast_to_conversation
      ActionCable.server.broadcast(
        "conversation_#{@message.conversation_id}",
        { action: 'message_deleted', message_id: @message.id }
      )
    end

    def broadcast_to_users
      @message.conversation.users.each do |u|
        ActionCable.server.broadcast(
          "user_#{u.id}_conversations",
          { action: 'message_deleted', conversation_id: @message.conversation_id, message_id: @message.id }
        )
      end
    end
  end
end
