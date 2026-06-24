# Devise configuration
Devise.setup do |config|
  config.mailer_sender = "noreply@example.com"
  require "devise/orm/active_record"

  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]
  config.skip_session_storage = [:http_auth]
  config.stretches = Rails.env.test? ? 1 : 12
  config.reconfirmable = false
  config.expire_all_remember_me_on_sign_out = true
  config.password_length = 6..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/
  config.reset_password_within = 6.hours
  config.sign_out_via = :delete
  config.responder.error_status = :unprocessable_entity
  config.responder.redirect_status = :see_other

  # API configurations
  config.navigational_formats = []

  config.jwt do |jwt|
    jwt.secret = Rails.application.credentials.secret_key_base || ENV.fetch('SECRET_KEY_BASE')
    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/users/sign_in$}],
      ['POST', %r{^/api/v1/users$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/users/sign_out$}]
    ]
    jwt.expiration_time = 1.day.to_i
  end
end
