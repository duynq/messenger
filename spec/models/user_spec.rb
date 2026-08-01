require 'rails_helper'

RSpec.describe User, type: :model do
  describe "validations" do
    it { should validate_presence_of(:first_name) }
    it { should validate_presence_of(:last_name) }
    it { should validate_presence_of(:email) }
  end

  describe "associations" do
    it { should have_many(:conversation_participants).dependent(:destroy) }
    it { should have_many(:conversations).through(:conversation_participants) }
    it { should have_many(:messages).dependent(:destroy) }
    it { should have_many(:notifications).dependent(:destroy) }
    it { should have_many(:push_subscriptions).dependent(:destroy) }
  end

  describe "#full_name" do
    it "returns the first and last name combined" do
      user = build(:user, first_name: "John", last_name: "Doe")
      expect(user.full_name).to eq("John Doe")
    end
  end
end
