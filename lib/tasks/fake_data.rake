namespace :db do
  desc "Sinh 50 triệu fake messages trực tiếp trong Postgres để test hiệu năng"
  task fake_50m: :environment do
    puts "🚀 Bắt đầu quá trình tạo 50 triệu Messages..."
    
    # 1. Đảm bảo có User và Conversation
    puts "👉 Đang chuẩn bị dữ liệu vệ tinh (Users và Conversations)..."
    
    # Lấy ID của một User có sẵn (admin) để làm admin cho các group, hoặc tạo mới nếu chưa có
    admin_user = User.first || User.create!(
      email: "admin_fake_#{Time.now.to_i}@example.com",
      first_name: "Admin",
      last_name: "Fake",
      password: "password123",
      password_confirmation: "password123"
    )

    # Sinh 100 Users bằng insert_all cho nhanh
    users_data = 100.times.map do |i|
      {
        email: "fake_user_#{i}_#{Time.now.to_i}@example.com",
        first_name: "Fake",
        last_name: "User #{i}",
        encrypted_password: admin_user.encrypted_password, # Dùng chung password đã mã hoá cho lẹ
        created_at: Time.now,
        updated_at: Time.now
      }
    end
    User.insert_all(users_data) unless User.count > 100

    user_ids = User.limit(100).pluck(:id)
    min_user_id = user_ids.min
    max_user_id = user_ids.max

    # Sinh 1000 Conversations bằng insert_all
    convs_data = 1000.times.map do |i|
      {
        name: "Fake Group #{i}",
        is_group: true,
        admin_id: admin_user.id,
        created_at: Time.now,
        updated_at: Time.now
      }
    end
    Conversation.insert_all(convs_data) unless Conversation.count > 1000
    
    conv_ids = Conversation.limit(1000).pluck(:id)
    min_conv_id = conv_ids.min
    max_conv_id = conv_ids.max

    puts "✅ Đã có ít nhất #{User.count} users và #{Conversation.count} conversations."
    puts "⏳ Đang Drop GIN index để tối ưu tốc độ insert..."
    
    ActiveRecord::Base.connection.execute("DROP INDEX IF EXISTS index_messages_on_searchable")
    
    # Rút xuống 5 triệu vì 50 triệu tốn khoảng 20GB, máy hiện tại chỉ còn trống 6.8GB
    total_records = 5_000_000 
    chunk_size = 1_000_000
    chunks = total_records / chunk_size
    
    puts "⏳ Đang chạy RAW SQL để insert #{total_records} records chia làm #{chunks} đợt..."

    start_time = Time.now
    
    chunks.times do |i|
      chunk_start = Time.now
      sql = <<-SQL
        INSERT INTO messages (conversation_id, user_id, content, message_type, created_at, updated_at)
        SELECT 
          floor(random() * (#{max_conv_id} - #{min_conv_id} + 1) + #{min_conv_id})::int, 
          floor(random() * (#{max_user_id} - #{min_user_id} + 1) + #{min_user_id})::int, 
          'This is a fake message number ' || j || ' (chunk #{i+1}) to test database performance.', 
          'user', 
          NOW() - (random() * (interval '365 days')), 
          NOW()
        FROM generate_series(1, #{chunk_size}) AS j;
      SQL

      ActiveRecord::Base.connection.execute(sql)
      chunk_end = Time.now
      puts "  ✅ Đã insert đợt #{i + 1}/#{chunks} (#{chunk_size} records) trong #{(chunk_end - chunk_start).round(2)}s"
    end
    
    insert_time = Time.now
    
    puts "✅ Đã sinh #{total_records} messages thành công trong #{(insert_time - start_time).round(2)} giây."
    puts "⏳ Đang tạo lại GIN index cho cột searchable (tốn thêm khoảng vài phút)..."
    
    ActiveRecord::Base.connection.execute("CREATE INDEX index_messages_on_searchable ON messages USING gin (searchable)")
    
    end_time = Time.now
    
    puts "✅ Hoàn tất toàn bộ! Tổng thời gian chạy: #{(end_time - start_time).round(2)} giây."
    
    puts "\n"
    puts "⚠️ LƯU Ý: Các messages này CHƯA được đưa vào Elasticsearch."
    puts "👉 Nếu bạn muốn đưa vào Elasticsearch để test tìm kiếm, hãy chạy lệnh sau (RẤT LÂU):"
    puts "   rake elasticsearch:reindex_all"
  end

  desc "Sinh 5 triệu fake users trực tiếp trong Postgres để test hiệu năng search user"
  task fake_5m_users: :environment do
    puts "🚀 Bắt đầu quá trình tạo 5 triệu Users..."
    
    admin_user = User.first || User.create!(
      email: "admin_fake_#{Time.now.to_i}@example.com",
      first_name: "Admin",
      last_name: "Fake",
      password: "password123",
      password_confirmation: "password123"
    )

    puts "⏳ Đang Drop 3 GIN indexes (Trigram) để tối ưu tốc độ insert..."
    ActiveRecord::Base.connection.execute("DROP INDEX IF EXISTS index_users_on_email_trigram")
    ActiveRecord::Base.connection.execute("DROP INDEX IF EXISTS index_users_on_first_name")
    ActiveRecord::Base.connection.execute("DROP INDEX IF EXISTS index_users_on_last_name")
    
    total_records = 5_000_000 
    chunk_size = 1_000_000
    chunks = total_records / chunk_size
    
    puts "⏳ Đang chạy RAW SQL để insert #{total_records} records chia làm #{chunks} đợt..."

    start_time = Time.now
    password_hash = admin_user.encrypted_password
    
    chunks.times do |i|
      chunk_start = Time.now
      
      sql = <<-SQL
        INSERT INTO users (email, first_name, last_name, encrypted_password, created_at, updated_at)
        SELECT 
          'fake_user_' || j || '_' || #{Time.now.to_i} || '_' || #{i} || '@example.com', 
          'Fake', 
          'User ' || j, 
          '#{password_hash}', 
          NOW() - (random() * (interval '365 days')), 
          NOW()
        FROM generate_series(1, #{chunk_size}) AS j;
      SQL

      ActiveRecord::Base.connection.execute(sql)
      chunk_end = Time.now
      puts "  ✅ Đã insert đợt #{i + 1}/#{chunks} (#{chunk_size} records) trong #{(chunk_end - chunk_start).round(2)}s"
    end
    
    insert_time = Time.now
    
    puts "✅ Đã sinh #{total_records} users thành công trong #{(insert_time - start_time).round(2)} giây."
    puts "⏳ Đang tạo lại 3 GIN indexes cho các cột (tốn thêm khoảng vài phút)..."
    
    ActiveRecord::Base.connection.execute("CREATE INDEX index_users_on_email_trigram ON users USING gin (email gin_trgm_ops)")
    ActiveRecord::Base.connection.execute("CREATE INDEX index_users_on_first_name ON users USING gin (first_name gin_trgm_ops)")
    ActiveRecord::Base.connection.execute("CREATE INDEX index_users_on_last_name ON users USING gin (last_name gin_trgm_ops)")
    
    end_time = Time.now
    
    puts "✅ Hoàn tất toàn bộ! Tổng thời gian chạy: #{(end_time - start_time).round(2)} giây."
  end
end
