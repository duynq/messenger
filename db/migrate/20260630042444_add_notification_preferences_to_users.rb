class AddNotificationPreferencesToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :notification_preferences, :jsonb, default: {
      'channels' => { 'in_app' => true, 'web_push' => true, 'email' => false },
      'types' => {
        'new_message' => true,
        'mention' => true,
        'added_to_group' => true,
        'removed_from_group' => true,
        'group_renamed' => true,
        'admin_transferred' => true
      },
      'email_digest' => 'none',
      'quiet_hours' => nil
    }
  end
end
