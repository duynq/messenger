module Paginatable
  extend ActiveSupport::Concern

  # Encapsulates Pagy pagination with Deferred Join (Index-Only Scan) optimization.
  # Handles Pagy::OverflowError gracefully by falling back to the last page.
  #
  # @param scope [ActiveRecord::Relation] The base scope to paginate.
  # @param count [Integer] The total count of records (usually cached).
  # @param order [Hash, String] The ordering for the scope (required for Deferred Join to work properly).
  # @param includes [Symbol, Array, Hash] Associations to preload to prevent N+1 queries.
  # @return [Array] A tuple containing [pagy_obj, records]
  def paginate_with_deferred(scope, count:, order: { created_at: :desc, id: :desc }, includes: nil)
    ordered_scope = scope.order(order)

    begin
      pagy_obj, pagy_scope = pagy(ordered_scope, count: count)
    rescue Pagy::OverflowError
      limit = Pagy::DEFAULT[:limit] || 20
      last_page = (count / limit.to_f).ceil
      last_page = 1 if last_page < 1
      pagy_obj, pagy_scope = pagy(ordered_scope, count: count, page: last_page)
    end

    # Deferred Join: Use Index Only Scan to quickly skip offset rows
    ids = pagy_scope.pluck(:id)

    # Fetch the actual records using the IDs
    records = scope.klass.where(id: ids).order(order)
    records = records.includes(includes) if includes

    [pagy_obj, records]
  end

  # Standardizes pagination metadata for the API response.
  #
  # @param pagy_obj [Pagy] The Pagy instance returned from paginate_with_deferred
  # @return [Hash] Formatted metadata
  def pagination_meta(pagy_obj)
    {
      current_page: pagy_obj.page,
      total_pages: pagy_obj.pages,
      has_next: pagy_obj.next.present?
    }
  end
end
