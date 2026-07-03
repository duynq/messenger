class UserSearchService
  def self.call(**args)
    new(**args).call
  end

  def initialize(user:, query: "", page: 1, per_page: 20, use_elasticsearch: true)
    @user = user
    @query = query
    @page = page
    @per_page = per_page
    @use_elasticsearch = use_elasticsearch && elasticsearch_available?
  end

  def call
    @use_elasticsearch && @query.present? ? elasticsearch_search : postgresql_search
  end

  private

  def elasticsearch_search
    results = perform_es_query
    format_response(results.to_a, results)
  end

  def perform_es_query
    User.search(
      @query,
      where: { id: { not: @user.id } },
      page: @page,
      per_page: @per_page,
      includes: { avatar_attachment: { blob: :variant_records } }
    )
  end

  def postgresql_search
    pagy_obj, records = paginate_pg_records
    preload_associations(records)
    format_response(records, pagy_obj)
  rescue Pagy::OverflowError
    { users: [], meta: { has_next: false } }
  end

  def paginate_pg_records
    scope, count = build_pg_scope_and_count
    pagy_obj = Pagy.new(count: count, page: @page, items: @per_page)
    records = scope.offset(pagy_obj.offset).limit(pagy_obj.items)
    [pagy_obj, records]
  end

  def build_pg_scope_and_count
    base_scope = User.where.not(id: @user.id)
    @query.present? ? scope_with_query(base_scope) : scope_without_query(base_scope)
  end

  def scope_with_query(base_scope)
    q = "%#{@query}%"
    scope = base_scope.where(
      "first_name ILIKE :q OR last_name ILIKE :q OR email ILIKE :q OR (first_name || ' ' || last_name) ILIKE :q",
      q: q
    )
    [scope, scope.count]
  end

  def scope_without_query(base_scope)
    total = Rails.cache.fetch("total_users_count", expires_in: 1.hour) { User.count }
    count = total > 0 ? total - 1 : 0
    [base_scope, count]
  end

  def preload_associations(records)
    ActiveRecord::Associations::Preloader.new(
      records: records,
      associations: { avatar_attachment: { blob: :variant_records } }
    ).call
  end

  def format_response(records, pagination)
    {
      users: UserBlueprint.render_as_hash(records, view: :with_email_and_storage),
      meta: pagination_meta(pagination)
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
