module Paginatable
  extend ActiveSupport::Concern

  included do
    # Any shared setup if needed
  end

  def pagy(collection, items: CustomPagination::DEFAULT_ITEMS_PER_PAGE)
    page = (params[:page] || 1).to_i
    count = collection.count
    count = count.count if count.is_a?(Hash) # Handle grouped queries if any
    
    pages = (count.to_f / items).ceil
    pages = 1 if pages == 0

    page = pages if page > pages
    page = 1 if page < 1

    records = collection.limit(items).offset((page - 1) * items)

    pagy_obj = {
      count: count,
      page: page,
      items: items,
      pages: pages,
      next: page < pages ? page + 1 : nil,
      prev: page > 1 ? page - 1 : nil
    }

    [pagy_obj, records]
  end

  def pagy_metadata(pagy)
    {
      count: pagy[:count],
      page: pagy[:page],
      items: pagy[:items],
      pages: pagy[:pages],
      next: pagy[:next],
      prev: pagy[:prev]
    }
  end
end
