class ConversationBlueprint < Blueprinter::Base
  identifier :id

  fields :is_group, :name, :admin_id, :created_at, :last_message_at

  field :last_message do |conversation, _options|
    msg = conversation.messages.includes(:user).order(id: :desc).first
    if msg
      {
        content: msg.deleted? ? nil : msg.content.truncate(50),
        deleted: msg.deleted?,
        edited_at: msg.edited_at,
        sender_name: msg.user.full_name,
        created_at: msg.created_at
      }
    end
  end

  field :unread_count do |conversation, _options|
    participant = conversation.conversation_participants.find { |cp| cp.user_id == Current.user&.id } || conversation.conversation_participants.find_by(user_id: Current.user&.id)
    if participant
      if participant.last_read_at
        conversation.messages.where('created_at > ?', participant.last_read_at).count
      else
        conversation.messages.count
      end
    else
      0
    end
  end

  view :with_participants do
    association :users, blueprint: UserBlueprint
  end
end
