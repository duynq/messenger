require "rails_helper"

RSpec.describe ActionCableTicket do
  include ActiveSupport::Testing::TimeHelpers

  let(:user) { create(:user) }

  it "resolves a valid ticket to its user" do
    ticket = described_class.issue(user)

    expect(described_class.verify(ticket)).to eq(user)
  end

  it "rejects a tampered ticket" do
    ticket = described_class.issue(user)

    expect(described_class.verify("#{ticket}tampered")).to be_nil
  end

  it "rejects an expired ticket" do
    ticket = described_class.issue(user)

    travel ActionCableTicket::EXPIRES_IN + 1.second do
      expect(described_class.verify(ticket)).to be_nil
    end
  end
end
