class NotificationChannel < ApplicationCable::Channel
  def subscribed
    stream_from "notification_user_#{current_user.id}"

    send_snapshot
  end

  def unsubscribed
    # Cleanup when channel is unsubscribed
  end

  private

  def send_snapshot
    count = current_user.notifications.unread.count

    transmit({ type: 'snapshot', unread_count: count })
  end
end
