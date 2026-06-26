module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_user!

      def index
        # Fetch users except current user
        users_scope = User.where.not(id: Current.user.id)
        
        # Cache the count for 1 hour to prevent slow COUNT(*) queries on every page load
        total_users = Rails.cache.fetch("total_users_count", expires_in: 1.hour) do
          User.count
        end
        count = total_users > 0 ? total_users - 1 : 0
        
        # Use extracted concern for high-performance Pagy + Deferred Join
        @pagy, users = paginate_with_deferred(users_scope, count: count)

        render json: {
          users: UserBlueprint.render_as_hash(users, view: :with_email_and_storage),
          meta: pagination_meta(@pagy)
        }, status: :ok
      end
    end
  end
end
