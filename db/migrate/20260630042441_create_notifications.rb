class CreateNotifications < ActiveRecord::Migration[7.1]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.references :actor, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string     :notifiable_type, null: false, limit: 50
      t.bigint     :notifiable_id, null: false
      t.string     :notification_type, null: false, limit: 50
      t.jsonb      :data, default: {}
      t.datetime   :read_at
      t.timestamps
    end

    add_index :notifications, [:user_id, :created_at], order: { created_at: :desc }, name: 'idx_notifications_user_created'
    add_index :notifications, [:notifiable_type, :notifiable_id], name: 'idx_notifications_notifiable'
    add_index :notifications, :notification_type, name: 'idx_notifications_type'
  end
end
