module Api
  module V1
    class ParticipantsController < ApplicationController
      before_action :authenticate_user!
      before_action :set_conversation

      def create
        result = Conversations::ParticipantsManageService.add(Current.user, @conversation, params[:user_id])

        if result.success?
          render json: {
            user: UserBlueprint.render_as_hash(result.value)
          }, status: :ok
        else
          render json: { error: result.error[:message] || result.error }, status: result.error[:status] || :unprocessable_entity
        end
      end

      def destroy
        result = Conversations::ParticipantsManageService.remove(Current.user, @conversation, params[:id])

        if result.success?
          head :no_content
        else
          render json: { error: result.error[:message] || result.error }, status: result.error[:status] || :unprocessable_entity
        end
      end

      private

      def set_conversation
        @conversation = Conversation.find(params[:conversation_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Conversation not found' }, status: :not_found
      end
    end
  end
end
