class AddSearchableToMessages < ActiveRecord::Migration[7.1]
  def change
    add_column :messages, :searchable, :tsvector, as: "to_tsvector('simple', coalesce(content, ''))", stored: true
    add_index :messages, :searchable, using: :gin
  end
end
