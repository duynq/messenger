namespace :elasticsearch do
  desc "Reindex all searchable models"
  task reindex_all: :environment do
    puts "Reindexing Messages..."
    Message.reindex(async: true)  # Background job
    
    puts "Reindexing Users..."
    User.reindex(async: true)
    
    puts "Reindexing started in background"
  end

  desc "Check reindex progress"
  task status: :environment do
    begin
      puts "Messages: #{Message.searchkick_index.total_docs} docs"
      puts "Users: #{User.searchkick_index.total_docs} docs"
    rescue => e
      puts "Error connecting to Elasticsearch: #{e.message}"
    end
  end
end
