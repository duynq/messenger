module Api
  module V1
    class ConversationsController < ApplicationController
      before_action :authenticate_user!

      def direct
        target_user = User.find_by(id: params[:user_id])
        
        unless target_user
          return render json: { error: 'User not found' }, status: :not_found
        end

        if target_user.id == Current.user.id
          return render json: { error: 'Cannot start a conversation with yourself' }, status: :unprocessable_entity
        end

        conversation = Conversation.find_or_create_direct_message(Current.user, target_user)

        render json: {
          conversation: ConversationBlueprint.render_as_hash(conversation, view: :with_participants)
        }, status: :ok
      end
    end
  end
end
