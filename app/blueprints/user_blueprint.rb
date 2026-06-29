class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :full_name, :last_seen_at

  field :is_online do |user, _options|
    count = Rails.cache.read("user_#{user.id}_connections").to_i
    count > 0
  end

  view :with_email_and_storage do
    fields :email, :first_name, :last_name

  end
end
