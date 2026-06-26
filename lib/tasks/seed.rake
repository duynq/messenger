namespace :seed do
  desc "Seed a specific number of users efficiently"
  task :users, [:count] => :environment do |_t, args|
    count = (args[:count] || 10_000).to_i
    
    puts "🌱 Seeding #{count} users..."
    
    # 1. Generate ONE hashed password to use for all users.
    # BCrypt is intentionally slow. Hashing 10,000 unique passwords would take hours.
    # By using the same hash, we can seed them instantly.
    password = 'password123'
    encrypted_password = User.new(password: password).encrypted_password
    
    now = Time.current
    batch_size = 2_000
    
    # 2. Find the max existing user id to avoid email collisions if run multiple times
    start_id = (User.maximum(:id) || 0) + 1
    
    total_batches = (count.to_f / batch_size).ceil
    
    total_batches.times do |i|
      batch_start = i * batch_size
      batch_count = [batch_size, count - batch_start].min
      
      users_data = []
      
      batch_count.times do |j|
        current_idx = start_id + batch_start + j
        
        users_data << {
          email: "user#{current_idx}@example.com",
          first_name: "User",
          last_name: current_idx.to_s,
          encrypted_password: encrypted_password,
          created_at: now,
          updated_at: now
        }
      end
      
      # 3. Bulk insert is exponentially faster than standard ActiveRecord object creation
      User.insert_all(users_data)
      
      print "."
    end
    
    puts "\n✅ Successfully seeded #{count} users!"
    puts "💡 Sample credentials:"
    puts "   Email: user#{start_id}@example.com"
    puts "   Password: #{password}"
  end
end
