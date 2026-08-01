require "rails_helper"

RSpec.describe "Api::V1::Conversations", type: :request do
  describe "PATCH /api/v1/conversations/:id/read" do
    let(:user) { create(:user) }
    let(:sender) { create(:user) }
    let(:conversation) { create(:conversation) }
    let(:other_conversation) { create(:conversation) }

    before do
      conversation.users << [user, sender]
      other_conversation.users << [user, sender]
    end

    it "marks only notifications from the active conversation as read" do
      active_message = create(:message, conversation: conversation, user: sender)
      other_message = create(:message, conversation: other_conversation, user: sender)
      active_notification = create_notification(active_message)
      other_notification = create_notification(other_message)

      patch "/api/v1/conversations/#{conversation.id}/read", headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(active_notification.reload.read_at).to be_present
      expect(other_notification.reload.read_at).to be_nil
    end

    def create_notification(message)
      Notification.create!(
        user: user,
        actor: sender,
        notifiable: message,
        notification_type: "new_message",
        data: { conversation_id: message.conversation_id }
      )
    end
  end
end
