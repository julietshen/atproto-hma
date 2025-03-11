#!/bin/bash

# Exit on error
set -e

echo "Installing PostgreSQL client tools..."
apt-get update && apt-get install -y postgresql-client

echo "Waiting for PostgreSQL to be fully available..."
# Wait for PostgreSQL to be available
for i in {1..30}; do
  if pg_isready -h db -p 5432 -U media_match; then
    echo "PostgreSQL is up and running."
    break
  fi
  echo "Waiting for PostgreSQL to be available... attempt $i/30"
  sleep 2
done

echo "Applying HMA schema..."
# Apply the schema SQL file
psql -U media_match -h db -p 5432 -d hma -f /build/schema-init.sql

echo "Running HMA schema initialization through Python..."
# Run the init_db function from HMA
cd /build && python -c 'from OpenMediaMatch.storage.postgres.database import init_db; init_db()'

echo "HMA database initialization completed successfully!" 