class MessageBlueprint < Blueprinter::Base
  identifier :id

  fields :created_at, :edited_at

  field :deleted do |message, _|
    message.deleted?
  end

  field :content do |message, _|
    message.deleted? ? nil : message.content
  end

  field :reply_to do |message, _|
    if message.reply_to_id.present?
      replied_msg = message.reply_to
      if replied_msg
        {
          id: replied_msg.id,
          content: replied_msg.deleted? ? nil : replied_msg.content,
          deleted: replied_msg.deleted?,
          sender_name: replied_msg.user.full_name
        }
      end
    end
  end

  association :user, blueprint: UserBlueprint
end
