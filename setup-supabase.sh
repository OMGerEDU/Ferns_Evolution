#!/bin/bash
# Verify and setup Supabase database

echo "=== Checking DATABASE_URL ==="
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    echo "Please set it in .env file"
    exit 1
fi

echo "DATABASE_URL is set (showing first 50 chars): ${DATABASE_URL:0:50}..."

echo ""
echo "=== Running schema on Supabase ==="
psql "$DATABASE_URL" < src/db/schema.sql

echo ""
echo "=== Verifying tables exist in Supabase ==="
psql "$DATABASE_URL" -c "\dt builtin_automations"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as template_count FROM builtin_automations;"

echo ""
echo "=== Done! Now restart backend with: ./compose.sh ==="
