FactoryBot.define do
  factory :message do
    conversation { nil }
    user { nil }
    content { "MyText" }
  end
end
