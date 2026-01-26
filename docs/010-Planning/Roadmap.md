---
id: ROAD-001
type: roadmap
status: draft
project: EvolutionBackend
created: 2026-01-26
---

# Roadmap - Multi-Provider Automation Engine

A phased plan to transform this backend into a scalable SaaS automation engine supporting both Evolution API and Green API.

## 📍 Phase 1: Foundation (MVP)
*Goal: Support Evolution API rules in a multi-tenant way.*
- [ ] **Infrastructure**: Finalize `evolution.builders-tech.com` webhook entry points.
- [ ] **Data Model**: Implement `tenants` and `automations` tables (linked by `tenant_id`).
- [ ] **webhook Relay**: Build the `/wh/evolution/{{tenant_id}}` handler for Evolution API.
- [ ] **Automation Engine v1**: Support "Text Contains" trigger + `send_message` and `http_request` actions.
- [ ] **Admin UI testing**: Add "Automations" tab to `/admin` for local testing.

## 📍 Phase 2: Green API Integration
*Goal: Broaden support to Green API.*
- [ ] **Adapter Layer**: Implement the `GreenApiAdapter` to normalize Green API webhooks.
- [ ] **webhook Relay**: Build the `/wh/greenapi/{{tenant_id}}` handler.
- [ ] **Multi-Provider Dashboard API**: Unified CRUD for managing rules across both providers.

## 📍 Phase 3: Advanced Automations
*Goal: Add complex logic and media support.*
- [ ] **Rich Actions**: Support sending images, buttons, and documents in replies.
- [ ] **Smart Triggers**: Support "Message Type" (Image/Audio) and "Sender is in Group" triggers.
- [ ] **Loop Prevention 2.0**: Advanced cross-provider loop detection.

## 🧠 Strategic vision
By Phase 3, a user will be able to connect any WhatsApp number (via any supported provider) and set up instant replies without ever knowing the underlying API complexity.

---
[[Analysis-MultiProviderArchitecture]] | [[000-Index]]
