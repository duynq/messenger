class Conversation < ApplicationRecord
  include SoftDeletable

  belongs_to :admin, class_name: 'User', optional: true
  has_many :conversation_participants, dependent: :destroy
  has_many :users, through: :conversation_participants
  has_many :messages, dependent: :destroy

  has_one_attached :avatar
  validate :acceptable_avatar

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

  def last_message
    return if last_message_at.nil?

    messages.includes(:user).order(id: :desc).first
  end

  private

  def acceptable_avatar
    return unless avatar.attached?

    unless avatar.byte_size <= 5.megabytes
      errors.add(:avatar, "is too big. Max size is 5MB.")
    end

    acceptable_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    unless acceptable_types.include?(avatar.content_type)
      errors.add(:avatar, "must be a JPEG, PNG, WebP, or GIF")
    end
  end
end
