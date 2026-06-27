module Api
  module V1
    class MessagesController < ApplicationController
      before_action :authenticate_user!
      before_action :set_conversation

      def index
        unless @conversation.users.include?(Current.user)
          return render json: { error: 'Unauthorized' }, status: :forbidden
        end

        participant = @conversation.conversation_participants.find_by(user_id: Current.user.id)
        participant&.update(last_read_at: Time.current)

        scope = @conversation.messages.includes(:user).order(id: :desc)

        if params[:before_message_id].present?
          scope = scope.where('id < ?', params[:before_message_id])
        end

        messages = scope.limit(20).to_a
        has_next = messages.any? && @conversation.messages.where('id < ?', messages.last.id).exists?

        render json: {
          messages: MessageBlueprint.render_as_hash(messages),
          meta: {
            has_next: has_next,
            next_cursor: messages.last&.id
          },
          conversation: ConversationBlueprint.render_as_hash(@conversation, view: :with_participants)
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
