class Rack::Attack
  # ──────────────────────────────────────────────────────────────────────────
  # Cache store:
  #   - Development/Test: MemoryStore (per-process, no external dependency)
  #   - Production: Switch to Redis so limits are shared across all processes
  #     and dynos. Add REDIS_URL env var and use:
  #
  #       Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(
  #         url: ENV.fetch("REDIS_URL")
  #       )
  # ──────────────────────────────────────────────────────────────────────────
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new

  # Throttle all requests by IP (60 requests/minute)
  throttle('req/ip', limit: 60, period: 1.minute) do |req|
    req.ip
  end

  # Throttle authentication attempts by email address
  throttle('logins/email', limit: 5, period: 20.seconds) do |req|
    if req.path == '/api/v1/users/sign_in' && req.post?
      req.params['user'] && req.params['user']['email'].to_s.downcase.gsub(/\s+/, "")
    end
  end

  # Custom response for throttled clients
  self.throttled_responder = lambda do |env|
    [ 429,  # status
      {'Content-Type' => 'application/json'},
      [{error: "Too many requests. Please try again later."}.to_json]
    ]
  end
end
