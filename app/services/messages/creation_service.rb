module Messages
  class CreationService
    def self.call(conversation:, user:, content:)
      new(conversation: conversation, user: user, content: content).call
    end

    def initialize(conversation:, user:, content:)
      @conversation = conversation
      @user = user
      @content = content
    end

    def call
      return Result.failure({ message: 'Unauthorized', status: :forbidden }) unless @conversation.users.include?(@user)
      return Result.failure({ message: 'Content cannot be empty', status: :unprocessable_entity }) if @content.blank?

      message = @conversation.messages.create!(user: @user, content: @content)
      @conversation.update_column(:last_message_at, message.created_at)

      message_hash = MessageBlueprint.render_as_hash(message)

      last_message_preview = {
        content: @content.truncate(50),
        sender_name: @user.full_name,
        created_at: message.created_at
      }

      ActionCable.server.broadcast(
        "conversation_#{@conversation.id}",
        { message: message_hash }
      )

      @conversation.users.each do |u|
        ActionCable.server.broadcast(
          "user_#{u.id}_conversations",
          {
            action: 'new_message',
            conversation_id: @conversation.id,
            message: message_hash,
            last_message: last_message_preview
          }
        )
      end

      Result.success(message)
    rescue => e
      Result.failure({ message: e.message, status: :unprocessable_entity })
    end
  end
end
