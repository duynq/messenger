class UserSearchService
  def initialize(user, use_elasticsearch: true)
    @user = user
    @use_elasticsearch = use_elasticsearch && elasticsearch_available?
  end

  def search(query, page: 1, per_page: 20)
    if @use_elasticsearch && query.present?
      elasticsearch_search(query, page, per_page)
    else
      postgresql_search(query, page, per_page)
    end
  end

  private

  def elasticsearch_search(query, page, per_page)
    # Search users excluding the current user
    results = User.search(
      query,
      where: { id: { not: @user.id } },
      page: page,
      per_page: per_page,
      includes: { avatar_attachment: { blob: :variant_records } }
    )

    {
      users: UserBlueprint.render_as_hash(results.to_a, view: :with_email_and_storage),
      meta: {
        current_page: results.current_page,
        total_pages: results.total_pages,
        total_count: results.total_count,
        has_next: results.current_page < results.total_pages,
        next_page: results.current_page < results.total_pages ? results.current_page + 1 : nil
      }
    }
  end

  def postgresql_search(query, page, per_page)
    users_scope = User.where.not(id: @user.id)
    
    if query.present?
      q = "%#{query}%"
      users_scope = users_scope.where("first_name ILIKE :q OR last_name ILIKE :q OR email ILIKE :q OR (first_name || ' ' || last_name) ILIKE :q", q: q)
      count = users_scope.count
    else
      total_users = Rails.cache.fetch("total_users_count", expires_in: 1.hour) do
        User.count
      end
      count = total_users > 0 ? total_users - 1 : 0
    end
    
    pagy_obj = Pagy.new(count: count, page: page, items: per_page)
    records = users_scope.offset(pagy_obj.offset).limit(pagy_obj.items)
    
    ActiveRecord::Associations::Preloader.new(records: records, associations: { avatar_attachment: { blob: :variant_records } }).call

    {
      users: UserBlueprint.render_as_hash(records, view: :with_email_and_storage),
      meta: {
        current_page: pagy_obj.page,
        next_page: pagy_obj.next,
        has_next: pagy_obj.next.present?,
        total_pages: pagy_obj.pages,
        total_count: pagy_obj.count
      }
    }
  rescue Pagy::OverflowError
    { users: [], meta: { has_next: false } }
  end

  def elasticsearch_available?
    Searchkick.client.ping
  rescue
    false
  end
end
