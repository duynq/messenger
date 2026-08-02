require "rails_helper"

RSpec.describe MessagePolicy do
  let(:owner) { create(:user) }
  let(:other_member) { create(:user) }
  let(:outsider) { create(:user) }
  let(:conversation) { create(:conversation) }
  let(:message) { create(:message, conversation: conversation, user: owner) }

  before do
    conversation.users << [owner, other_member]
  end

  it "allows a participant to read, create, react, update and destroy their own message" do
    policy = described_class.new(owner, message)

    expect(policy).to be_index
    expect(policy).to be_create
    expect(policy).to be_react
    expect(policy).to be_update
    expect(policy).to be_destroy
  end

  it "allows a participant to read, create and react but not modify another member's message" do
    policy = described_class.new(other_member, message)

    expect(policy).to be_index
    expect(policy).to be_create
    expect(policy).to be_react
    expect(policy).not_to be_update
    expect(policy).not_to be_destroy
  end

  it "denies every message operation to an outsider" do
    policy = described_class.new(outsider, message)

    expect_all_actions_to_be_denied(policy)
  end

  it "denies every message operation after a participant is removed" do
    conversation.conversation_participants.find_by!(user: owner).destroy!
    policy = described_class.new(owner, message)

    expect_all_actions_to_be_denied(policy)
  end

  it "denies every message operation in an inactive conversation" do
    conversation.soft_delete
    policy = described_class.new(owner, message)

    expect_all_actions_to_be_denied(policy)
  end

  def expect_all_actions_to_be_denied(policy)
    %i[index create react update destroy].each do |action|
      expect(policy.public_send("#{action}?"))
        .to be(false), "expected #{action}? to be denied"
    end
  end
end
