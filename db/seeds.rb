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

puts "🌱 Seeding complete!"
