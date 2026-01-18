---
description: frontend integration guidelines for AdminPanel connecting to Evolution API
---

# Frontend Integration Guidelines

## ⚠️ Important: This is NOT a Frontend Project

**EvolutionBackend** is a VPS Docker project that hosts Evolution API. 
It has NO frontend code. All frontend development happens in the **AdminPanel** project.

## Context for AdminPanel Frontend

When the AdminPanel (separate project) integrates with this Evolution Backend:

### Components to Create in AdminPanel
```
📁 AdminPanel/src/components/
├── Numbers/
│   ├── ProviderSelector.jsx    # Radio: GreenAPI / Evolution
│   ├── QRCodeDisplay.jsx       # Base64 image renderer
│   └── ProviderBadge.jsx       # Show provider icon
```

### Add Number Flow (AdminPanel)
1. User selects "Evolution API" provider
2. AdminPanel calls `POST /api/numbers/create` with `provider: "evolution"`
3. AdminPanel proxies to Evolution: `POST /instance/create`
4. Evolution returns QR code base64
5. AdminPanel displays QR code to user
6. User scans with phone
7. Evolution sends webhook → AdminPanel updates `numbers.status`

### Environment Variables (AdminPanel)
```bash
EVOLUTION_API_URL=https://wa.ferns.app
EVOLUTION_GLOBAL_API_KEY=your-secret-key
```

## If You Need to Modify This Project

This project only contains:
- Documentation (`.md` files)
- Docker configuration (`docker-compose.evolution.yml`)
- Workflow definitions (`.agent/workflows/`)

There is no frontend code to modify here.

## AdminPanel Integration Testing

To test the integration:
// turbo
1. Start Evolution Docker stack locally: `docker-compose -f docker-compose.evolution.yml up -d`
2. Verify Evolution is running: `curl http://localhost:8080/health`
3. In AdminPanel project, point `EVOLUTION_API_URL=http://localhost:8080`
4. Test the full flow in AdminPanel's browser

## Cross-Project Communication

```
AdminPanel (Vercel)           EvolutionBackend (VPS)
       │                              │
       ├── POST /instance/create ────►│
       │◄── { qrcode, apikey } ───────┤
       │                              │
       ├── POST /message/sendText ───►│
       │◄── { messageId } ────────────┤
       │                              │
       │◄── Webhook: connection.update├
       │◄── Webhook: messages.upsert ─┤
```

## Related AdminPanel Files
When working on Evolution integration, these AdminPanel files are relevant:
- `api/_utils/providers/evolution.js` - Evolution API client
- `api/v1/webhooks/evolution.js` - Incoming webhooks
- `src/pages/Numbers.jsx` - Number management UI
