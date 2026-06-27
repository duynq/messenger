class PresenceChannel < ApplicationCable::Channel
  def subscribed
    stream_from "presence_channel"
    
    if current_user
      current_user.update!(last_seen_at: Time.current)
      ActionCable.server.broadcast("presence_channel", {
        user_id: current_user.id,
        status: 'online'
      })
    end
  end

  def unsubscribed
    if current_user
      current_user.update!(last_seen_at: Time.current)
      ActionCable.server.broadcast("presence_channel", {
        user_id: current_user.id,
        status: 'offline',
        last_seen_at: Time.current
      })
    end
  end
end
