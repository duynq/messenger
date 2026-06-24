require 'swagger_helper'

RSpec.describe 'api/v1/users/sessions', type: :request do
  path '/api/v1/users/sign_in' do
    post('Sign in user') do
      tags 'Authentication'
      consumes 'application/json'
      produces 'application/json'

      parameter name: :user, in: :body, schema: {
        type: :object,
        properties: {
          user: {
            type: :object,
            properties: {
              email: { type: :string, example: 'admin@example.com' },
              password: { type: :string, example: 'password123' }
            },
            required: %w[email password]
          }
        }
      }

      response(200, 'successful') do
        let(:user) { { user: { email: 'admin@example.com', password: 'password123' } } }
        before { create(:user, email: 'admin@example.com', password: 'password123') }

        run_test!
      end

      response(401, 'unauthorized') do
        let(:user) { { user: { email: 'wrong@example.com', password: 'wrongpassword' } } }
        run_test!
      end
    end
  end

  path '/api/v1/users/sign_out' do
    delete('Sign out user') do
      tags 'Authentication'
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
