require "base64"

class UserSearchService
  CURSOR_DIRECTIONS = %w[next previous].freeze
  CURSOR_SOURCES = %w[postgresql elasticsearch].freeze

  def self.call(**args)
    new(**args).call
  end

  def initialize(user:, query: "", cursor: nil, page: nil, per_page: 20, use_elasticsearch: true)
    @user = user
    @query = query
    @cursor = decode_cursor(cursor)
    @requested_page = page.present? ? [page.to_i, 1].max : (@cursor&.fetch("page", 1).to_i)
    @per_page = per_page
    @use_elasticsearch = use_elasticsearch && elasticsearch_available?
  end

  def call
    @use_elasticsearch && @query.present? ? elasticsearch_search : postgresql_search
  end

  private

  def elasticsearch_search
    source = "elasticsearch"
    source_cursor = cursor_for(source)
    cursor = navigation_cursor(source_cursor)
    direction = cursor&.fetch("direction") || "next"
    results = perform_es_query(cursor, direction)
    pairs = results.with_hit.to_a
    pairs = pairs.first(@per_page)
    pairs.reverse! if direction == "previous"

    records = pairs.map(&:first)
    values = pairs.map { |_, hit| hit.fetch("sort").first }
    total_count = source_cursor&.fetch("total_count") || results.total_count
    current_page = normalized_page(@requested_page, total_count)

    format_response(records, cursor_meta(values, current_page, total_count, source))
  end

  def perform_es_query(cursor, direction)
    order = direction == "previous" ? :desc : :asc
    body_options = {}
    body_options[:search_after] = [cursor.fetch("value")] if cursor
    body_options[:track_total_hits] = true

    pagination = if cursor
      { limit: @per_page + 1 }
    else
      { limit: @per_page + 1, offset: (@requested_page - 1) * @per_page }
    end

    User.search(
      @query,
      where: { id: { not: @user.id } },
      **pagination,
      order: { email: order },
      body_options: body_options,
      includes: { avatar_attachment: { blob: :variant_records } }
    )
  end

  def postgresql_search
    source = "postgresql"
    source_cursor = cursor_for(source)
    cursor = navigation_cursor(source_cursor)
    direction = cursor&.fetch("direction") || "next"
    total_count = source_cursor&.fetch("total_count") || total_pg_count
    current_page = normalized_page(@requested_page, total_count)
    records = paginate_pg_records(cursor, direction, current_page)
    preload_associations(records)
    values = records.map(&:id)

    format_response(records, cursor_meta(values, current_page, total_count, source))
  end

  def paginate_pg_records(cursor, direction, current_page)
    scope = build_pg_scope
    if cursor
      operator = direction == "previous" ? "<" : ">"
      scope = scope.where("users.id #{operator} ?", cursor.fetch("value").to_i)
    elsif current_page > 1
      boundary_id = scope.order(id: :asc)
        .offset((current_page - 1) * @per_page)
        .limit(1)
        .pick(:id)
      scope = boundary_id ? scope.where("users.id >= ?", boundary_id) : scope.none
    end

    order = direction == "previous" ? :desc : :asc
    records = scope.order(id: order).limit(@per_page).to_a
    records.reverse! if direction == "previous"
    records
  end

  def build_pg_scope
    base_scope = User.where.not(id: @user.id)
    @query.present? ? scope_with_query(base_scope) : base_scope
  end

  def scope_with_query(base_scope)
    q = "%#{@query}%"
    base_scope.where(
      "first_name ILIKE :q OR last_name ILIKE :q OR email ILIKE :q OR (first_name || ' ' || last_name) ILIKE :q",
      q: q
    )
  end

  def preload_associations(records)
    ActiveRecord::Associations::Preloader.new(
      records: records,
      associations: { avatar_attachment: { blob: :variant_records } }
    ).call
  end

  def format_response(records, meta)
    {
      users: UserBlueprint.render_as_hash(records, view: :with_email_and_storage),
      meta: meta
    }
  end

  def cursor_meta(values, current_page, total_count, source)
    total_pages = [(total_count.to_f / @per_page).ceil, 1].max
    has_previous = current_page > 1
    has_next = current_page < total_pages

    {
      current_page: current_page,
      total_pages: total_pages,
      total_count: total_count,
      has_previous: has_previous,
      has_next: has_next,
      previous_cursor: has_previous && values.any? ? encode_cursor("previous", values.first, source, current_page - 1, total_count) : nil,
      next_cursor: has_next && values.any? ? encode_cursor("next", values.last, source, current_page + 1, total_count) : nil
    }
  end

  def cursor_for(source)
    @cursor if @cursor&.fetch("source") == source
  end

  def navigation_cursor(cursor)
    cursor if cursor&.fetch("page").to_i == @requested_page
  end

  def encode_cursor(direction, value, source, page, total_count)
    payload = { direction: direction, value: value, source: source, page: page, total_count: total_count }.to_json
    Base64.urlsafe_encode64(payload, padding: false)
  end

  def decode_cursor(cursor)
    return if cursor.blank?

    decoded = JSON.parse(Base64.urlsafe_decode64(cursor.to_s))
    return unless CURSOR_DIRECTIONS.include?(decoded["direction"])
    return unless CURSOR_SOURCES.include?(decoded["source"])
    return if decoded["value"].blank?
    return unless decoded["page"].to_i.positive?
    return unless decoded["total_count"].to_i >= 0
    return if decoded["source"] == "postgresql" && decoded["value"].to_s !~ /\A[1-9]\d*\z/

    decoded
  rescue ArgumentError, JSON::ParserError
    nil
  end

  def total_pg_count
    cache_scope = @query.present? ? "query/#{@query}/user/#{@user.id}" : "all/excluding-one"
    Rails.cache.fetch("users/count/#{cache_scope}", expires_in: 5.minutes) do
      build_pg_scope.count
    end
  end

  def normalized_page(page, total_count)
    total_pages = [(total_count.to_f / @per_page).ceil, 1].max
    [[page.to_i, 1].max, total_pages].min
  end

  def elasticsearch_available?
    Searchkick.client.ping
  rescue
    false
  end
end
