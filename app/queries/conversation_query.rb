class ConversationQuery
  def initialize(relation = Conversation.all)
    @relation = relation
  end

  def active
    time_threshold = [Time.current.beginning_of_day, 1.hour.ago].min
    @relation.where(id: Message.where('created_at >= ?', time_threshold).select(:conversation_id))
  end
end
