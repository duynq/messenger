class MessageBlueprint < Blueprinter::Base
  identifier :id

  fields :created_at, :edited_at

  field :deleted do |message, _|
    message.deleted?
  end

  field :content do |message, _|
    message.deleted? ? nil : message.content
  end

  association :user, blueprint: UserBlueprint
end
