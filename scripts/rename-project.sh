#!/bin/bash
# ──────────────────────────────────────────────────────────
# Project Rename Script
# Usage: ./scripts/rename-project.sh <new_project_name>
# Example: ./scripts/rename-project.sh my_awesome_app
# ──────────────────────────────────────────────────────────
set -e

if [ -z "$1" ]; then
  echo "❌ Usage: $0 <new_project_name>"
  echo "   Example: $0 my_awesome_app"
  echo ""
  echo "   Name should be lowercase with underscores (snake_case)."
  exit 1
fi

NEW_NAME="$1"
NEW_NAME_SNAKE=$(echo "$NEW_NAME" | tr '[:upper:]' '[:lower:]' | tr '-' '_')
NEW_NAME_PASCAL=$(echo "$NEW_NAME_SNAKE" | sed -r 's/(^|_)([a-z])/\U\2/g')
NEW_NAME_KEBAB=$(echo "$NEW_NAME_SNAKE" | tr '_' '-')
NEW_NAME_TITLE=$(echo "$NEW_NAME_PASCAL" | sed 's/\([A-Z]\)/ \1/g' | sed 's/^ //')

echo "🔄 Renaming project..."
echo "   Snake case:  $NEW_NAME_SNAKE"
echo "   Pascal case: $NEW_NAME_PASCAL"
echo "   Kebab case:  $NEW_NAME_KEBAB"
echo "   Title case:  $NEW_NAME_TITLE"
echo ""

# ── Backend ────────────────────────────────────────────────

# Module name in config/application.rb
sed -i '' "s/module MyApp/module ${NEW_NAME_PASCAL}/" config/application.rb

# Session key
sed -i '' "s/_myapp_session/_${NEW_NAME_SNAKE}_session/" config/application.rb

# Database names
sed -i '' "s/myapp_development/${NEW_NAME_SNAKE}_development/g" config/database.yml
sed -i '' "s/myapp_test/${NEW_NAME_SNAKE}_test/g" config/database.yml
sed -i '' "s/myapp_production/${NEW_NAME_SNAKE}_production/g" config/database.yml

# Docker Compose
sed -i '' "s/POSTGRES_USER: myapp/POSTGRES_USER: ${NEW_NAME_SNAKE}/" docker-compose.yml
sed -i '' "s/POSTGRES_PASSWORD: myapp_password/POSTGRES_PASSWORD: ${NEW_NAME_SNAKE}_password/" docker-compose.yml
sed -i '' "s/POSTGRES_DB: myapp_development/POSTGRES_DB: ${NEW_NAME_SNAKE}_development/" docker-compose.yml
sed -i '' "s/pg_isready -U myapp/pg_isready -U ${NEW_NAME_SNAKE}/" docker-compose.yml
sed -i '' "s|postgres://myapp:myapp_password@db:5432/myapp_development|postgres://${NEW_NAME_SNAKE}:${NEW_NAME_SNAKE}_password@db:5432/${NEW_NAME_SNAKE}_development|" docker-compose.yml
sed -i '' "s/MINIO_BUCKET: myapp-files/MINIO_BUCKET: ${NEW_NAME_KEBAB}-files/" docker-compose.yml

# MinIO setup script
sed -i '' "s/myapp-files/${NEW_NAME_KEBAB}-files/g" scripts/minio-setup.sh

# Storage config
sed -i '' "s/myapp-files/${NEW_NAME_KEBAB}-files/" config/storage.yml

# ── Frontend ───────────────────────────────────────────────

# App title in layout
sed -i '' "s/title: 'MyApp'/title: '${NEW_NAME_TITLE}'/" frontend/src/app/\[locale\]/layout.tsx

# Branding in messages (i18n)
sed -i '' "s/MyApp/${NEW_NAME_TITLE}/g" frontend/messages/en.json
sed -i '' "s/MyApp/${NEW_NAME_TITLE}/g" frontend/messages/vi.json

echo ""
echo "✅ Project renamed to '${NEW_NAME_TITLE}' successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes: git diff"
echo "   2. Run: docker compose up --build"
echo "   3. Start building your app!"
