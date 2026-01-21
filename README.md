# Evolution Backend

> **Self-hosted WhatsApp infrastructure for Ferns SaaS**

## Quick Start

### 1. Setup Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 2. Build and Start Docker Stack
```bash
docker-compose build
docker-compose up -d
```

### 3. Verify Installation
```bash
# Check all containers are healthy
docker-compose ps

# Test health endpoint
curl http://localhost:3000/health

# Test detailed health (all services)
curl http://localhost:3000/health/detailed
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VPS (Docker Network)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Backend    │  │  Evolution   │  │   Postgres   │          │
│  │   Service    │──│     API      │──│   Database   │          │
│  │  (Node.js)   │  │  (Baileys)   │  │              │          │
│  │  Port 3000   │  │  Port 8080   │  │  Port 5432   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                                     │
│         │          ┌──────────────┐                            │
│         └──────────│    Redis     │                            │
│                    │  Port 6379   │                            │
│                    └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ HTTPS (Caddy/Nginx)
┌─────────────────┐
│   AdminPanel    │ ◄── Webhooks from Evolution
│    (Vercel)     │
└─────────────────┘
```

## Project Structure

```
EvolutionBackend/
├── src/
│   ├── index.js              # Express server entry point
│   ├── config/
│   │   └── index.js          # Environment configuration
│   ├── routes/
│   │   ├── health.js         # Health check endpoints
│   │   ├── instances.js      # Instance management API
│   │   ├── messages.js       # Message sending API
│   │   └── chats.js          # Chat operations API
│   ├── services/
│   │   ├── evolution.js      # Evolution API client
│   │   └── healthCheck.js    # Health monitoring service
│   ├── middleware/
│   │   ├── auth.js           # API key validation
│   │   ├── errorHandler.js   # Global error handling
│   │   └── logger.js         # Request logging
│   └── utils/
│       ├── logger.js         # Winston logger
│       └── retry.js          # Retry with backoff
├── docker-compose.yml        # Full stack configuration
├── Dockerfile                # Backend service image
├── package.json
└── .env.example
```

## API Endpoints

### Health Checks (No Auth Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Quick liveness check |
| `/health/detailed` | GET | Full stack health |
| `/health/evolution` | GET | Evolution API status |
| `/health/instances` | GET | Instance summary |

### Instance Management (Auth Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/instances` | POST | Create WhatsApp instance |
| `/api/instances` | GET | List all instances |
| `/api/instances/:name` | GET | Get instance details |
| `/api/instances/:name/qr` | GET | Get QR code |
| `/api/instances/:name` | DELETE | Delete instance |
| `/api/instances/:name/logout` | POST | Logout instance |
| `/api/instances/:name/restart` | POST | Restart instance |

### Messaging (Auth Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/messages/text` | POST | Send text message |
| `/api/messages/media` | POST | Send media message |
| `/api/messages/sticker` | POST | Send sticker |
| `/api/messages/audio` | POST | Send audio/voice note (PTT) |

### Chat Operations (Auth Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats/update-message` | PUT | Edit sent message |
| `/api/chats/presence` | POST | Set presence (typing...) |
| `/api/chats/download-media` | POST | Get media base64 |

## Authentication

All `/api/*` endpoints require an API key in the header:
```bash
curl -H "apikey: your-api-key" http://localhost:3000/api/instances
```

## Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop all
docker-compose down

# Rebuild backend only
docker-compose build backend
docker-compose up -d backend

# Check container health
docker-compose ps
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Backend API key | Yes |
| `EVOLUTION_API_KEY` | Evolution API key | Yes |
| `WEBHOOK_GLOBAL_URL` | AdminPanel webhook URL | Yes |
| `POSTGRES_PASSWORD` | Database password | No (default: evolution_password) |

## Health Check Details

The `/health/detailed` endpoint returns:
```json
{
  "healthy": true,
  "timestamp": "2026-01-12T12:00:00.000Z",
  "services": {
    "evolution": { "healthy": true, "latency": 45 },
    "postgres": { "healthy": true, "latency": 12 },
    "redis": { "healthy": true, "latency": 8 }
  }
}
```

## Documentation

| Document | Purpose |
|----------|---------|
| [Architecture Design](./architecture_design.md) | Full system architecture |
| [Architecture Improvements](./architecture_improvements.md) | Scalability strategies |
| [Evolution Backend Spec](./evolution_backend_spec.md) | API specifications |

## Related Projects

- **AdminPanel** - Frontend SaaS that consumes this API
- **BuildersExtension** - Browser extension for WhatsApp automation

## License

Private - Ferns SaaS
