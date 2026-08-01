FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user-#{n}-#{SecureRandom.uuid}@example.com" }
    first_name { Faker::Name.first_name }
    last_name { Faker::Name.last_name }
    password { "password123" }
    password_confirmation { "password123" }
  end
end
