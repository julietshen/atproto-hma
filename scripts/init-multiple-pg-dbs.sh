#!/bin/bash

set -e
set -u

# Function to create users and databases
function create_user_and_db() {
    local database=$1
    echo "Creating user and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

# Create multiple databases if specified
if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_db $db
    done
    echo "Multiple databases created"
fi

# Create media_match user for HMA with full privileges
echo "Creating media_match user for HMA with expanded privileges"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    DROP USER IF EXISTS media_match;
    CREATE USER media_match WITH PASSWORD 'hunter2';
    GRANT ALL PRIVILEGES ON DATABASE media_match TO media_match;
    ALTER USER media_match WITH SUPERUSER;
EOSQL

# Connect to the media_match database specifically to set schema permissions
echo "Setting schema permissions for media_match in media_match database"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d media_match <<-EOSQL
    -- Set default privileges for future objects
    ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO media_match;
    ALTER DEFAULT PRIVILEGES GRANT ALL ON SEQUENCES TO media_match;
    ALTER DEFAULT PRIVILEGES GRANT ALL ON FUNCTIONS TO media_match;
    
    -- Grant usage on the public schema
    GRANT USAGE ON SCHEMA public TO media_match;
    
    -- Make media_match the owner of the public schema
    ALTER SCHEMA public OWNER TO media_match;
EOSQL 