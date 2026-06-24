# ──────────────────────────────────────────────────────────
# Example Migration — replace with your own models
# ──────────────────────────────────────────────────────────
class CreatePosts < ActiveRecord::Migration[7.1]
  def change
    create_table :posts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.text :body, null: false
      t.boolean :published, default: false, null: false

      t.timestamps
    end

    add_index :posts, [:user_id, :created_at]
    add_index :posts, :published
  end
end
