require "rails_helper"

RSpec.describe "Sidekiq configuration" do
  it "processes asynchronous Searchkick indexing jobs" do
    config = YAML.safe_load_file(
      Rails.root.join("config/sidekiq.yml"),
      permitted_classes: [Symbol]
    )

    expect(config.fetch(:queues)).to include("searchkick")
  end
end
