class AddLastReadAtToConversationParticipants < ActiveRecord::Migration[7.0]
  def change
    add_column :conversation_participants, :last_read_at, :datetime
  end
end
