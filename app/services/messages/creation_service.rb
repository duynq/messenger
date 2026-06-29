module Messages
  class CreationService
    def self.call(conversation:, user:, content:, reply_to_id: nil, attachments: [])
      new(conversation: conversation, user: user, content: content, reply_to_id: reply_to_id, attachments: attachments).call
    end

    def initialize(conversation:, user:, content:, reply_to_id: nil, attachments: [])
      @conversation = conversation
      @user = user
      @content = content
      @reply_to_id = reply_to_id
      @attachments = attachments || []
    end

    def call
      return validation_error if validation_error

      process_creation
    rescue => e
      Result.failure(error_payload(e.message, :unprocessable_entity))
    end

    private

    def process_creation
      message = create_message_and_update_conversation
      broadcast_new_message(message)
      Result.success(message)
    end

    def validation_error
      return unauthorized_error unless authorized?
      return invalid_content_error if @content.blank? && @attachments.blank?

      invalid_reply_error unless valid_reply?
    end

    def authorized?
      @conversation.users.include?(@user)
    end

    def valid_reply?
      return true if @reply_to_id.blank?

      replied_msg = Message.find_by(id: @reply_to_id)
      replied_msg.present? && replied_msg.conversation_id == @conversation.id && !replied_msg.deleted?
    end

    def unauthorized_error
      Result.failure(error_payload(I18n.t('errors.unauthorized'), :forbidden))
    end

    def invalid_content_error
      Result.failure(error_payload('Content cannot be empty', :unprocessable_entity))
    end

    def invalid_reply_error
      Result.failure(error_payload(I18n.t('errors.invalid_reply_message', default: 'Invalid reply message'), :unprocessable_entity))
    end

    def error_payload(msg, status)
      { message: msg, status: status }
    end

    def create_message_and_update_conversation
      message = @conversation.messages.new(user: @user, content: @content || "", reply_to_id: @reply_to_id)
      message.attachments = @attachments if @attachments.present?
      message.save!
      
      @conversation.update_column(:last_message_at, message.created_at)
      message
    end

    def broadcast_new_message(message)
      message_hash = MessageBlueprint.render_as_hash(message)

      broadcast_to_conversation(message_hash)
      broadcast_to_users(message, message_hash)
    end

    def broadcast_to_conversation(message_hash)
      ActionCable.server.broadcast("conversation_#{@conversation.id}", { message: message_hash })
    end

    def broadcast_to_users(message, message_hash)
      preview = last_message_preview(message)
      @conversation.users.each do |u|
        ActionCable.server.broadcast("user_#{u.id}_conversations", new_message_payload(message_hash, preview))
      end
    end

    def last_message_preview(message)
      display_content = @content.presence || "[ #{I18n.t('chat.attachment', default: 'Attachment')} ]"
      { content: display_content.truncate(50), sender_name: @user.full_name, created_at: message.created_at }
    end

    def new_message_payload(message_hash, preview)
      { action: 'new_message', conversation_id: @conversation.id, message: message_hash, last_message: preview }
    end
  end
end
