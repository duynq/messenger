module Api
  module V1
    class MessagesController < ApplicationController
      before_action :authenticate_user!
      before_action :set_conversation

      def index
        unless @conversation.users.include?(Current.user)
          return render json: { error: 'Unauthorized' }, status: :forbidden
        end

        scope = @conversation.messages.includes(:user)
        count = scope.count
        
        @pagy, messages = paginate_with_deferred(
          scope,
          count: count,
          includes: :user,
          order: { created_at: :desc, id: :desc }
        )

        render json: {
          messages: MessageBlueprint.render_as_hash(messages),
          meta: pagination_meta(@pagy)
        }, status: :ok
      end

      def create
        result = Messages::CreationService.call(
          conversation: @conversation,
          user: Current.user,
          content: message_params[:content]
        )

        if result.success?
          render json: { message: MessageBlueprint.render_as_hash(result.value) }, status: :created
        else
          render json: { error: result.error[:message] }, status: result.error[:status]
        end
      end

      private

      def message_params
        params.require(:message).permit(:content)
      end

      def set_conversation
        @conversation = Conversation.find(params[:conversation_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Conversation not found' }, status: :not_found
      end
    end
  end
end
