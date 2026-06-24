# Custom Pagination Configuration
# This replaces the default pagy gem config since the installed version has compatibility issues.

module CustomPagination
  # Default to 12 items per page to fit our 3-column and 4-column grid layouts nicely
  DEFAULT_ITEMS_PER_PAGE = 12
end
