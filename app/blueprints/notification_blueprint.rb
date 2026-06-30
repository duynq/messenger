class NotificationBlueprint < Blueprinter::Base
  identifier :id

  fields :notification_type, :data, :read_at, :created_at

  field :actor do |notification, _options|
    if notification.actor
      {
        id: notification.actor.id,
        full_name: notification.actor.full_name,
        avatar_url: notification.actor.avatar.attached? ?
          Rails.application.routes.url_helpers.rails_representation_url(
            notification.actor.avatar.variant(resize_to_limit: [100, 100]).processed
          ) : nil
      }
    end
  end
end
