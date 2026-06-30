class CreatePushSubscriptions < ActiveRecord::Migration[7.1]
  def change
    create_table :push_subscriptions do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.text       :endpoint, null: false
      t.text       :p256dh_key, null: false
      t.text       :auth_key, null: false
      t.text       :user_agent
      t.boolean    :active, default: true
      t.datetime   :last_used_at
      t.timestamps
    end

    add_index :push_subscriptions, :endpoint, unique: true, name: 'idx_push_subscriptions_endpoint'
    add_index :push_subscriptions, :user_id, where: 'active = TRUE', name: 'idx_push_subscriptions_user_active'
  end
end
