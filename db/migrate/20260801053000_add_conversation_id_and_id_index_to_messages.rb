class AddConversationIdAndIdIndexToMessages < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def change
    add_index :messages,
      [:conversation_id, :id],
      order: { id: :desc },
      name: "index_messages_on_conversation_id_and_id",
      algorithm: :concurrently,
      if_not_exists: true
  end
end
