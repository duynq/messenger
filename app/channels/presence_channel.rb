class PresenceChannel < ApplicationCable::Channel
  def subscribed
    stream_from "presence_channel"
    
    if current_user
      count = Rails.cache.increment("user_#{current_user.id}_connections", 1) || 1
      if count == 1
        current_user.update!(last_seen_at: Time.current)
        ActionCable.server.broadcast("presence_channel", {
          user_id: current_user.id,
          status: 'online'
        })
      end
    end
  end

  def unsubscribed
    if current_user
      count = Rails.cache.decrement("user_#{current_user.id}_connections", 1) || 0
      count = 0 if count < 0
      
      if count == 0
        current_user.update!(last_seen_at: Time.current)
        ActionCable.server.broadcast("presence_channel", {
          user_id: current_user.id,
          status: 'offline',
          last_seen_at: Time.current
        })
      end
    end
  end
end
