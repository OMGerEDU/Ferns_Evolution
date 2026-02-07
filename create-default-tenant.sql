-- Create a default tenant for the Evolution Backend
-- Run this in Supabase SQL Editor

-- Check if any tenants exist
SELECT * FROM tenants;

-- Create a tenant with auto-generated UUID
INSERT INTO tenants (name, webhook_secret)
VALUES (
    'Default Organization',
    gen_random_uuid()::text  -- Generate a random webhook secret
)
RETURNING *;

-- Show the created tenant UUID (you'll need this for API calls)
SELECT id, name FROM tenants ORDER BY created_at DESC LIMIT 1;
