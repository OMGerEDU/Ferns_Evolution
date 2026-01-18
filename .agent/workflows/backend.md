---
description: backend API development for Evolution API integration
---

# Backend Development Guidelines

## Project Context
This project hosts Evolution API on a VPS to provide WhatsApp connectivity for the Ferns AdminPanel.

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────┐
│  AdminPanel     │◄──────►│ Evolution       │◄──────►│  WhatsApp   │
│  (Vercel)       │  HTTPS │ Backend (VPS)   │        │  Servers    │
└─────────────────┘        └─────────────────┘        └─────────────┘
```

## Reference Documents
Before making backend changes, review these files in the project root:
- `evolution_backend_spec.md` - Full API specifications and deployment guide
- `architecture_design.md` - System architecture and security patterns
- `architecture_improvements.md` - Scalability and optimization strategies
- `docker-compose.evolution.yml` - Docker stack configuration

## Architecture Principles
1. **Evolution is a "Black Box"** - Treat it as a trusted external service
2. **Session Persistence** - MUST use PostgreSQL and Redis (not SQLite/file)
3. **Security** - All traffic over HTTPS, webhook signature verification
4. **No Direct Access** - Users never talk to Evolution directly; AdminPanel proxies everything

## Docker Workflow (MANDATORY)
// turbo-all
After every major backend change:
1. `docker-compose -f docker-compose.evolution.yml down`
2. `docker-compose -f docker-compose.evolution.yml build`
3. `docker-compose -f docker-compose.evolution.yml up -d`
4. Verify health: `curl http://localhost:8080/health`

## Evolution API Integration

### Authentication
- All requests require `apikey` header
- Use environment variable: `AUTHENTICATION_API_KEY`
- Base URL is configured in Docker Compose

### Key Endpoints
| Evolution Endpoint | Purpose |
|-------------------|---------|
| `POST /instance/create` | Create WhatsApp instance |
| `GET /instance/connect/{name}` | Get QR code for connection |
| `DELETE /instance/delete/{name}` | Delete instance |
| `POST /message/sendText/{name}` | Send WhatsApp message |
| `GET /instance/fetchInstances` | List all instances |

### Webhook Events (Sent to AdminPanel)
1. `connection.update` → Instance connection status changed
2. `messages.upsert` → Incoming message received
3. `send.message` → Outgoing message delivery confirmation

## Error Handling
```javascript
// Standard error codes
| Code | Meaning                    | Recovery Strategy                    |
|------|----------------------------|--------------------------------------|
| 400  | Bad Request                | Log error, return validation message |
| 401  | Unauthorized (invalid key) | Alert admin, check env vars         |
| 404  | Instance not found         | Sync DB state, mark disconnected    |
| 500  | Internal server error      | Log, retry once after 5s            |
```

## Security Checklist
- [ ] HMAC signature verification for webhooks
- [ ] Rate limiting configured in Caddy
- [ ] API key stored securely (never in code)
- [ ] HTTPS only (Caddy handles SSL)
- [ ] Firewall configured (only ports 80, 443, 8080)

## Testing Locally
1. Start the Docker stack: `docker-compose -f docker-compose.evolution.yml up -d`
2. Check logs: `docker logs evolution_api`
3. Test health: `curl http://localhost:8080/health`
4. Test with curl before integrating with AdminPanel

## Instance Naming Convention
All instances MUST follow this pattern: `saas_{user_id}_{random}`
Example: `saas_abc123_xyz789`
