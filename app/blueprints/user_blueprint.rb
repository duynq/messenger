class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :full_name

  view :with_email_and_storage do
    fields :email, :first_name, :last_name

  end
end
