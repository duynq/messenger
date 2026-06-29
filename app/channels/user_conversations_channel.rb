class UserConversationsChannel < ApplicationCable::Channel
  def subscribed
    stream_from "user_#{current_user.id}_conversations"
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end
end
