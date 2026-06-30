class ConversationParticipant < ApplicationRecord
  belongs_to :user
  belongs_to :conversation

  def muted?
    muted_at.present?
  end
end
