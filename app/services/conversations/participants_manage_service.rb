module Conversations
  class ParticipantsManageService
    def self.add(current_user, conversation, user_id)
      return Result.failure(status: :forbidden, message: 'Only admin can add members') unless conversation.admin_id == current_user.id
      return Result.failure(status: :bad_request, message: 'Not a group conversation') unless conversation.is_group?

      user = User.find_by(id: user_id)
      return Result.failure(status: :not_found, message: 'User not found') unless user
      
      if conversation.users.include?(user)
        return Result.failure(status: :bad_request, message: 'User is already a member')
      end

      conversation.conversation_participants.create!(user: user)
      
      Result.success(user)
    rescue => e
      Result.failure(status: :unprocessable_entity, message: e.message)
    end

    def self.remove(current_user, conversation, user_id)
      target_user_id = user_id.to_i

      # Logic: 
      # 1. User can leave voluntarily (current_user.id == target_user_id)
      # 2. Admin can remove others (current_user.id == conversation.admin_id)
      is_leaving = current_user.id == target_user_id
      is_admin = current_user.id == conversation.admin_id

      unless is_leaving || is_admin
        return Result.failure(status: :forbidden, message: 'Not authorized to remove this member')
      end

      return Result.failure(status: :bad_request, message: 'Not a group conversation') unless conversation.is_group?
      return Result.failure(status: :bad_request, message: 'Cannot remove the admin') if target_user_id == conversation.admin_id

      participant = conversation.conversation_participants.find_by(user_id: target_user_id)
      return Result.failure(status: :not_found, message: 'Participant not found') unless participant

      participant.destroy!

      Result.success(true)
    rescue => e
      Result.failure(status: :unprocessable_entity, message: e.message)
    end
  end
end
