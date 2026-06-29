class BackfillLastMessageAtOnConversations < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      UPDATE conversations
      SET last_message_at = (
        SELECT MAX(messages.created_at)
        FROM messages
        WHERE messages.conversation_id = conversations.id
      )
    SQL
  end

  def down
    execute <<~SQL
      UPDATE conversations
      SET last_message_at = NULL
    SQL
  end
end
