module Messages
  class ReactionService
    def self.call(message:, user:, emoji:)
      new(message: message, user: user, emoji: emoji).call
    end

    def initialize(message:, user:, emoji:)
      @message = message
      @user = user
      @emoji = emoji
    end

    def call
      return invalid_emoji_error unless valid_emoji?

      toggle_reaction
      broadcast_update
      Result.success(@message)
    rescue => e
      Result.failure(error_payload(e.message, :unprocessable_entity))
    end

    private

    def valid_emoji?
      MessageReaction::ALLOWED_EMOJIS.include?(@emoji)
    end

    def toggle_reaction
      existing_reaction = @message.reactions.find_by(user_id: @user.id)

      if existing_reaction
        handle_existing_reaction(existing_reaction)
      else
        create_new_reaction
      end
    end

    def handle_existing_reaction(reaction)
      if reaction.emoji == @emoji
        reaction.destroy!
      else
        reaction.update!(emoji: @emoji)
      end
    end

    def create_new_reaction
      @message.reactions.create!(user: @user, emoji: @emoji)
    end

    def broadcast_update
      message_hash = MessageBlueprint.render_as_hash(@message)
      ActionCable.server.broadcast("conversation_#{@message.conversation_id}", {
        action: 'message_updated',
        conversation_id: @message.conversation_id,
        message: message_hash
      })
    end

    def invalid_emoji_error
      Result.failure(error_payload('Invalid emoji', :unprocessable_entity))
    end

    def error_payload(msg, status)
      { message: msg, status: status }
    end
  end
end
