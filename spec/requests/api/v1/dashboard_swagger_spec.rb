require 'swagger_helper'

RSpec.describe 'api/v1/dashboard', type: :request do
  path '/api/v1/dashboard' do
    get('Get dashboard data') do
      tags 'Dashboard'
      security [bearer_auth: []]
      produces 'application/json'

      response(200, 'successful') do
        let(:user) { create(:user) }
        let(:Authorization) { Devise::JWT::TestHelpers.auth_headers({}, user)['Authorization'] }
        run_test!
      end

      response(401, 'unauthorized') do
        let(:Authorization) { 'Bearer invalid_token' }
        run_test!
      end
    end
  end
end
