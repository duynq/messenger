namespace :db do
  desc "Xoá các messages có trong Database nhưng chưa được index lên Elasticsearch"
  task cleanup_unindexed_messages: :environment do
    puts "🚀 Bắt đầu quá trình dọn dẹp các bản ghi mồ côi..."
    
    # Sử dụng bảng UNLOGGED (nhanh hơn TEMP table nếu thao tác bằng insert_all)
    # Vì bảng TEMP của connection hiện tại đôi khi gặp rắc rối với transaction lớn
    ActiveRecord::Base.connection.execute("DROP TABLE IF EXISTS indexed_message_ids")
    ActiveRecord::Base.connection.execute("CREATE UNLOGGED TABLE indexed_message_ids (id integer PRIMARY KEY)")
    
    puts "⏳ Đang quét danh sách ID từ Elasticsearch bằng Scroll API..."
    client = Searchkick.client
    index_name = Message.searchkick_index.name
    
    # Khởi tạo Scroll request, không cần _source vì ta chỉ cần _id
    begin
      response = client.search(
        index: index_name,
        scroll: '5m',
        size: 10000,
        body: { _source: false } 
      )
    rescue => e
      puts "❌ Lỗi kết nối Elasticsearch: #{e.message}"
      return
    end
    
    scroll_id = response['_scroll_id']
    hits = response['hits']['hits']
    
    total_indexed = 0
    ids_batch = []
    
    while hits && hits.any? do
      hits.each do |hit|
        ids_batch << hit['_id'].to_i
      end
      
      # Batch insert mỗi 50,000 ID để không làm ngập RAM
      if ids_batch.size >= 50000
        values = ids_batch.map { |id| "(#{id})" }.join(",")
        ActiveRecord::Base.connection.execute("INSERT INTO indexed_message_ids (id) VALUES #{values} ON CONFLICT DO NOTHING")
        total_indexed += ids_batch.size
        puts "   👉 Đã quét và ghi tạm #{total_indexed} IDs..."
        ids_batch.clear
      end
      
      response = client.scroll(scroll_id: scroll_id, scroll: '5m')
      scroll_id = response['_scroll_id']
      hits = response['hits']['hits']
    end
    
    # Insert nốt phần còn lại
    if ids_batch.any?
      values = ids_batch.map { |id| "(#{id})" }.join(",")
      ActiveRecord::Base.connection.execute("INSERT INTO indexed_message_ids (id) VALUES #{values} ON CONFLICT DO NOTHING")
      total_indexed += ids_batch.size
    end
    
    puts "✅ Hoàn tất! Đã tìm thấy chính xác #{total_indexed} messages tồn tại trên Elasticsearch."
    
    puts "⏳ Đang Drop GIN Index để tăng tốc độ xoá hàng triệu bản ghi..."
    ActiveRecord::Base.connection.execute("DROP INDEX IF EXISTS index_messages_on_searchable")
    
    puts "⏳ Đang tiến hành xử tử các bản ghi không có tên trong danh sách... Sẽ mất khoảng vài phút..."
    start_delete = Time.now
    
    # Sử dụng NOT EXISTS thay vì NOT IN để tối ưu hoá cho lượng dữ liệu khổng lồ
    ActiveRecord::Base.connection.execute("
      DELETE FROM messages 
      WHERE NOT EXISTS (
        SELECT 1 FROM indexed_message_ids 
        WHERE indexed_message_ids.id = messages.id
      )
    ")
    
    end_delete = Time.now
    puts "✅ Đã xoá xong các bản ghi thừa trong #{(end_delete - start_delete).round(2)} giây."
    
    puts "⏳ Đang tạo lại GIN Index..."
    ActiveRecord::Base.connection.execute("CREATE INDEX index_messages_on_searchable ON messages USING gin (searchable)")
    
    puts "⏳ Đang xoá bảng tạm..."
    ActiveRecord::Base.connection.execute("DROP TABLE IF EXISTS indexed_message_ids")
    
    puts "🎉 HOÀN TẤT CÔNG VIỆC DỌN DẸP!"
  end
end
