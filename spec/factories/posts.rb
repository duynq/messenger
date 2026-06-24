FactoryBot.define do
  factory :post do
    association :user
    title { Faker::Lorem.sentence(word_count: 4) }
    body { Faker::Lorem.paragraphs(number: 2).join("\n\n") }
    published { false }

    trait :published do
      published { true }
    end
  end
end
