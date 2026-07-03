class Message < ApplicationRecord
  include SoftDeletable

  belongs_to :conversation
  belongs_to :user
  belongs_to :reply_to, class_name: 'Message', optional: true
  has_many :replies, class_name: 'Message', foreign_key: 'reply_to_id'
  has_many :reactions, class_name: 'MessageReaction', dependent: :destroy
  has_many_attached :attachments

  enum message_type: { user: 'user', system: 'system' }

  searchkick word_start: [:content],
             highlight: [:content],
             callbacks: :async

  scope :search_import, -> { active }

  def search_data
    {
      content: content,
      conversation_id: conversation_id,
      user_id: user_id,
      message_type: message_type,
      created_at: created_at
    }
  end

  def should_index?
    deleted_at.nil? && message_type == "user"
  end

  validates :content, presence: true, if: -> { user? && !attachments.attached? }
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
