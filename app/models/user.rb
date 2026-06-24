class User < ApplicationRecord
  devise :database_authenticatable, :registerable, :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  # ──────────────────────────────────────────────
  # Associations — add your own here
  # ──────────────────────────────────────────────
  has_many :posts, dependent: :destroy

  # ──────────────────────────────────────────────
  # Validations
  # ──────────────────────────────────────────────
  validates :first_name, presence: true
  validates :last_name, presence: true

  # ──────────────────────────────────────────────
  # Instance methods
  # ──────────────────────────────────────────────
  def full_name
    "#{first_name} #{last_name}"
  end
end
