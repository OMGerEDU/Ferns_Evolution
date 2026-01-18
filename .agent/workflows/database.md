---
description: database operations for Evolution API PostgreSQL - strict and professional
---

# Database Management Protocol

> ⚠️ **STRICT MODE**: All database operations require careful planning and verification.

## Database Context
This project uses **TWO separate databases**:

| Database | Location | Purpose |
|----------|----------|---------|
| **Evolution Postgres** | VPS Docker | WhatsApp session persistence, instances |
| **Supabase** | AdminPanel (Vercel) | User data, numbers, messages, chats |

This workflow focuses on the **Evolution Postgres** database running in Docker.

## Evolution Database
### Connection
```bash
# Inside Docker network
DATABASE_CONNECTION_URI=postgresql://evolution:password@postgres:5432/evolution

# Direct access from VPS host
docker exec -it evolution_db psql -U evolution -d evolution
```

### Critical Tables
Evolution API manages its own schema. Key tables:
- `Instance` - WhatsApp instance configurations
- `Session` - Baileys session data (DO NOT TOUCH)
- `Message` - Message cache (temporary)

## Schema Change Protocol

### 1. NEVER modify Evolution's internal tables
Evolution API manages its own database schema. Manual changes can corrupt WhatsApp sessions.

### 2. For AdminPanel's Supabase
Schema changes for the AdminPanel (numbers, chats, messages) should be done in the AdminPanel project, not here.

Relevant columns to understand:
```sql
-- In AdminPanel's Supabase
ALTER TABLE numbers ADD COLUMN provider TEXT DEFAULT 'green-api';
ALTER TABLE numbers ADD COLUMN instance_data JSONB;
-- provider: 'green-api' | 'evolution'
-- instance_data: { "instanceName": "saas_abc_xyz", ... }
```

## Docker Database Persistence
### CRITICAL: Volume Mounting
```yaml
# docker-compose.evolution.yml
postgres:
  volumes:
    - postgres_data:/var/lib/postgresql/data  # MUST preserve data!
```

### Verify Persistence
// turbo-all
1. Check volume exists: `docker volume ls | grep postgres`
2. Restart container: `docker restart evolution_db`
3. Verify data survived: `docker exec -it evolution_db psql -U evolution -c "SELECT COUNT(*) FROM \"Instance\";"`

## Backup Protocol
### Daily Backup (Recommended)
```bash
# From VPS
docker exec evolution_db pg_dump -U evolution evolution > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260112.sql | docker exec -i evolution_db psql -U evolution evolution
```

## Prohibited Actions (Without Explicit Approval)
- ❌ `DROP TABLE` on Evolution tables
- ❌ Manual `DELETE` on Session table
- ❌ Changing Evolution's environment variables mid-operation
- ❌ Removing Docker volumes with data

## Troubleshooting
| Issue | Check | Solution |
|-------|-------|----------|
| Sessions lost after restart | Volume mapping | Add `- postgres_data:/var/lib/postgresql/data` |
| Connection refused | Container status | `docker ps` - restart if needed |
| Instance not found | Postgres sync | Check via `fetchInstances` endpoint |

## Testing Database
```bash
# Check Evolution Postgres is healthy
docker exec evolution_db pg_isready -U evolution

# List instances
docker exec -it evolution_db psql -U evolution -c "SELECT * FROM \"Instance\";"
```
