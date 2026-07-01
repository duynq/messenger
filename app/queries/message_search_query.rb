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
    base_scope
      .where("searchable @@ plainto_tsquery('simple', :q)", q: query)
      .select("messages.*", snippet_select(query))
      .order(created_at: :desc)
  end

  private

  def base_scope
    Message
      .joins(:conversation)
      .where(conversations: { id: @conversations.select(:id) })
  end

  def snippet_select(query)
    quoted = Message.connection.quote(query)

    "ts_headline('simple', content, plainto_tsquery('simple', #{quoted}), " \
      "'#{HEADLINE_OPTIONS}') as snippet"
  end
end
