class NotificationDeliveryJob
  include Sidekiq::Job

  sidekiq_options(
    queue: :notifications,
    retry: 3,
    dead: true,
    backtrace: true
  )

  # Retry with exponential backoff
  sidekiq_retry_in do |count, _exception|
    (count ** 4) + 15 + (rand(10) * (count + 1))
  end

  def perform(delivery_id)
    delivery = NotificationDelivery.find(delivery_id)
    return if delivery.delivered?

    lock_key = "notif_delivery:#{delivery_id}"
    redis = Kredis.redis

    unless redis.set(lock_key, "1", nx: true, ex: 30)
      Rails.logger.info "Lock contention for delivery #{delivery_id}, skipping"
      return
    end

    begin
      # Double check after acquiring lock
      delivery.reload
      return if delivery.delivered?

      delivery.update!(status: 'processing')
      send_by_channel(delivery)
      delivery.mark_delivered!
    ensure
      redis.del(lock_key)
    end
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn "NotificationDelivery #{delivery_id} not found, skipping"
  rescue StandardError => e
    handle_failure(delivery, e) if delivery
    raise e # Re-raise to trigger Sidekiq retry mechanism
  end

  private

  def send_by_channel(delivery)
    case delivery.channel
    when 'in_app'
      deliver_in_app(delivery.notification)
    end
  end

  def deliver_in_app(notification)
    broadcast_notification(notification)
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
