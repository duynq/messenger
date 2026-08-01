require 'rails_helper'

RSpec.describe "Api::V1::Messages", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
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
  end
end
