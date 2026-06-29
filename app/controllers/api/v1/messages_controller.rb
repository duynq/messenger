module Api
  module V1
    class MessagesController < ApplicationController
      before_action :authenticate_user!
      before_action :set_conversation
      before_action :set_message, only: [:destroy, :update, :react]

      def index
        return render_unauthorized unless @conversation.users.include?(Current.user)

        update_last_read
        messages = fetch_messages.to_a
        render json: index_payload(messages), status: :ok
      end

      def create
        result = Messages::CreationService.call(
          conversation: @conversation, user: Current.user, content: message_params[:content], reply_to_id: message_params[:reply_to_id]
        )
        render_service_result(result, :created) { |value| { message: MessageBlueprint.render_as_hash(value) } }
      end

      def update
        result = Messages::UpdateService.call(message: @message, user: Current.user, content: message_params[:content])
        render_service_result(result, :ok) { |value| { message: MessageBlueprint.render_as_hash(value) } }
      end

      def react
        result = Messages::ReactionService.call(message: @message, user: Current.user, emoji: params[:emoji])
        render_service_result(result, :ok) { |value| { message: MessageBlueprint.render_as_hash(value) } }
      end

      def destroy
        result = Messages::DeletionService.call(message: @message, user: Current.user)
        render_service_result(result, :ok) { { success: true } }
      end

      private

      def render_unauthorized
        render json: { error: I18n.t('errors.unauthorized') }, status: :forbidden
      end

      def render_service_result(result, success_status)
        if result.success?
          render json: yield(result.value), status: success_status
        else
          render json: { error: result.error[:message] }, status: result.error[:status]
        end
      end

      def update_last_read
        participant = @conversation.conversation_participants.find_by(user_id: Current.user.id)
        participant&.update(last_read_at: Time.current)
      end

      def fetch_messages
        scope = @conversation.messages.includes(:user).order(id: :desc)
        scope = scope.where('id < ?', params[:before_message_id]) if params[:before_message_id].present?
        scope.limit(20)
      end

      def check_has_next(messages)
        messages.any? && @conversation.messages.where('id < ?', messages.last.id).exists?
      end

      def index_payload(messages)
        {
          messages: MessageBlueprint.render_as_hash(messages),
          meta: { has_next: check_has_next(messages), next_cursor: messages.last&.id },
          conversation: ConversationBlueprint.render_as_hash(@conversation, view: :with_participants)
        }
      end

      def message_params
        params.require(:message).permit(:content, :reply_to_id)
      end

      def set_conversation
        @conversation = Conversation.find(params[:conversation_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: I18n.t('errors.conversation_not_found') }, status: :not_found
      end

      def set_message
        @message = @conversation.messages.find_by(id: params[:id])
        return render json: { error: I18n.t('errors.message_not_found') }, status: :not_found unless @message
      end
    end
  end
end
