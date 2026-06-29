class Message < ApplicationRecord
  include SoftDeletable

  belongs_to :conversation
  belongs_to :user
  belongs_to :reply_to, class_name: 'Message', optional: true
  has_many :replies, class_name: 'Message', foreign_key: 'reply_to_id'
  has_many :reactions, class_name: 'MessageReaction', dependent: :destroy
  has_many_attached :attachments

  validate :acceptable_attachments
  
  private

  def acceptable_attachments
    return unless attachments.attached?

    acceptable_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    
    attachments.each do |attachment|
      unless attachment.byte_size <= 10.megabytes
        errors.add(:attachments, "is too big. Max size is 10MB.")
      end

      unless acceptable_types.include?(attachment.content_type)
        errors.add(:attachments, "must be a JPEG, PNG, GIF, WebP, PDF or Word document")
      end
    end
  end
end
