Searchkick.client_options = {
  url: ENV.fetch("ELASTICSEARCH_URL", "http://localhost:9200"),
  retry_on_failure: 3,
  request_timeout: 30
}

# Custom Vietnamese settings for Message model
Rails.application.config.to_prepare do
  Message.searchkick_options[:settings] = {
    analysis: {
      analyzer: {
        vi_analyzer: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "asciifolding"]
        }
      }
    }
  }
end
