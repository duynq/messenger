class ConversationBlueprint < Blueprinter::Base
  identifier :id

  fields :is_group, :name, :admin_id, :created_at
  
  view :with_participants do
    association :users, blueprint: UserBlueprint
  end
end
