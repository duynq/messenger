require "rails_helper"

RSpec.describe "Api::V1::MessageSearch", type: :request do
  let(:user) { create(:user) }
  let(:sender) { create(:user) }
  let(:first_conversation) { create_conversation_for(user, sender) }
  let(:second_conversation) { create_conversation_for(user, sender) }

  describe "GET /api/v1/search/messages" do
    it "searches globally across only the current user's conversations" do
      first_match = create(:message, conversation: first_conversation, user: sender, content: "contract needle one")
      second_match = create(:message, conversation: second_conversation, user: sender, content: "contract needle two")
      inaccessible_conversation = create(:conversation)
      inaccessible_conversation.users << [sender, create(:user)]
      create(:message, conversation: inaccessible_conversation, user: sender, content: "contract needle hidden")

      get search_path, params: { q: "needle", use_es: false }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages").pluck("id")).to match_array([first_match.id, second_match.id])
      expect_search_contract(parsed_response, total_count: 2, total_pages: 1, has_next: false)
    end

    it "restricts results to an authorized conversation" do
      match = create(:message, conversation: first_conversation, user: sender, content: "local needle")
      create(:message, conversation: second_conversation, user: sender, content: "other needle")

      get search_path,
        params: { q: "needle", conversation_id: first_conversation.id, use_es: false },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages").pluck("id")).to eq([match.id])
    end

    it "returns no results for a conversation the user cannot access" do
      inaccessible_conversation = create(:conversation)
      inaccessible_conversation.users << [sender, create(:user)]
      create(:message, conversation: inaccessible_conversation, user: sender, content: "private needle")

      get search_path,
        params: { q: "needle", conversation_id: inaccessible_conversation.id, use_es: false },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect_search_contract(parsed_response, total_count: 0, total_pages: 0, has_next: false)
    end

    it "does not turn an invalid conversation filter into a global search" do
      create(:message, conversation: first_conversation, user: sender, content: "global needle")

      get search_path,
        params: { q: "needle", conversation_id: "invalid", use_es: false },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect_search_contract(parsed_response, total_count: 0, total_pages: 0, has_next: false)
    end

    it "returns the complete empty contract for a blank query" do
      get search_path, params: { q: "   " }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages")).to eq([])
      expect(parsed_response.fetch("meta")).to eq(
        "current_page" => 1,
        "total_pages" => 0,
        "total_count" => 0,
        "has_next" => false,
        "next_page" => nil
      )
    end

    it "returns consistent pagination metadata" do
      21.times do |index|
        create(
          :message,
          conversation: first_conversation,
          user: sender,
          content: "pagination needle #{index}",
          created_at: index.minutes.ago
        )
      end

      get search_path, params: { q: "needle", page: 1, use_es: false }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages").size).to eq(20)
      expect_search_contract(parsed_response, total_count: 21, total_pages: 2, has_next: true)
      expect(parsed_response.dig("meta", "next_page")).to eq(2)

      get search_path, params: { q: "needle", page: 2, use_es: false }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages").size).to eq(1)
      expect_search_contract(parsed_response, total_count: 21, total_pages: 2, has_next: false)
    end

    it "uses the same response contract with Elasticsearch" do
      message = create(:message, conversation: first_conversation, user: sender, content: "elastic needle")
      results = instance_double(
        "Searchkick::Results",
        with_highlights: [[message, { content: ["elastic <b>needle</b>"] }]],
        current_page: 1,
        total_pages: 1,
        total_count: 1
      )
      allow(Searchkick.client).to receive(:ping).and_return(true)
      allow(Message).to receive(:search).and_return(results)

      get search_path, params: { q: "needle" }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect_search_contract(parsed_response, total_count: 1, total_pages: 1, has_next: false)
      expect(parsed_response.dig("messages", 0, "snippet")).to eq("elastic <b>needle</b>")
      expect(parsed_response.fetch("messages").first.keys).to match_array(search_result_keys)
    end

    it "falls back to PostgreSQL when Elasticsearch disconnects during search" do
      match = create(:message, conversation: first_conversation, user: sender, content: "fallback needle")
      allow(Searchkick.client).to receive(:ping).and_return(true)
      allow(Message).to receive(:search).and_raise(Searchkick::Error, "connection lost")

      get search_path, params: { q: "needle" }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages").pluck("id")).to eq([match.id])
      expect_search_contract(parsed_response, total_count: 1, total_pages: 1, has_next: false)
    end

    it "uses PostgreSQL when Elasticsearch is unavailable before search" do
      match = create(:message, conversation: first_conversation, user: sender, content: "offline needle")
      allow(Searchkick.client).to receive(:ping).and_raise(Searchkick::Error, "offline")

      get search_path, params: { q: "needle" }, headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_response.fetch("messages").pluck("id")).to eq([match.id])
    end
  end

  def search_path
    "/api/v1/search/messages"
  end

  def create_conversation_for(*users)
    create(:conversation).tap { |conversation| conversation.users << users }
  end

  def expect_search_contract(body, total_count:, total_pages:, has_next:)
    expect(body.keys).to match_array(%w[messages meta])
    expect(body.fetch("meta")).to include(
      "current_page" => be_a(Integer),
      "total_pages" => total_pages,
      "total_count" => total_count,
      "has_next" => has_next
    )
    expect(body.fetch("meta")).to have_key("next_page")

    body.fetch("messages").each do |message|
      expect(message.keys).to match_array(search_result_keys)
      expect(message.fetch("user").keys).to match_array(%w[id full_name email avatar_url])
    end
  end

  def search_result_keys
    %w[id conversation_id content snippet created_at user]
  end
end
