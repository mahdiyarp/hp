-- HesabPak PostgreSQL initialization script
-- Run on first container startup

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for performance
-- These will be added by Alembic migrations, but we can pre-create common ones

-- Example: GIN index for full-text search on invoices
-- CREATE INDEX IF NOT EXISTS idx_invoices_search ON invoices USING gin(to_tsvector('english', description));

-- Example: B-tree indexes for foreign keys
-- CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
-- CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Set timezone
SET timezone TO 'UTC';

-- Grant permissions (already handled by POSTGRES_USER, but explicit for clarity)
-- GRANT ALL PRIVILEGES ON DATABASE hesabpak TO postgres;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'HesabPak database initialized successfully';
END $$;
