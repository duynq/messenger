class CreateConversations < ActiveRecord::Migration[7.1]
  def change
    create_table :conversations do |t|
      t.boolean :is_group, default: false
      t.string :name
      t.references :admin, null: true, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
