module Api
  module V1
    class ConversationsController < ApplicationController
      before_action :authenticate_user!

      def index
        scope = Current.user.conversations
        count = scope.count
        
        @pagy, conversations = paginate_with_deferred(
          scope,
          count: count,
          includes: :users,
          order: { created_at: :desc, id: :desc }
        )

        render json: {
          conversations: ConversationBlueprint.render_as_hash(conversations, view: :with_participants),
          meta: pagination_meta(@pagy)
        }, status: :ok
      end

      def direct
        result = Conversations::DirectCreationService.call(Current.user, params[:user_id])

        if result.success?
          render json: {
            conversation: ConversationBlueprint.render_as_hash(result.value, view: :with_participants)
          }, status: :ok
        else
          render json: { error: result.error[:message] }, status: result.error[:status]
        end
      end
    end
  end
end
