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
        messages_scope = Message
          .joins(:conversation)
          .where(conversations: { id: conversations.select(:id) })
          .where("searchable @@ plainto_tsquery('simple', :q)", q: query)
          .select("messages.*, ts_headline('simple', content, plainto_tsquery('simple', '#{ActiveRecord::Base.connection.quote_string(query)}'), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=FALSE, MaxFragments=2, FragmentDelimiter=\" ... \"') as snippet")
          .order(created_at: :desc)

        # Count might be slow, but for pagination it's required. We can use a simpler approach or Pagy's standard.
        @pagy, records = pagy(messages_scope)

        # Include users (senders) to avoid N+1
        ActiveRecord::Associations::Preloader.new(records: records, associations: { user: { avatar_attachment: :blob } }).call

        render json: {
          messages: records.map { |msg| format_message(msg) },
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

      private

      def format_message(msg)
        {
          id: msg.id,
          conversation_id: msg.conversation_id,
          content: msg.content,
          snippet: msg.attributes['snippet'],
          created_at: msg.created_at,
          user: {
            id: msg.user.id,
            full_name: msg.user.full_name,
            email: msg.user.email,
            avatar_url: msg.user.avatar.attached? ? url_for(msg.user.avatar) : nil
          }
        }
      end
    end
  end
end
