class MessageSearchQuery
  HEADLINE_OPTIONS = [
    "StartSel=<b>",
    "StopSel=</b>",
    "MaxWords=35",
    "MinWords=15",
    "ShortWord=3",
    "HighlightAll=FALSE",
    "MaxFragments=2",
    'FragmentDelimiter=" ... "'
  ].join(", ").freeze

  def initialize(conversations)
    @conversations = conversations
  end

  def search(query)
    tsquery = format_tsquery(query)
    return base_scope.none if tsquery.blank?

    base_scope
      .where("searchable @@ to_tsquery('simple', :q)", q: tsquery)
      .select("messages.*", snippet_select(tsquery))
      .order(created_at: :desc)
  end

  private

  def base_scope
    Message
      .joins(:conversation)
      .where(conversations: { id: @conversations.select(:id) })
  end

  def snippet_select(tsquery)
    quoted = Message.connection.quote(tsquery)

    "ts_headline('simple', content, to_tsquery('simple', #{quoted}), " \
      "'#{HEADLINE_OPTIONS}') as snippet"
  end

  def format_tsquery(query)
    # Extract alphanumeric words (supporting unicode letters like Vietnamese)
    terms = query.to_s.scan(/[\p{L}\p{N}_]+/)
    terms.map { |term| "#{term}:*" }.join(" & ")
  end
end
