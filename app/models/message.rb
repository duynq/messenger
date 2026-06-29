class Message < ApplicationRecord
  include SoftDeletable

  belongs_to :conversation
  belongs_to :user
  belongs_to :reply_to, class_name: 'Message', optional: true
  has_many :replies, class_name: 'Message', foreign_key: 'reply_to_id'
  has_many :reactions, class_name: 'MessageReaction', dependent: :destroy
end
