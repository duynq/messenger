class MessageReaction < ApplicationRecord
  ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'].freeze

  belongs_to :message
  belongs_to :user

  validates :emoji, presence: true, inclusion: { in: ALLOWED_EMOJIS }
  validates :user_id, uniqueness: { scope: :message_id }
end
