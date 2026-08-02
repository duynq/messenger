require 'rails_helper'

RSpec.describe "Api::V1::Messages", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:outsider) { create(:user) }
  let(:removed_member) { create(:user) }
  let(:conversation) do
    conv = create(:conversation)
    conv.users << user
    conv.users << other_user
    conv
  end

  describe "GET /api/v1/conversations/:conversation_id/messages" do
    it "marks the conversation and its notifications as read on the initial load" do
      participant = conversation.conversation_participants.find_by!(user: user)
      message = create(:message, conversation: conversation, user: other_user)
      notification = Notification.create!(
        user: user,
        actor: other_user,
        notifiable: message,
        notification_type: "new_message",
        data: { conversation_id: conversation.id }
      )

      get "/api/v1/conversations/#{conversation.id}/messages", headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(participant.reload.last_read_at).to be_present
      expect(notification.reload.read_at).to be_present
    end

    it "does not update read state when loading older messages" do
      participant = conversation.conversation_participants.find_by!(user: user)
      original_last_read_at = 1.hour.ago.change(usec: 0)
      participant.update!(last_read_at: original_last_read_at)
      message = create(:message, conversation: conversation, user: other_user)

      get "/api/v1/conversations/#{conversation.id}/messages",
        params: { before_message_id: message.id },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(participant.reload.last_read_at).to eq(original_last_read_at)
    end

    it "forbids an outsider" do
      get messages_path, headers: auth_headers(outsider)

      expect(response).to have_http_status(:forbidden)
    end

    it "forbids a removed participant from reading old messages" do
      remove_from_conversation(removed_member)

      get messages_path, headers: auth_headers(removed_member)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/conversations/:conversation_id/messages" do
    context "with valid parameters" do
      it "creates a new message and returns 201 Created" do
        expect {
          post "/api/v1/conversations/#{conversation.id}/messages",
            params: { message: { content: "Hello world!" } }.to_json,
            headers: auth_headers(user).merge('Content-Type' => 'application/json', 'Accept' => 'application/json')
        }.to change(Message, :count).by(1)

        expect(response).to have_http_status(:created)
        expect(parsed_response["message"]["content"]).to eq("Hello world!")
        expect(parsed_response["message"]["user_id"]).to eq(user.id)
      end
    end

    context "with invalid parameters (missing message wrapper)" do
      it "returns 400 Bad Request or raises ActionController::ParameterMissing" do
        post "/api/v1/conversations/#{conversation.id}/messages",
          params: { content: "Hello world!" }.to_json,
          headers: auth_headers(user).merge('Content-Type' => 'application/json', 'Accept' => 'application/json')

        expect(response).to have_http_status(:bad_request)
      end
    end

    it "forbids an outsider from creating a message" do
      expect {
        post_message_as(outsider, content: "Unauthorized message")
      }.not_to change(Message, :count)

      expect(response).to have_http_status(:forbidden)
    end

    it "forbids a removed participant from creating a message" do
      remove_from_conversation(removed_member)

      expect {
        post_message_as(removed_member, content: "Message after removal")
      }.not_to change(Message, :count)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/conversations/:conversation_id/messages/:id" do
    it "allows a participant to update their own message" do
      message = create(:message, conversation: conversation, user: user, content: "Before")

      patch message_path(message),
        params: { message: { content: "After" } }.to_json,
        headers: json_auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(message.reload.content).to eq("After")
    end

    it "forbids a participant from updating another member's message" do
      message = create(:message, conversation: conversation, user: other_user, content: "Original")

      patch message_path(message),
        params: { message: { content: "Changed" } }.to_json,
        headers: json_auth_headers(user)

      expect(response).to have_http_status(:forbidden)
      expect(message.reload.content).to eq("Original")
    end

    it "forbids an outsider from updating a message" do
      message = create(:message, conversation: conversation, user: user, content: "Original")

      patch message_path(message),
        params: { message: { content: "Changed" } }.to_json,
        headers: json_auth_headers(outsider)

      expect(response).to have_http_status(:forbidden)
      expect(message.reload.content).to eq("Original")
    end

    it "forbids a removed participant from updating their old message" do
      add_to_conversation(removed_member)
      message = create(:message, conversation: conversation, user: removed_member, content: "Original")
      remove_from_conversation(removed_member)

      patch message_path(message),
        params: { message: { content: "Changed" } }.to_json,
        headers: json_auth_headers(removed_member)

      expect(response).to have_http_status(:forbidden)
      expect(message.reload.content).to eq("Original")
    end
  end

  describe "DELETE /api/v1/conversations/:conversation_id/messages/:id" do
    it "allows a participant to delete their own message" do
      message = create(:message, conversation: conversation, user: user)

      delete message_path(message), headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(message.reload).to be_deleted
    end

    it "forbids a participant from deleting another member's message" do
      message = create(:message, conversation: conversation, user: other_user)

      delete message_path(message), headers: auth_headers(user)

      expect(response).to have_http_status(:forbidden)
      expect(message.reload).not_to be_deleted
    end

    it "forbids an outsider from deleting a message" do
      message = create(:message, conversation: conversation, user: user)

      delete message_path(message), headers: auth_headers(outsider)

      expect(response).to have_http_status(:forbidden)
      expect(message.reload).not_to be_deleted
    end

    it "forbids a removed participant from deleting their old message" do
      add_to_conversation(removed_member)
      message = create(:message, conversation: conversation, user: removed_member)
      remove_from_conversation(removed_member)

      delete message_path(message), headers: auth_headers(removed_member)

      expect(response).to have_http_status(:forbidden)
      expect(message.reload).not_to be_deleted
    end
  end

  describe "POST /api/v1/conversations/:conversation_id/messages/:id/react" do
    let(:message) { create(:message, conversation: conversation, user: other_user) }

    it "allows a participant to react" do
      expect {
        react_to_message_as(message, user)
      }.to change(MessageReaction, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(message.reactions.find_by(user: user).emoji).to eq("👍")
    end

    it "forbids an outsider from reacting" do
      expect {
        react_to_message_as(message, outsider)
      }.not_to change(MessageReaction, :count)

      expect(response).to have_http_status(:forbidden)
    end

    it "forbids a removed participant from reacting" do
      add_to_conversation(removed_member)
      remove_from_conversation(removed_member)

      expect {
        react_to_message_as(message, removed_member)
      }.not_to change(MessageReaction, :count)

      expect(response).to have_http_status(:forbidden)
    end
  end

  def messages_path
    "/api/v1/conversations/#{conversation.id}/messages"
  end

  def message_path(message)
    "#{messages_path}/#{message.id}"
  end

  def json_auth_headers(account)
    auth_headers(account).merge("Content-Type" => "application/json", "Accept" => "application/json")
  end

  def post_message_as(account, content:)
    post messages_path,
      params: { message: { content: content } }.to_json,
      headers: json_auth_headers(account)
  end

  def react_to_message_as(message, account)
    post "#{message_path(message)}/react",
      params: { emoji: "👍" }.to_json,
      headers: json_auth_headers(account)
  end

  def add_to_conversation(account)
    conversation.conversation_participants.create!(user: account)
  end

  def remove_from_conversation(account)
    participant = conversation.conversation_participants.find_by(user: account)
    participant ||= conversation.conversation_participants.create!(user: account)
    participant.destroy!
  end
end
