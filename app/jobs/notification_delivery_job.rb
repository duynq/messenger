class NotificationDeliveryJob < ApplicationJob
  queue_as :notifications

  def perform(delivery_id)
    delivery = NotificationDelivery.find(delivery_id)
    return if delivery.delivered?

    deliver(delivery)
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn "NotificationDelivery #{delivery_id} not found, skipping"
  end

  private

  def deliver(delivery)
    delivery.update!(status: 'processing')
    send_by_channel(delivery)
    delivery.mark_delivered!
  rescue StandardError => e; handle_failure(delivery, e)
  end

  def send_by_channel(delivery)
    case delivery.channel
    when 'in_app'
      deliver_in_app(delivery.notification)
    end
  end

  def deliver_in_app(notification)
    broadcast_notification(notification)
    broadcast_unread_count(notification)
  end

  def broadcast_notification(notification)
    ActionCable.server.broadcast(
      "notification_user_#{notification.user_id}",
      {
        type: 'notification',
        notification: NotificationBlueprint.render_as_hash(notification)
      }
    )
  end

  def broadcast_unread_count(notification)
    count = notification.user.notifications.unread.count

    ActionCable.server.broadcast(
      "notification_user_#{notification.user_id}",
      { type: 'unread_count_updated', count: count }
    )
  end

  def handle_failure(delivery, error)
    delivery.increment!(:attempts)
    new_status = delivery.attempts >= delivery.max_attempts ? 'failed' : 'pending'
    delivery.update!(last_error: error.message, status: new_status)
  end
end
