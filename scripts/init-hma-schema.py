#!/usr/bin/env python3
from sqlalchemy import create_engine, text, MetaData, Table, Column, Integer, String, Float, ForeignKey, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base

# Create connection
engine = create_engine('postgresql://media_match:hunter2@db:5432/media_match')
conn = engine.connect()

# Create tables
conn.execute(text("""
CREATE TABLE IF NOT EXISTS signal_type_override (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  enabled_ratio FLOAT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_signal_type_override_name ON signal_type_override(name);

CREATE TABLE IF NOT EXISTS bank (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  enabled_ratio FLOAT NOT NULL,
  import_from_exchange_id INTEGER NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_bank_name ON bank(name);

CREATE TABLE IF NOT EXISTS bank_content (
  id SERIAL PRIMARY KEY,
  bank_id INTEGER NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  verdict VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_bank_content_bank_id ON bank_content(bank_id);

CREATE TABLE IF NOT EXISTS signal_type (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_signal_type_name ON signal_type(name);
"""))

# Commit the transaction
conn.commit()
conn.close()

print("Database schema created successfully!") 