class PushSubscription < ApplicationRecord
  # ──────────────────────────────────────────────
  # Associations
  # ──────────────────────────────────────────────
  belongs_to :user

  # ──────────────────────────────────────────────
  # Validations
  # ──────────────────────────────────────────────
  validates :endpoint, presence: true, uniqueness: true
  validates :p256dh_key, presence: true
  validates :auth_key, presence: true

  # ──────────────────────────────────────────────
  # Scopes
  # ──────────────────────────────────────────────
  scope :active, -> { where(active: true) }
end
