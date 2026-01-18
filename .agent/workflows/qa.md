---
description: QA testing workflow for Evolution API infrastructure
---

# QA Testing Protocol

## Project Type
This is a **VPS Docker infrastructure** project. Testing focuses on:
- Docker container health
- API endpoint availability
- Webhook delivery
- Session persistence

## Testing Categories

### 1. Infrastructure Tests (Docker)
// turbo-all
Before any deployment, run these checks:

```bash
# Build and start
docker-compose -f docker-compose.evolution.yml down
docker-compose -f docker-compose.evolution.yml build
docker-compose -f docker-compose.evolution.yml up -d

# Verify all containers running
docker ps

# Check Evolution health
curl http://localhost:8080/health

# Check Postgres health
docker exec evolution_db pg_isready -U evolution

# Check Redis health
docker exec evolution_redis redis-cli ping
```

### 2. API Endpoint Tests
```bash
# Test instance creation
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: your-api-key" \
  -d '{"instanceName": "test_instance", "qrcode": true}'

# Test instance listing
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: your-api-key"

# Test instance deletion
curl -X DELETE http://localhost:8080/instance/delete/test_instance \
  -H "apikey: your-api-key"
```

### 3. Persistence Tests (CRITICAL)
```bash
# Create test instance
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: your-api-key" \
  -d '{"instanceName": "persistence_test", "qrcode": true}'

# Restart containers
docker-compose -f docker-compose.evolution.yml restart

# Wait for restart
sleep 10

# Verify instance still exists
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: your-api-key" | grep persistence_test

# Cleanup
curl -X DELETE http://localhost:8080/instance/delete/persistence_test \
  -H "apikey: your-api-key"
```

### 4. Security Tests
```bash
# Test without API key (should fail with 401)
curl http://localhost:8080/instance/fetchInstances
# Expected: 401 Unauthorized

# Test with wrong API key (should fail with 401)
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: wrong-key"
# Expected: 401 Unauthorized
```

### 5. Webhook Tests
Use ngrok or similar to test webhooks locally:
```bash
# Start ngrok
ngrok http 3000

# Configure Evolution webhook URL
# WEBHOOK_GLOBAL_URL=https://your-ngrok-url/api/webhooks/evolution

# Trigger connection test and observe webhook delivery
```

## Testing Checklist

### Before Deployment
- [ ] All containers start successfully
- [ ] Health endpoint returns 200
- [ ] API key authentication works
- [ ] Instances persist after restart
- [ ] Webhooks are configured correctly
- [ ] SSL certificate valid (production only)

### Evolution API Specific
- [ ] Instance creation works
- [ ] QR code generation works
- [ ] Instance deletion works
- [ ] Message sending works (when connected)
- [ ] Webhook events are delivered

## Load Testing
```bash
# Install hey (HTTP load generator)
# https://github.com/rakyll/hey

# Test health endpoint under load
hey -n 1000 -c 50 http://localhost:8080/health

# Test instance fetch under load
hey -n 100 -c 10 -H "apikey: your-key" http://localhost:8080/instance/fetchInstances
```

## Chaos Testing
Test failure scenarios:
1. **Kill Evolution container** → Check Postgres/Redis still running
2. **Kill Postgres container** → Restart and verify data restored from volume
3. **Network disconnect** → Verify reconnection after network restore
4. **Disk full simulation** → Ensure graceful error handling

## Monitoring Verification
- [ ] UptimeRobot/BetterStack configured for `/health`
- [ ] Alerts set up for downtime
- [ ] Log rotation configured
- [ ] Disk space monitoring active

## Debugging Failed Tests
```bash
# Check Evolution logs
docker logs evolution_api

# Check Postgres logs
docker logs evolution_db

# Check Redis logs
docker logs evolution_redis

# Interactive shell into container
docker exec -it evolution_api /bin/sh
```

## Test Environment Cleanup
```bash
# Stop all containers
docker-compose -f docker-compose.evolution.yml down

# Remove volumes (CAUTION: deletes data)
docker-compose -f docker-compose.evolution.yml down -v

# Remove all test instances
# (Do this via API before removing volumes)
```
