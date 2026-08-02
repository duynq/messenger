module MessageAuthorization
  extend ActiveSupport::Concern

  private

  def set_authorized_conversation
    authorized_conversations = policy_scope(
      Conversation,
      policy_scope_class: MessagePolicy::Scope
    )
    @conversation = authorized_conversations.find_by(id: params[:conversation_id])

    raise Pundit::NotAuthorizedError unless @conversation

    authorize @conversation, conversation_policy_query, policy_class: MessagePolicy
  end

  def set_authorized_message
    @message = @conversation.messages.active.find_by(id: params[:id])
    unless @message
      return render json: { error: I18n.t("errors.message_not_found") }, status: :not_found
    end

    authorize @message, "#{action_name}?".to_sym, policy_class: MessagePolicy
  end

  def conversation_policy_query
    %w[index create].include?(action_name) ? "#{action_name}?".to_sym : :access?
  end
end
