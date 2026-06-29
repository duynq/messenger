class ConversationChannel < ApplicationCable::Channel
  def subscribed
    @conversation = Conversation.find_by(id: params[:conversation_id])
    
    if @conversation && @conversation.users.include?(current_user)
      stream_from "conversation_#{@conversation.id}"
    else
      reject
    end
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end

  def typing
    return unless @conversation

    ActionCable.server.broadcast(
      "conversation_#{@conversation.id}",
      {
        type: 'typing',
        user_id: current_user.id,
        user_name: current_user.full_name
      }
    )
  end
end
