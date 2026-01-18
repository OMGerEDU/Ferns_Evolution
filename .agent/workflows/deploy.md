---
description: deployment workflow for Evolution API VPS infrastructure
---

# Deployment Workflow

## Project Type
This is a **VPS Docker deployment** project, NOT a Vercel/frontend project.

## Pre-Deployment Checklist
Before deploying to VPS, verify locally:

// turbo-all
1. Build Docker images: `docker-compose -f docker-compose.evolution.yml build`
2. Start stack: `docker-compose -f docker-compose.evolution.yml up -d`
3. Check container status: `docker ps`
4. Verify health endpoint: `curl http://localhost:8080/health`
5. Check logs for errors: `docker logs evolution_api`

## Docker Deployment (MANDATORY)
After EVERY major change, you MUST rebuild and run Docker:

```bash
# Stop existing containers
docker-compose -f docker-compose.evolution.yml down

# Rebuild with latest changes
docker-compose -f docker-compose.evolution.yml build

# Start fresh
docker-compose -f docker-compose.evolution.yml up -d

# Verify
docker ps
docker logs evolution_api
```

## VPS Deployment Process
1. SSH into VPS: `ssh user@your-vps-ip`
2. Navigate to project: `cd /opt/evolution`
3. Pull latest changes: `git pull`
4. Rebuild and restart: `docker-compose up -d --build`
5. Verify health: `curl https://wa.ferns.app/health`

## Environment Configuration
### Required on VPS:
```bash
AUTHENTICATION_API_KEY=your-super-secret-global-key
DATABASE_CONNECTION_URI=postgresql://evolution:password@postgres:5432/evolution
CACHE_REDIS_URI=redis://redis:6379/0
WEBHOOK_GLOBAL_URL=https://your-admin-panel.vercel.app/api/webhooks/evolution
WEBHOOK_GLOBAL_ENABLED=true
```

## Infrastructure Verification
After deployment, verify:
- [ ] Health endpoint returns 200: `/health`
- [ ] SSL certificate valid (check in browser)
- [ ] Postgres container running: `docker ps | grep postgres`
- [ ] Redis container running: `docker ps | grep redis`
- [ ] Evolution API container running: `docker ps | grep evolution`

## Rollback Procedure
If deployment fails:
1. Check logs: `docker logs evolution_api`
2. Revert to previous image: `docker-compose down && git checkout HEAD~1 && docker-compose up -d --build`
3. Verify service restored

## Monitoring
- Set up UptimeRobot/BetterStack for `/health` endpoint
- Check VPS disk usage weekly
- Monitor container memory usage: `docker stats`

## CRITICAL RULES
- ❌ NEVER expose Evolution API key in code
- ❌ NEVER deploy without testing Docker build locally
- ❌ NEVER skip health endpoint verification
- ✅ ALWAYS use HTTPS in production
- ✅ ALWAYS verify Postgres persistence after restart
