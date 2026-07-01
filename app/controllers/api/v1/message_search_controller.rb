module Api
  module V1
    class MessageSearchController < ApplicationController
      before_action :authenticate_user!

      def index
        query = params[:q].to_s.strip
        return render json: { messages: [], meta: { has_next: false } } if query.blank?

        # Base scope: user's conversations
        conversations = Current.user.conversations

        # Optionally filter by specific conversation
        if params[:conversation_id].present?
          conversations = conversations.where(id: params[:conversation_id])
        end

        # Join conversations and apply full-text search
        messages_scope = MessageSearchQuery.new(conversations).search(query)

        # Count might be slow, but for pagination it's required. We can use a simpler approach or Pagy's standard.
        @pagy, records = pagy(messages_scope)

        # Include users (senders) to avoid N+1
        ActiveRecord::Associations::Preloader.new(records: records, associations: { user: { avatar_attachment: :blob } }).call

        render json: {
          messages: MessageSearchPresenter.format_messages(records, self),
          meta: {
            current_page: @pagy.page,
            next_page: @pagy.next,
            has_next: @pagy.next.present?,
            total_pages: @pagy.pages,
            total_count: @pagy.count
          }
        }
      rescue Pagy::OverflowError
        render json: { messages: [], meta: { has_next: false } }
      end
    end
  end
end
