class Conversation < ApplicationRecord
  include SoftDeletable

  belongs_to :admin, class_name: 'User', optional: true
  has_many :conversation_participants, dependent: :destroy
  has_many :users, through: :conversation_participants
  has_many :messages, dependent: :destroy

  def self.find_or_create_direct_message(user1, user2)
    conversation = joins(:conversation_participants)
                   .where(is_group: false)
                   .where(conversation_participants: { user_id: [user1.id, user2.id] })
                   .group('conversations.id')
                   .having('COUNT(DISTINCT conversation_participants.user_id) = 2')
                   .first

    return conversation if conversation

    transaction do
      conv = create!(is_group: false)
      conv.conversation_participants.create!([{ user: user1 }, { user: user2 }])
      conv
    end
  end
end
