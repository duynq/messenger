class ConversationBlueprint < Blueprinter::Base
  identifier :id

  fields :is_group, :name, :admin_id, :created_at, :last_message_at

  field :avatar_url do |conversation, _options|
    if conversation.avatar.attached?
      Rails.application.routes.url_helpers.rails_representation_url(conversation.avatar.variant(resize_to_limit: [100, 100]).processed)
    end
  end

  field :last_message do |conversation, _options|
    msg = conversation.last_message
    if msg
      {
        content: msg.deleted? ? nil : (msg.system? ? '[System]' : msg.content.to_s.truncate(50)),
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

  field :read_receipts do |conversation, _options|
    conversation.conversation_participants.each_with_object({}) do |cp, hash|
      hash[cp.user_id] = cp.last_read_at
    end
  end

  field :is_muted do |conversation, _options|
    participant = conversation.conversation_participants.find { |cp| cp.user_id == Current.user&.id }
    participant&.muted? || false
  end

  view :with_participants do
    association :users, blueprint: UserBlueprint
  end
end
