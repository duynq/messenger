require "rails_helper"

RSpec.describe UserSearchService do
  describe ".call" do
    let(:current_user) { create(:user, email: "current-#{SecureRandom.uuid}@example.com") }
    let!(:matching_user) { create(:user, email: "matching-#{SecureRandom.uuid}@example.com") }

    it "returns matching users from PostgreSQL" do
      result = described_class.call(
        user: current_user,
        query: matching_user.email,
        per_page: 20,
        use_elasticsearch: false
      )

      expect(result.fetch(:users).pluck(:id)).to eq([matching_user.id])
      expect(result.dig(:meta, :has_next)).to be(false)
    end

    it "paginates forward and backward without OFFSET" do
      users = create_list(:user, 5)
      expected_users = ([matching_user] + users).sort_by(&:id)
      sql = []

      subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
        sql << event.payload[:sql] unless event.payload[:name] == "SCHEMA"
      end

      first_page = described_class.call(
        user: current_user,
        per_page: 2,
        use_elasticsearch: false
      )
      sql.clear
      second_page = described_class.call(
        user: current_user,
        cursor: first_page.dig(:meta, :next_cursor),
        per_page: 2,
        use_elasticsearch: false
      )
      back_to_first_page = described_class.call(
        user: current_user,
        cursor: second_page.dig(:meta, :previous_cursor),
        per_page: 2,
        use_elasticsearch: false
      )

      expect(first_page.fetch(:users).pluck(:id)).to eq(expected_users.first(2).map(&:id))
      expect(second_page.fetch(:users).pluck(:id)).to eq(expected_users.slice(2, 2).map(&:id))
      expect(back_to_first_page.fetch(:users).pluck(:id)).to eq(expected_users.first(2).map(&:id))
      expect(sql.grep(/\bOFFSET\b/i)).to be_empty
      expect(sql.grep(/COUNT\(\*\)/i)).to be_empty
    ensure
      ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber
    end

    it "supports jumping directly to an exact page" do
      users = create_list(:user, 5)
      expected_users = ([matching_user] + users).sort_by(&:id)

      result = described_class.call(
        user: current_user,
        page: 3,
        per_page: 2,
        use_elasticsearch: false
      )

      expect(result.fetch(:users).pluck(:id)).to eq(expected_users.slice(4, 2).map(&:id))
      expect(result.fetch(:meta)).to include(
        current_page: 3,
        total_pages: 3,
        total_count: 6,
        has_previous: true,
        has_next: false
      )
    end

    it "uses limit plus one without COUNT for lightweight cursor pagination" do
      create_list(:user, 3)
      sql = []

      subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
        sql << event.payload[:sql] unless event.payload[:name] == "SCHEMA"
      end

      result = described_class.call(
        user: current_user,
        per_page: 2,
        use_elasticsearch: false,
        include_total_count: false
      )

      expect(result.fetch(:users).size).to eq(2)
      expect(result.fetch(:meta)).to include(
        total_pages: nil,
        total_count: nil,
        has_previous: false,
        has_next: true
      )
      expect(result.dig(:meta, :next_cursor)).to be_present
      expect(sql.grep(/COUNT\(\*\)/i)).to be_empty
    ensure
      ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber
    end
  end
end
