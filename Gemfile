source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby "3.2.2"

gem "rails", "~> 7.1.0"
gem "pg", "~> 1.5"
gem "puma", "~> 6.0"
gem "bootsnap", require: false

# Authentication
gem "devise", "~> 4.9"
gem "devise-jwt"

# API
gem "rack-cors"
gem "blueprinter", "~> 1.3"
gem "rack-attack", "~> 6.8"

# Active Storage with S3 (MinIO)
gem "aws-sdk-s3", "~> 1.0", require: false

# Utilities
gem "activesupport"
gem "redis", "~> 5.0"

group :development, :test do
  gem "debug", platforms: %i[mri mingw x64_mingw]
  gem "rspec-rails", "~> 6.0"
  gem "factory_bot_rails", "~> 6.0"
  gem "faker"
  gem "pry-rails"
  gem "pry-byebug"

  # Swagger API documentation
  gem "rswag-api"
  gem "rswag-ui"
  gem "rswag-specs"
end

group :test do
  gem "shoulda-matchers", "~> 5.0"
  gem "database_cleaner-active_record"
end

gem "pagy", "~> 9.3"
