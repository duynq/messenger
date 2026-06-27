class ConversationBlueprint < Blueprinter::Base
  identifier :id

  fields :is_group, :name, :admin_id, :created_at

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
