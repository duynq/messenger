module Conversations
  class DirectCreationService
    # Finds or creates a direct conversation between the current user and the target user.
    #
    # @param current_user [User] The user initiating the action
    # @param target_user_id [Integer, String] The ID of the user to chat with
    # @return [Result]
    def self.call(current_user, target_user_id)
      target_user = User.find_by(id: target_user_id)

      if target_user.nil?
        return Result.failure({ message: 'User not found', status: :not_found })
      end

      if target_user.id == current_user.id
        return Result.failure({ message: 'Cannot start a conversation with yourself', status: :unprocessable_entity })
      end

      conversation = Conversation.find_or_create_direct_message(current_user, target_user)

      Result.success(conversation)
    rescue => e
      Rails.logger.error("[Conversations::DirectCreationService] #{e.message}")
      Result.failure({ message: 'Failed to create conversation', status: :internal_server_error })
    end
  end
end
