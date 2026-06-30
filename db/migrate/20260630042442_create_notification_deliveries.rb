class CreateNotificationDeliveries < ActiveRecord::Migration[7.1]
  def change
    create_table :notification_deliveries do |t|
      t.references :notification, null: false, foreign_key: { on_delete: :cascade }
      t.string     :channel, null: false, limit: 20
      t.string     :status, null: false, default: 'pending', limit: 20
      t.integer    :attempts, default: 0
      t.integer    :max_attempts, default: 3
      t.text       :last_error
      t.datetime   :delivered_at
      t.datetime   :next_retry_at
      t.timestamps
    end

    add_index :notification_deliveries, [:notification_id, :channel], unique: true, name: 'idx_notification_deliveries_unique'
    add_index :notification_deliveries, :status, name: 'idx_notification_deliveries_status'
  end
end
