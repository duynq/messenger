module Api
  module V1
    class ConversationsController < ApplicationController
      before_action :authenticate_user!

      def index
        scope = Current.user.conversations
        scope = ConversationQuery.new(scope).active if params[:filter] == 'active'
        count = scope.count
        
        @pagy, conversations = paginate_with_deferred(
          scope,
          count: count,
          includes: :users,
          order: Arel.sql('last_message_at DESC NULLS LAST, id DESC')
        )

        render json: {
          conversations: ConversationBlueprint.render_as_hash(conversations, view: :with_participants),
          meta: pagination_meta(@pagy)
        }, status: :ok
      end

      def read
        conversation = Current.user.conversations.find(params[:id])
        participant = conversation.conversation_participants.find_by(user_id: Current.user.id)

        if participant&.update(last_read_at: Time.current)
          ActionCable.server.broadcast(
            "conversation_#{conversation.id}",
            {
              action: 'read_receipt',
              user_id: Current.user.id,
              last_read_at: participant.last_read_at
            }
          )
        end

        render json: { success: true }
      end

      def update
        conversation = Current.user.conversations.find(params[:id])

        if conversation.is_group && conversation.admin_id == Current.user.id
          old_name = conversation.name

          if conversation.update(conversation_params)
            # Trigger system messages if needed
            if conversation.saved_change_to_name?
              Messages::SystemMessageService.create_rename(conversation, Current.user, old_name, conversation.name)
            end

            # Broadcast update
            payload = {
              action: 'group_updated',
              conversation: ConversationBlueprint.render_as_hash(conversation, view: :with_participants)
            }

            conversation.users.each do |u|
              ActionCable.server.broadcast("user_#{u.id}_conversations", payload)
            end

            # Also broadcast to the active chat channel
            ActionCable.server.broadcast("conversation_#{conversation.id}", payload)

            render json: {
              success: true,
              conversation: ConversationBlueprint.render_as_hash(conversation, view: :with_participants)
            }
          else
            render json: { error: conversation.errors.full_messages.join(", ") }, status: :unprocessable_entity
          end
        else
          render json: { error: "Not authorized" }, status: :forbidden
        end
      end

      def transfer_admin
        conversation = Current.user.conversations.find(params[:id])

        unless conversation.is_group && conversation.admin_id == Current.user.id
          return render json: { error: "Not authorized" }, status: :forbidden
        end

        new_admin = conversation.users.find_by(id: params[:user_id])
        unless new_admin
          return render json: { error: "User is not a participant of this group" }, status: :unprocessable_entity
        end

        if new_admin.id == Current.user.id
          return render json: { error: "You are already the admin" }, status: :unprocessable_entity
        end

        if conversation.update(admin_id: new_admin.id)
          Messages::SystemMessageService.create_admin_transfer(conversation, Current.user, new_admin)

          payload = {
            action: 'group_updated',
            conversation: ConversationBlueprint.render_as_hash(conversation, view: :with_participants)
          }

          conversation.users.each do |u|
            ActionCable.server.broadcast("user_#{u.id}_conversations", payload)
          end
          ActionCable.server.broadcast("conversation_#{conversation.id}", payload)

          render json: { success: true }
        else
          render json: { error: conversation.errors.full_messages.join(", ") }, status: :unprocessable_entity
        end
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

      def group
        result = Conversations::GroupCreationService.call(Current.user, params[:name], params[:user_ids])

        if result.success?
          render json: {
            conversation: ConversationBlueprint.render_as_hash(result.value, view: :with_participants)
          }, status: :ok
        else
          render json: { error: result.error[:message] || result.error }, status: result.error[:status] || :unprocessable_entity
        end
      end

      def mute
        conversation = Current.user.conversations.find(params[:id])
        participant = conversation.conversation_participants.find_by!(user_id: Current.user.id)
        participant.update!(muted_at: Time.current)
        render json: { success: true, muted: true }
      end

      def unmute
        conversation = Current.user.conversations.find(params[:id])
        participant = conversation.conversation_participants.find_by!(user_id: Current.user.id)
        participant.update!(muted_at: nil)
        render json: { success: true, muted: false }
      end

      private

      def conversation_params
        params.require(:conversation).permit(:avatar, :name)
      end
    end
  end
end
