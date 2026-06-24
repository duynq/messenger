require 'swagger_helper'

RSpec.describe 'api/v1/users/registrations', type: :request do
  path '/api/v1/users' do
    post('Register new user') do
      tags 'Authentication'
      consumes 'application/json'
      produces 'application/json'

      parameter name: :user, in: :body, schema: {
        type: :object,
        properties: {
          user: {
            type: :object,
            properties: {
              first_name: { type: :string, example: 'John' },
              last_name: { type: :string, example: 'Doe' },
              email: { type: :string, example: 'john.doe@example.com' },
              password: { type: :string, example: 'password123' },
              password_confirmation: { type: :string, example: 'password123' }
            },
            required: %w[first_name last_name email password password_confirmation]
          }
        }
      }

      response(200, 'successful') do
        let(:user) do
          {
            user: {
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com',
              password: 'password123',
              password_confirmation: 'password123'
            }
          }
        end
        run_test!
      end

      response(422, 'unprocessable entity') do
        let(:user) { { user: { email: 'invalid' } } }
        run_test!
      end
    end
  end
end
