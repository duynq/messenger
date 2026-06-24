require 'devise/jwt/test_helpers'

module ApiHelpers
  def auth_headers(user)
    headers = { 'Accept' => 'application/json', 'Content-Type' => 'application/json' }
    Devise::JWT::TestHelpers.auth_headers(headers, user)
  end

  def parsed_response
    JSON.parse(response.body)
  end
end
