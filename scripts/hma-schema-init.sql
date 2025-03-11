-- HMA schema initialization
-- Based on the provided reference image

-- Create enum type for hash types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hashtype') THEN
        CREATE TYPE hashtype AS ENUM ('PDQ', 'MD5', 'SHA256');
    END IF;
END
$$;

-- FetchedData table
CREATE TABLE IF NOT EXISTS "fetched_data" (
    id SERIAL PRIMARY KEY,
    collaboration_name VARCHAR(255) NOT NULL,
    hash_type hashtype NOT NULL,
    data BYTEA NOT NULL
);

-- Bank table
CREATE TABLE IF NOT EXISTS "bank" (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(255) NOT NULL
);

-- BankContent table
CREATE TABLE IF NOT EXISTS "bank_content" (
    id SERIAL PRIMARY KEY,
    fetched_data_id INTEGER REFERENCES fetched_data(id),
    hash_type hashtype NOT NULL,
    hash BYTEA NOT NULL,
    bank_ids INTEGER[] NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Config table
CREATE TABLE IF NOT EXISTS "config" (
    key VARCHAR(255) PRIMARY KEY,
    val TEXT NOT NULL
);

-- Signal type override table
CREATE TABLE IF NOT EXISTS "signal_type_override" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    enabled_ratio FLOAT DEFAULT 1.0,
    signal_id VARCHAR(255) NOT NULL,
    override_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_content_fetched_data_id ON bank_content(fetched_data_id);
CREATE INDEX IF NOT EXISTS idx_bank_content_hash ON bank_content USING hash (hash);
CREATE INDEX IF NOT EXISTS idx_fetched_data_collaboration ON fetched_data(collaboration_name);
CREATE INDEX IF NOT EXISTS idx_signal_type_override_name ON signal_type_override(name);

-- Insert some default configuration if needed
INSERT INTO config (key, val) 
VALUES ('schema_version', '1.0')
ON CONFLICT (key) DO NOTHING; 