class AddLastMessageAtToConversations < ActiveRecord::Migration[7.1]
  def change
    add_column :conversations, :last_message_at, :datetime, null: true
    add_index :conversations, :last_message_at, order: { last_message_at: :desc }
  end
end
