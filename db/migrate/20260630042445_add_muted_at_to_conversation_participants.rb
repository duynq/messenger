class AddMutedAtToConversationParticipants < ActiveRecord::Migration[7.1]
  def change
    add_column :conversation_participants, :muted_at, :datetime
  end
end
