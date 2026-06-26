module Conversations
  class GroupCreationService
    def self.call(admin, name, user_ids)
      new(admin, name, user_ids).call
    end

    def initialize(admin, name, user_ids)
      @admin = admin
      @name = name
      @user_ids = Array(user_ids)
    end

    def call
      return Result.failure(status: :bad_request, message: 'Group name is required') if @name.blank?
      
      # Include admin in the group
      all_user_ids = (@user_ids + [@admin.id]).uniq

      return Result.failure(status: :bad_request, message: 'Group requires at least 2 members') if all_user_ids.size < 2

      users = User.where(id: all_user_ids)
      
      return Result.failure(status: :bad_request, message: 'Some users were not found') if users.size != all_user_ids.size

      conversation = nil

      ActiveRecord::Base.transaction do
        conversation = Conversation.create!(
          is_group: true,
          name: @name,
          admin: @admin
        )

        participants = users.map do |user|
          { user_id: user.id, conversation_id: conversation.id, created_at: Time.current, updated_at: Time.current }
        end
        
        ConversationParticipant.insert_all!(participants)
      end

      Result.success(conversation)
    rescue => e
      Result.failure(status: :unprocessable_entity, message: e.message)
    end
  end
end
