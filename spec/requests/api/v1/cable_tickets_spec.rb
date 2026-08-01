require "rails_helper"

RSpec.describe "Api::V1::CableTickets", type: :request do
  describe "POST /api/v1/cable_ticket" do
    let(:user) { create(:user) }

    it "returns a short-lived ticket for the authenticated user" do
      post "/api/v1/cable_ticket", headers: auth_headers(user)

      expect(response).to have_http_status(:created)
      expect(parsed_response["expires_in"]).to eq(5.minutes.to_i)
      expect(ActionCableTicket.verify(parsed_response["ticket"])).to eq(user)
    end

    it "rejects an unauthenticated request" do
      post "/api/v1/cable_ticket"

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
