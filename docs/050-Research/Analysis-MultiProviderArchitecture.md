---
id: RS-001
type: research
status: review
project: EvolutionBackend
created: 2026-01-26
---

# Analysis - Multi-Provider Architecture

Strategic research on abstracting multiple WhatsApp providers (Evolution API & Green API) to support a scalable SaaS automation engine.

## 🎯 Objective
Design a unified backend that handles incoming messages (webhooks) and executes automations across different providers, maintaining tenant isolation and data consistency.

## 🔍 Key Research Insights

### 1. Provider Landscape
- **Evolution API**: Flexible, supports Baileys (web-based) and Official Cloud API. Excellent for open-source self-hosting.
- **Green API**: Simple HTTP-based, handles hosting for you. Good for low-maintenance integrations.
- **Unified Logic**: Both require a wrapper that normalizes disparate payload formats into a singular internal `MessageEvent`.

### 2. Multi-Tenant Webhook Management
Best practice for SaaS is to provide a **unique webhook URL per user**.
- **Format**: `https://evolution.builders-tech.com/wh/:provider/:tenantId/:secret`
- **Why?**:
    - Instant tenant identification (no searching payloads for phone numbers).
    - Security: The `:secret` prevents unauthorized webhook spoofing.
    - Routing: Backend can instantly route to the correct user's automation rules.

### 3. Architectural Best Practices
- **Adapter Pattern**: Use a common interface for providers (`BaseProvider`).
- **Idempotency**: Message IDs from providers must be tracked to prevent duplicate processing (critical for webhooks which often retry).
- **Asynchronous Execution**: Webhook handlers should only validate and queue the message. A worker processes the automation logic to ensure the webhook acknowledges within the tight 2-5 second timeout.

## 🏗️ Proposed Strategic Architecture

### Webhook Relay Layer
A dedicated entry point that transforms provider payloads.
- **Evolution Handler**: Map `messages.upsert` fields.
- **Green API Handler**: Map `typeWebhook: outgoingMessageStatus` or incoming types.

### Internal Normalization
All providers target a shared `MessageEvent` schema:
```json
{
  "tenantId": "uuid",
  "provider": "evolution|greenapi",
  "from": "whatsapp_number",
  "content": "text_or_media_url",
  "timestamp": "iso_string"
}
```

### Automation Engine
Evaluates normalized `MessageEvents` against user rules. Since every event is now standardized, logic for "When X do Y" only needs to be written once.

## 🚧 Common Pitfalls
- **Infinite Loops**: When two automations respond to each other. Requires strict "From Me" filtering at the relay layer.
- **Provider Stability**: Unofficial APIs (Evolution Baileys) can be unstable. Architecture must handle service downtime gracefully.

---
[[Research-MOC]] | [[PRD-EvolutionBackend]]
