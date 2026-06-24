# ──────────────────────────────────────────────────────────
# Seed Data
# ──────────────────────────────────────────────────────────
# Run with: bundle exec rails db:seed

puts "🌱 Seeding database..."

# Create a default admin/test user
user = User.find_or_create_by!(email: "admin@example.com") do |u|
  u.first_name = "Admin"
  u.last_name = "User"
  u.password = "password123"
  u.password_confirmation = "password123"
end

puts "  ✅ Created user: #{user.email}"

# Create example posts
3.times do |i|
  Post.find_or_create_by!(user: user, title: "Example Post #{i + 1}") do |p|
    p.body = "This is an example post body. Replace this with your own seed data."
    p.published = i.even?
  end
end

puts "  ✅ Created #{Post.count} example posts"
puts "🌱 Seeding complete!"
