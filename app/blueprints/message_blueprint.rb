class MessageBlueprint < Blueprinter::Base
  identifier :id

  fields :created_at, :edited_at, :message_type, :metadata

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

  field :reactions do |message, _|
    message.reactions.includes(:user).group_by(&:emoji).map do |emoji, reactions|
      {
        emoji: emoji,
        count: reactions.size,
        reacted_by_me: reactions.any? { |r| r.user_id == Current.user&.id },
        users: reactions.map { |r| r.user.full_name }
      }
    end
  end

  field :attachments do |message, _|
    if message.attachments.attached?
      message.attachments.map do |attachment|
        {
          url: Rails.application.routes.url_helpers.rails_blob_url(attachment),
          filename: attachment.filename.to_s,
          content_type: attachment.content_type,
          byte_size: attachment.byte_size
        }
      end
    else
      []
    end
  end

  association :user, blueprint: UserBlueprint
end
