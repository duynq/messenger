module Api
  module V1
    class NotificationPreferencesController < ApplicationController
      before_action :authenticate_user!

      def show
        render json: {
          preferences: Current.user.notification_preferences
        }, status: :ok
      end

      def update
        Current.user.update!(notification_preferences: merged_preferences)

        Rails.cache.delete("user_prefs:#{Current.user.id}")

        render json: {
          preferences: Current.user.notification_preferences
        }, status: :ok
      end

      private

      def merged_preferences
        current = Current.user.notification_preferences || {}
        current.deep_merge(preferences_params.to_h)
      end

      def preferences_params
        params.permit(
          channels: {},
          types: {},
          email_digest: nil,
          quiet_hours: [:enabled, :start, :end, :timezone]
        )
      end
    end
  end
end
