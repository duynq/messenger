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
      return Result.failure({ message: 'Unauthorized', status: :forbidden }) unless @message.user_id == @user.id

      if @message.soft_delete
        conversation_id = @message.conversation_id
        
        ActionCable.server.broadcast(
          "conversation_#{conversation_id}",
          { action: 'message_deleted', message_id: @message.id }
        )

        @message.conversation.users.each do |u|
          ActionCable.server.broadcast(
            "user_#{u.id}_conversations",
            {
              action: 'message_deleted',
              conversation_id: conversation_id,
              message_id: @message.id
            }
          )
        end

        Result.success(@message)
      else
        Result.failure({ message: 'Failed to delete message', status: :unprocessable_entity })
      end
    rescue => e
      Result.failure({ message: e.message, status: :unprocessable_entity })
    end
  end
end
