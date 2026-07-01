module Messages
  class SystemMessageService
    def self.create_join(conversation, actor, target_user)
      create_message(conversation, actor, 'join', target_user: target_user.slice(:id, :full_name))
    end

    def self.create_leave(conversation, actor, target_user, is_kicked = false)
      create_message(conversation, actor, is_kicked ? 'remove' : 'leave', target_user: target_user&.slice(:id, :full_name))
    end

    def self.create_rename(conversation, actor, old_name, new_name)
      create_message(conversation, actor, 'rename', old_name: old_name, new_name: new_name)
    end

    def self.create_admin_transfer(conversation, actor, new_admin)
      create_message(conversation, actor, 'admin_transfer', new_admin: new_admin.slice(:id, :full_name))
    end

    private

    def self.create_message(conversation, actor, action, payload = {})
      msg = conversation.messages.create!(
        user: actor,
        message_type: 'system',
        content: nil,
        metadata: { action: action, **payload }
      )
      
      broadcast(msg)
      msg
    end

    def self.broadcast(msg)
      message_hash = MessageBlueprint.render_as_hash(msg)
      
      # Broadcast to the conversation channel (for active chat UI)
      ActionCable.server.broadcast("conversation_#{msg.conversation_id}", { message: message_hash })
      
      # Broadcast to user specific channel (for sidebar/unread updates)
      preview = { content: "[System]", sender_name: msg.user.full_name, created_at: msg.created_at }
      msg.conversation.users.each do |u|
        ActionCable.server.broadcast("user_#{u.id}_conversations", { action: 'new_message', conversation_id: msg.conversation_id, message: message_hash, last_message: preview })
      end
    end
  end
end
