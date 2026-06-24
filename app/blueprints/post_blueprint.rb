# ──────────────────────────────────────────────────────────
# Example Blueprint — replace/extend for your needs
# ──────────────────────────────────────────────────────────
class PostBlueprint < Blueprinter::Base
  identifier :id

  fields :title, :body, :published, :created_at, :updated_at

  view :with_user do
    association :user, blueprint: UserBlueprint
  end
end
