#!/bin/bash
set -e

# Remove any pre-existing server.pid
rm -f /app/tmp/pids/server.pid

wait_for_postgres() {
  echo "==> Waiting for Postgres..."
  for i in $(seq 1 30); do
    if bundle exec ruby -rpg -e "PG.connect(ENV.fetch('DATABASE_URL')).exec('SELECT 1')" >/dev/null 2>&1; then
      echo "==> Postgres is ready."
      return 0
    fi
    echo "    Postgres is not ready yet. Retrying in 2s... ($i/30)"
    sleep 2
  done

  echo "==> Could not connect to Postgres after 30 attempts."
  bundle exec ruby -rpg -e "PG.connect(ENV.fetch('DATABASE_URL')).exec('SELECT 1')"
  return 1
}

wait_for_postgres

echo "==> Preparing database..."
bundle exec rails db:prepare

echo "==> Seeding database..."
bundle exec rails db:seed

echo "==> Database ready!"

exec "$@"
