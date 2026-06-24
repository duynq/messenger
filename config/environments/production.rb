require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false
  config.active_storage.service = :minio
  # Set to true if Rails terminates SSL directly.
  # If behind a load balancer / reverse proxy (Nginx, Heroku, AWS ALB, etc.)
  # that handles SSL, keep this false and configure SSL at the proxy level instead.
  config.force_ssl = false
  config.log_level = :info
  config.log_tags = [:request_id]
  config.cache_store = :memory_store
  config.active_support.deprecation = :notify
  config.active_support.disallowed_deprecation = :log
  config.active_support.disallowed_deprecation_warnings = []
  config.active_record.dump_schema_after_migration = false
end
