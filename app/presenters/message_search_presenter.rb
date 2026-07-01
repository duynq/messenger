class MessageSearchPresenter
  def initialize(message, view_context)
    @message = message
    @view_context = view_context
  end

  def as_json(*)
    {
      id: @message.id,
      conversation_id: @message.conversation_id,
      content: @message.content,
      snippet: @message.attributes['snippet'],
      created_at: @message.created_at,
      user: {
        id: @message.user.id,
        full_name: @message.user.full_name,
        email: @message.user.email,
        avatar_url: @message.user.avatar.attached? ? Rails.application.routes.url_helpers.rails_representation_url(@message.user.avatar.variant(resize_to_limit: [100, 100]).processed) : nil
      }
    }
  end

  def self.format_messages(messages, view_context)
    messages.map { |msg| new(msg, view_context).as_json }
  end
end
