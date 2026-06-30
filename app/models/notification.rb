class Notification < ApplicationRecord
  # ──────────────────────────────────────────────
  # Associations
  # ──────────────────────────────────────────────
  belongs_to :user
  belongs_to :actor, class_name: 'User', optional: true
  belongs_to :notifiable, polymorphic: true

  has_many :notification_deliveries, dependent: :destroy

  # ──────────────────────────────────────────────
  # Validations
  # ──────────────────────────────────────────────
  TYPES = %w[
    new_message mention added_to_group
    removed_from_group group_renamed admin_transferred
  ].freeze

  validates :notification_type, presence: true, inclusion: { in: TYPES }

  # ──────────────────────────────────────────────
  # Scopes
  # ──────────────────────────────────────────────
  scope :unread, -> { where(read_at: nil) }
  scope :for_type, ->(type) { where(notification_type: type) }
  scope :recent, -> { order(created_at: :desc) }

  # ──────────────────────────────────────────────
  # Instance methods
  # ──────────────────────────────────────────────
  def read?
    read_at.present?
  end

  def mark_as_read!
    update!(read_at: Time.current) unless read?
  end
end
