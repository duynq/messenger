#!/bin/bash
set -e

# Remove any pre-existing server.pid
rm -f /app/tmp/pids/server.pid

IS_MAIN_SERVER=false
if [[ "$*" == *"rails server"* ]] || [[ "$*" == *"rails s"* ]]; then
  IS_MAIN_SERVER=true
fi

if [ "$IS_MAIN_SERVER" = true ]; then
  echo "==> Checking bundle dependencies..."
  bundle check || bundle install
else
  # Wait silently for the web container to finish installing gems
  while ! bundle check >/dev/null 2>&1; do
    sleep 2
  done
fi

wait_for_postgres() {
  if [ "$IS_MAIN_SERVER" = true ]; then
    echo "==> Waiting for Postgres..."
  fi
  for i in $(seq 1 30); do
    if bundle exec ruby -rpg -e "PG.connect(ENV.fetch('DATABASE_URL')).exec('SELECT 1')" >/dev/null 2>&1; then
      if [ "$IS_MAIN_SERVER" = true ]; then
        echo "==> Postgres is ready."
      fi
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_for_postgres

if [ "$IS_MAIN_SERVER" = true ]; then
  echo "==> Preparing database..."
  bundle exec rails db:prepare

  echo "==> Database ready!"
fi

exec "$@"
