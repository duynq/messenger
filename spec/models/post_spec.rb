require 'rails_helper'

RSpec.describe Post, type: :model do
  describe "validations" do
    it { should validate_presence_of(:title) }
    it { should validate_presence_of(:body) }
  end

  describe "associations" do
    it { should belong_to(:user) }
  end

  describe "scopes" do
    let(:user) { create(:user) }
    let!(:published_post) { create(:post, :published, user: user) }
    let!(:draft_post) { create(:post, user: user) }

    it ".published returns only published posts" do
      expect(Post.published).to include(published_post)
      expect(Post.published).not_to include(draft_post)
    end

    it ".drafts returns only draft posts" do
      expect(Post.drafts).to include(draft_post)
      expect(Post.drafts).not_to include(published_post)
    end
  end
end
