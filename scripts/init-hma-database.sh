#!/bin/bash

set -e

echo "Connecting to PostgreSQL to initialize the media_match database..."

# Connect to PostgreSQL and run the SQL initialization script
psql -U media_match -h db -d media_match -f /scripts/hma-schema-init.sql

echo "Database schema initialized successfully." 