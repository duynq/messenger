class MessageBlueprint < Blueprinter::Base
  identifier :id

  fields :content, :created_at

  association :user, blueprint: UserBlueprint
end
