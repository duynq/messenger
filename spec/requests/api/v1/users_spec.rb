require "rails_helper"

RSpec.describe "Api::V1::Users", type: :request do
  describe "GET /api/v1/users" do
    subject(:request) do
      get "/api/v1/users", params: params, headers: auth_headers(current_user)
    end

    let(:current_user) { create(:user, email: "current-#{SecureRandom.uuid}@example.com") }
    let(:params) { { use_es: false } }
    let(:service_result) do
      {
        users: [{ id: 123, email: "other@example.com" }],
        meta: { has_previous: false, has_next: false, previous_cursor: nil, next_cursor: nil }
      }
    end

    before do
      allow(UserSearchService).to receive(:call).and_return(service_result)
    end

    it "returns the result from the user search service" do
      request

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("users").pluck("id")).to eq([123])
      expect(parsed_response.dig("meta", "has_next")).to be(false)
      expect(UserSearchService).to have_received(:call).with(
        user: current_user,
        query: "",
        cursor: nil,
        page: nil,
        per_page: 20,
        use_elasticsearch: false
      )
    end

    context "when a search query is provided" do
      let(:params) { { cursor: "opaque-cursor", q: " other@example.com ", use_es: false } }

      it "normalizes and passes the search parameters to the service" do
        request

        expect(response).to have_http_status(:ok)
        expect(UserSearchService).to have_received(:call).with(
          user: current_user,
          query: "other@example.com",
          cursor: "opaque-cursor",
          page: nil,
          per_page: 20,
          use_elasticsearch: false
        )
      end
    end
  end
end
