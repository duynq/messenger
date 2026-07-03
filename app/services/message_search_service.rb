class MessageSearchService
  def self.call(**args)
    new(**args).call
  end

  def initialize(user:, query:, conversation_id: nil, page: 1, per_page: 20, use_elasticsearch: true)
    @user = user
    @query = query
    @conversation_id = conversation_id
    @page = page
    @per_page = per_page
    @use_elasticsearch = use_elasticsearch && elasticsearch_available?
  end

  def call
    return empty_result if @query.blank?

    @use_elasticsearch ? elasticsearch_search : postgresql_search
  end

  private

  def empty_result
    { messages: [], meta: { has_next: false } }
  end

  def elasticsearch_search
    results = perform_es_query
    format_es_response(results)
  end

  def perform_es_query
    Message.search(
      @query,
      where: { conversation_id: target_conversation_ids },
      highlight: { tag: "<b>" },
      page: @page,
      per_page: @per_page,
      order: { created_at: :desc },
      includes: { user: { avatar_attachment: :blob } }
    )
  end

  def target_conversation_ids
    @conversation_id.present? ? [@conversation_id] : @user.conversation_ids
  end

  def format_es_response(results)
    {
      messages: format_messages(results),
      meta: pagination_meta(results)
    }
  end

  def format_messages(results)
    results.with_highlights(multiple: true).map do |message, highlights|
      format_single_message(message, highlights)
    end
  end

  def format_single_message(message, highlights)
    formatted = MessageBlueprint.render_as_hash(message, view: :extended)
    formatted[:search_highlights] = highlights[:content]&.join(" ... ")
    formatted
  end

  def postgresql_search
    pagy_obj, records = paginate_pg_records
    preload_associations(records)
    format_pg_response(pagy_obj, records)
  rescue Pagy::OverflowError
    empty_result
  end

  def paginate_pg_records
    messages_scope = MessageSearchQuery.new(pg_conversations_scope).search(@query)
    pagy_obj = Pagy.new(count: messages_scope.count, page: @page, items: @per_page)
    records = messages_scope.offset(pagy_obj.offset).limit(pagy_obj.items)
    [pagy_obj, records]
  end

  def pg_conversations_scope
    scope = @user.conversations
    @conversation_id.present? ? scope.where(id: @conversation_id) : scope
  end

  def preload_associations(records)
    ActiveRecord::Associations::Preloader.new(
      records: records,
      associations: { user: { avatar_attachment: :blob } }
    ).call
  end

  def format_pg_response(pagy_obj, records)
    {
      messages: MessageSearchPresenter.format_messages(records, nil),
      meta: pagination_meta(pagy_obj)
    }
  end

  def pagination_meta(results)
    {
      current_page: results.try(:current_page) || results.page,
      total_pages: results.try(:total_pages) || results.pages,
      total_count: results.try(:total_count) || results.count,
      has_next: next_page_exists?(results),
      next_page: next_page_number(results)
    }
  end

  def next_page_exists?(results)
    if results.respond_to?(:current_page)
      results.current_page < results.total_pages
    else
      results.next.present?
    end
  end

  def next_page_number(results)
    if results.respond_to?(:current_page)
      next_page_exists?(results) ? results.current_page + 1 : nil
    else
      results.next
    end
  end

  def elasticsearch_available?
    Searchkick.client.ping
  rescue
    false
  end
end
