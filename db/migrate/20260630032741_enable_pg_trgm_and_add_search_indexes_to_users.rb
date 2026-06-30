class EnablePgTrgmAndAddSearchIndexesToUsers < ActiveRecord::Migration[7.1]
  def change
    enable_extension 'pg_trgm' unless extension_enabled?('pg_trgm')
    
    add_index :users, :first_name, opclass: :gin_trgm_ops, using: :gin
    add_index :users, :last_name, opclass: :gin_trgm_ops, using: :gin
    add_index :users, :email, opclass: :gin_trgm_ops, using: :gin, name: 'index_users_on_email_trigram'
  end
end
