namespace :db do
  desc "Seed a large amount of dummy messages for testing (default: 10,000)"
  task seed_messages: :environment do
    count = (ENV['COUNT'] || 10000).to_i
    batch_size = 1000

    puts "🌱 Preparing to seed #{count} messages..."

    # Ensure we have at least 2 users
    user1 = User.find_by(email: "admin@example.com") || User.create!(
      email: "admin@example.com",
      first_name: "Admin",
      last_name: "User",
      password: "password123",
      password_confirmation: "password123"
    )

    user2 = User.find_by(email: "test@example.com") || User.create!(
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      password: "password123",
      password_confirmation: "password123"
    )

    # Find or create a conversation between them
    conversation = Conversation.joins(:conversation_participants)
                               .where(conversation_participants: { user_id: [user1.id, user2.id] })
                               .group('conversations.id')
                               .having('count(conversation_participants.user_id) = 2')
                               .first

    unless conversation
      conversation = Conversation.create!(is_group: false)
      conversation.conversation_participants.create!(user: user1)
      conversation.conversation_participants.create!(user: user2)
    end

    user_ids = [user1.id, user2.id]
    
    words = %w[apple banana orange computer keyboard mouse monitor table chair window door fast slow run walk sad happy angry excited beautiful clean dirty ruby rails javascript typescript react nextjs database postgresql fulltext search index performance optimization bug feature release testing deploy docker kubernetes aws cloud scalable memory cpu disk network security]

    puts "⏳ Inserting messages in batches of #{batch_size}..."
    
    total_batches = (count / batch_size.to_f).ceil
    
    total_batches.times do |i|
      messages = batch_size.times.map do
        random_time = Time.current - rand(1..365).days - rand(1..24).hours
        {
          conversation_id: conversation.id,
          user_id: user_ids.sample,
          content: Array.new(rand(5..20)) { words.sample }.join(' '),
          created_at: random_time,
          updated_at: random_time,
          message_type: 'user',
          metadata: {}
        }
      end

      # Use insert_all for extremely fast bulk inserts (skips validations/callbacks)
      Message.insert_all(messages)
      print "."
    end

    puts "\n✅ Successfully seeded #{count} messages!"
    puts "📊 Total messages in database: #{Message.count}"
  end
end
