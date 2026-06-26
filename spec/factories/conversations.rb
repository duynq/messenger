FactoryBot.define do
  factory :conversation do
    is_group { false }
    name { "MyString" }
    admin { nil }
  end
end
