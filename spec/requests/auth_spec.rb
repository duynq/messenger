require 'rails_helper'

RSpec.describe "Authentication", type: :request do
  let(:user) { create(:user) }

  describe "POST /api/v1/users/sign_in" do
    it "returns a JWT token on successful login" do
      post "/api/v1/users/sign_in",
        params: { user: { email: user.email, password: "password123" } }.to_json,
        headers: { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(parsed_response["token"]).to be_present
      expect(parsed_response["status"]["data"]["email"]).to eq(user.email)
    end

    it "returns error on invalid credentials" do
      post "/api/v1/users/sign_in",
        params: { user: { email: user.email, password: "wrong" } }.to_json,
        headers: { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/users (registration)" do
    it "creates a new user and returns a JWT token" do
      post "/api/v1/users",
        params: {
          user: {
            email: "newuser@example.com",
            password: "password123",
            password_confirmation: "password123",
            first_name: "New",
            last_name: "User"
          }
        }.to_json,
        headers: { 'Content-Type' => 'application/json', 'Accept' => 'application/json' }

      expect(response).to have_http_status(:ok)
      expect(parsed_response["token"]).to be_present
    end
  end

  describe "DELETE /api/v1/users/sign_out" do
    it "logs out the user" do
      delete "/api/v1/users/sign_out", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
    end
  end
end
