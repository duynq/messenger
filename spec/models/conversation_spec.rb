require "rails_helper"

RSpec.describe Conversation, type: :model do
  describe "#last_message" do
    it "does not query messages when the conversation has no last message" do
      conversation = build_stubbed(:conversation, last_message_at: nil)

      expect(conversation).not_to receive(:messages)
      expect(conversation.last_message).to be_nil
    end

    it "returns the latest message by id" do
      user = create(:user)
      conversation = create(:conversation, last_message_at: Time.current)
      create(:message, conversation: conversation, user: user, content: "Earlier")
      latest_message = create(:message, conversation: conversation, user: user, content: "Latest")

      expect(conversation.last_message).to eq(latest_message)
    end
  end
end
