module Api
  module V1
    class NotificationsController < ApplicationController
      before_action :authenticate_user!

      def index
        notifications = fetch_notifications
        unread = Current.user.notifications.unread.count
        render json: { notifications: NotificationBlueprint.render_as_hash(notifications), meta: { unread_count: unread } }
      end

      def unread_count
        count = Current.user.notifications.unread.count

        render json: { count: count }, status: :ok
      end

      def read
        notification = Current.user.notifications.find(params[:id])
        notification.mark_as_read!
        broadcast_read(notification)
        render json: { notification: NotificationBlueprint.render_as_hash(notification) }, status: :ok
      end

      def read_all
        updated = Current.user.notifications.unread.update_all(read_at: Time.current)

        broadcast_read_all

        render json: { updated_count: updated }, status: :ok
      end

      def destroy
        notification = Current.user.notifications.find(params[:id])
        notification.destroy!
        render json: { success: true }, status: :ok
      end

      private

      def fetch_notifications
        scope = Current.user.notifications.recent.includes(:actor)
        scope = scope.unread if params[:unread_only] == 'true'
        scope.limit(params.fetch(:per_page, 20).to_i)
      end

      def broadcast_read(notification)
        ActionCable.server.broadcast(
          "notification_user_#{Current.user.id}",
          { type: 'notification_read', notification_id: notification.id }
        )
      end

      def broadcast_read_all
        ActionCable.server.broadcast(
          "notification_user_#{Current.user.id}",
          { type: 'notifications_read_all' }
        )
      end
    end
  end
end
