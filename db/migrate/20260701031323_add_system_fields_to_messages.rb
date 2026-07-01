class AddSystemFieldsToMessages < ActiveRecord::Migration[7.1]
  def change
    add_column :messages, :message_type, :string, default: 'user', null: false
    add_column :messages, :metadata, :jsonb, default: {}
    change_column_null :messages, :content, true
  end
end
