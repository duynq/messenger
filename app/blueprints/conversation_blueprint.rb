class ConversationBlueprint < Blueprinter::Base
  identifier :id

  fields :is_group, :name, :created_at
  
  view :with_participants do
    association :users, blueprint: UserBlueprint
  end
end
