require "spec_helper"
ENV["RAILS_ENV"] = "test"
if ENV["TEST_DATABASE_URL"] && !ENV["TEST_DATABASE_URL"].empty?
  ENV["DATABASE_URL"] = ENV["TEST_DATABASE_URL"]
elsif ENV["DATABASE_URL"]&.include?("_development")
  ENV["DATABASE_URL"] = ENV["DATABASE_URL"].sub(/_development(?=\?|$)/, "_test")
end
require_relative "../config/environment"

abort("RSpec must run in the test environment!") unless Rails.env.test?
require "rspec/rails"
require "shoulda/matchers"

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

Dir[Rails.root.join("spec", "support", "**", "*.rb")].sort.each { |f| require f }

RSpec.configure do |config|
  config.fixture_paths = [Rails.root.join("spec/fixtures")]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  # FactoryBot
  config.include FactoryBot::Syntax::Methods

  # API helpers
  config.include ApiHelpers, type: :request

  # Devise helpers
  config.include Devise::Test::IntegrationHelpers, type: :request
  config.include Devise::Test::IntegrationHelpers, type: :system

  config.before(:each, type: :request) do
    host! "localhost"
    ActionController::Base.allow_forgery_protection = false
  end
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
