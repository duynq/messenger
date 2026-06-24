require 'rails_helper'

RSpec.describe "Api::V1::Posts", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe "GET /api/v1/posts" do
    it "returns the user's posts with pagination" do
      create_list(:post, 3, user: user)

      get "/api/v1/posts", headers: headers
      expect(response).to have_http_status(:ok)

      data = parsed_response
      expect(data["posts"].length).to eq(3)
      expect(data["pagination"]).to include("count", "page", "pages")
    end
  end

  describe "POST /api/v1/posts" do
    let(:valid_params) { { post: { title: "Test Post", body: "Test body content" } } }

    it "creates a new post" do
      expect {
        post "/api/v1/posts", params: valid_params.to_json, headers: headers
      }.to change(Post, :count).by(1)

      expect(response).to have_http_status(:created)
    end

    it "returns errors for invalid data" do
      post "/api/v1/posts", params: { post: { title: "" } }.to_json, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/posts/:id" do
    let!(:user_post) { create(:post, user: user) }

    it "updates the post" do
      patch "/api/v1/posts/#{user_post.id}", params: { post: { title: "Updated" } }.to_json, headers: headers
      expect(response).to have_http_status(:ok)
      expect(user_post.reload.title).to eq("Updated")
    end
  end

  describe "DELETE /api/v1/posts/:id" do
    let!(:user_post) { create(:post, user: user) }

    it "deletes the post" do
      expect {
        delete "/api/v1/posts/#{user_post.id}", headers: headers
      }.to change(Post, :count).by(-1)

      expect(response).to have_http_status(:ok)
    end
  end
end
