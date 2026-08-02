module Api
  module V1
    class MessagesController < ApplicationController
      include MessageAuthorization

      wrap_parameters false

      before_action :authenticate_user!
      before_action :set_authorized_conversation
      before_action :set_authorized_message, only: [:destroy, :update, :react]
      after_action :verify_authorized
      after_action :verify_policy_scoped

      def index
        mark_conversation_as_read unless params[:before_message_id].present?
        messages = fetch_messages.to_a
        render json: index_payload(messages), status: :ok
      end

      def create
        result = Messages::CreationService.call(
          conversation: @conversation, 
          user: Current.user, 
          content: message_params[:content], 
          reply_to_id: message_params[:reply_to_id],
          attachments: message_params[:attachments]
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

      def render_service_result(result, success_status)
        if result.success?
          render json: yield(result.value), status: success_status
        else
          render json: { error: result.error[:message] }, status: result.error[:status]
        end
      end

      def mark_conversation_as_read
        Conversations::MarkAsReadService.call(conversation: @conversation, user: Current.user)
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
        params.require(:message).permit(:content, :reply_to_id, attachments: [])
      end
    end
  end
end
