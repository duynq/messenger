class MessageSearchService
  def self.call(**args)
    new(**args).call
  end

  def initialize(user:, query:, conversation_id: nil, page: 1, per_page: 20, use_elasticsearch: true)
    @user = user
    @query = query.to_s.strip
    @conversation_filter_present = conversation_id.present?
    @conversation_id = normalize_conversation_id(conversation_id)
    @page = [page.to_i, 1].max
    @per_page = [[per_page.to_i, 1].max, 100].min
    @use_elasticsearch = @query.present? && use_elasticsearch && elasticsearch_available?
  end

  def call
    return empty_result if @query.blank?

    return postgresql_search unless @use_elasticsearch

    elasticsearch_search_with_fallback
  end

  private

  def elasticsearch_search_with_fallback
    elasticsearch_search
  rescue StandardError => error
    Rails.logger.warn(
      "Message search failed with Elasticsearch; falling back to PostgreSQL: " \
      "#{error.class}: #{error.message}"
    )
    postgresql_search
  end

  def empty_result
    response(messages: [], current_page: @page, total_pages: 0, total_count: 0)
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

  def format_es_response(results)
    pairs = results.with_highlights(multiple: true).to_a
    snippets = pairs.to_h do |message, highlights|
      content_highlights = highlights[:content] || highlights["content"]
      [message.id, Array(content_highlights).presence&.join(" ... ")]
    end

    {
      messages: MessageSearchPresenter.format_messages(pairs.map(&:first), snippets: snippets),
      meta: pagination_meta(
        current_page: results.current_page,
        total_pages: results.total_pages,
        total_count: results.total_count
      )
    }
  end

  def postgresql_search
    pagy_obj, records, total_count = paginate_pg_records
    preload_associations(records)
    format_pg_response(pagy_obj, records, total_count)
  end

  def paginate_pg_records
    messages_scope = MessageSearchQuery.new(pg_conversations_scope).search(@query)
    total_count = messages_scope.unscope(:select, :order).count
    total_pages = pages_for(total_count)
    return [nil, messages_scope.none, total_count] if total_count.zero? || @page > total_pages

    pagy_obj = Pagy.new(count: total_count, page: @page, limit: @per_page)
    records = messages_scope.offset(pagy_obj.offset).limit(pagy_obj.limit)
    [pagy_obj, records, total_count]
  end

  def preload_associations(records)
    ActiveRecord::Associations::Preloader.new(
      records: records,
      associations: { user: { avatar_attachment: :blob } }
    ).call
  end

  def format_pg_response(pagy_obj, records, total_count)
    total_pages = pages_for(total_count)

    {
      messages: MessageSearchPresenter.format_messages(records),
      meta: pagination_meta(
        current_page: @page,
        total_pages: pagy_obj&.pages || total_pages,
        total_count: total_count
      )
    }
  end

  def response(messages:, current_page:, total_pages:, total_count:)
    {
      messages: messages,
      meta: pagination_meta(
        current_page: current_page,
        total_pages: total_pages,
        total_count: total_count
      )
    }
  end

  def pagination_meta(current_page:, total_pages:, total_count:)
    has_next = current_page < total_pages

    {
      current_page: current_page,
      total_pages: total_pages,
      total_count: total_count,
      has_next: has_next,
      next_page: has_next ? current_page + 1 : nil
    }
  end

  def pages_for(total_count)
    (total_count.to_f / @per_page).ceil
  end

  def normalize_conversation_id(value)
    return if value.blank?

    id = Integer(value, exception: false)
    id if id&.positive?
  end

  def authorized_conversation_ids
    scoped_conversations.ids
  end

  def target_conversation_ids
    @target_conversation_ids ||= authorized_conversation_ids
  end

  def pg_conversations_scope
    scoped_conversations
  end

  def scoped_conversations
    return @user.conversations unless @conversation_filter_present
    return @user.conversations.none unless @conversation_id

    @user.conversations.where(id: @conversation_id)
  end

  def elasticsearch_available?
    Searchkick.client.ping
  rescue StandardError
    false
  end
end
