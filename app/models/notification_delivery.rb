class NotificationDelivery < ApplicationRecord
  # ──────────────────────────────────────────────
  # Associations
  # ──────────────────────────────────────────────
  belongs_to :notification

  # ──────────────────────────────────────────────
  # Validations
  # ──────────────────────────────────────────────
  CHANNELS = %w[in_app web_push email].freeze
  STATUSES = %w[pending processing delivered failed skipped].freeze

  validates :channel, presence: true, inclusion: { in: CHANNELS }
  validates :status, presence: true, inclusion: { in: STATUSES }

  # ──────────────────────────────────────────────
  # Instance methods
  # ──────────────────────────────────────────────
  def delivered?
    status == 'delivered'
  end

  def failed?
    status == 'failed'
  end

  def mark_delivered!
    update!(status: 'delivered', delivered_at: Time.current)
  end
end
