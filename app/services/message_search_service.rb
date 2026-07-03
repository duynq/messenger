class MessageSearchService
  def initialize(user, use_elasticsearch: true)
    @user = user
    @use_elasticsearch = use_elasticsearch && elasticsearch_available?
  end

  def search(query, conversation_id: nil, page: 1, per_page: 20)
    if @use_elasticsearch
      elasticsearch_search(query, conversation_id, page, per_page)
    else
      postgresql_search(query, conversation_id, page, per_page)
    end
  end

  private

  def elasticsearch_search(query, conversation_id, page, per_page)
    conversation_ids = @user.conversation_ids
    conversation_ids = [conversation_id] if conversation_id.present?

    results = Message.search(
      query,
      where: { conversation_id: conversation_ids },
      highlight: { tag: "<b>" },
      page: page,
      per_page: per_page,
      order: { created_at: :desc },
      includes: { user: { avatar_attachment: :blob } }
    )

    {
      messages: format_es_results(results),
      meta: {
        current_page: results.current_page,
        total_pages: results.total_pages,
        total_count: results.total_count,
        has_next: results.current_page < results.total_pages,
        next_page: results.current_page < results.total_pages ? results.current_page + 1 : nil
      }
    }
  end

  def postgresql_search(query, conversation_id, page, per_page)
    conversations = @user.conversations
    conversations = conversations.where(id: conversation_id) if conversation_id.present?

    messages_scope = MessageSearchQuery.new(conversations).search(query)
    
    # Simple pagination wrapper for fallback
    pagy_obj = Pagy.new(count: messages_scope.count, page: page, items: per_page)
    records = messages_scope.offset(pagy_obj.offset).limit(pagy_obj.items)
    
    ActiveRecord::Associations::Preloader.new(records: records, associations: { user: { avatar_attachment: :blob } }).call

    # Assuming MessageSearchPresenter is available and works identically
    {
      messages: MessageSearchPresenter.format_messages(records, nil),
      meta: {
        current_page: pagy_obj.page,
        next_page: pagy_obj.next,
        has_next: pagy_obj.next.present?,
        total_pages: pagy_obj.pages,
        total_count: pagy_obj.count
      }
    }
  rescue Pagy::OverflowError
    { messages: [], meta: { has_next: false } }
  end

  def format_es_results(results)
    results.with_highlights(multiple: true).map do |message, highlights|
      # Base format using Blueprint if available or falling back
      # The presenter likely expects a similar structure.
      formatted = MessageBlueprint.render_as_hash(message, view: :extended)
      
      # Inject highlights
      formatted[:search_highlights] = if highlights[:content]
        highlights[:content].join(" ... ")
      else
        nil
      end

      formatted
    end
  end

  def elasticsearch_available?
    Searchkick.client.ping
  rescue
    false
  end
end
