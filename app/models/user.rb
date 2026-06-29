class User < ApplicationRecord
  devise :database_authenticatable, :registerable, :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  # ──────────────────────────────────────────────
  # Associations — add your own here
  # ──────────────────────────────────────────────
  has_many :conversation_participants, dependent: :destroy
  has_many :conversations, through: :conversation_participants
  has_many :messages, dependent: :destroy

  has_one_attached :avatar

  # ──────────────────────────────────────────────
  # Validations
  # ──────────────────────────────────────────────
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :first_name, presence: true
  validates :last_name, presence: true
  validate :acceptable_avatar

  # ──────────────────────────────────────────────
  # Instance methods
  # ──────────────────────────────────────────────
  def full_name
    "#{first_name} #{last_name}"
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
