class CreateConversationParticipants < ActiveRecord::Migration[7.1]
  def change
    create_table :conversation_participants do |t|
      t.references :user, null: false, foreign_key: true
      t.references :conversation, null: false, foreign_key: true

      t.timestamps
    end
    add_index :conversation_participants, [:user_id, :conversation_id], unique: true
  end
end
