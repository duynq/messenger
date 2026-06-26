require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module Messenger
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true

    # Add Rack::Attack
    config.middleware.use Rack::Attack
    config.autoload_lib(ignore: %w[assets tasks])
    config.active_storage.variant_processor = :mini_magick
    # Devise requires sessions
    config.session_store :cookie_store, key: '_messenger_session', secure: Rails.env.production?, httponly: true, same_site: :lax
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options

    config.i18n.available_locales = %i[en vi]
    config.i18n.default_locale = :en
    config.i18n.fallbacks = { vi: %i[vi en] }
  end
end
