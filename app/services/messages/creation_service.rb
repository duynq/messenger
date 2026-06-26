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
      
      Result.success(message)
    rescue => e
      Result.failure({ message: e.message, status: :unprocessable_entity })
    end
  end
end
