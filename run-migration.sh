#!/bin/bash
# Run the builtin automations migration with the same credentials the backend uses

docker exec -i evolution_postgres psql -U evolution -d evolution < migrations/add_builtin_automations.sql
