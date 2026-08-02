class MessagePolicy < ApplicationPolicy
  def access?
    participant?
  end

  def index?
    access?
  end

  alias create? index?
  alias react? index?

  def update?
    access? && owns_message?
  end

  alias destroy? update?

  private

  def participant?
    return false if user.nil? || conversation.nil? || conversation.deleted?

    MessagePolicy::Scope.new(user, Conversation).resolve.where(id: conversation.id).exists?
  end

  def owns_message?
    record.is_a?(Message) && record.user_id == user.id
  end

  def conversation
    record.is_a?(Message) ? record.conversation : record
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      scope
        .active
        .joins(:conversation_participants)
        .where(conversation_participants: { user_id: user.id })
    end
  end
end
