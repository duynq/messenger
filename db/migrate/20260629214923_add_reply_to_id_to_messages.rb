class AddReplyToIdToMessages < ActiveRecord::Migration[7.1]
  def change
    add_reference :messages, :reply_to, foreign_key: { to_table: :messages }, null: true
  end
end
