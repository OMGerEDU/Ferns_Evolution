---
id: PRD-001
type: prd
status: draft
project: EvolutionBackend
created: 2026-01-26
---

# PRD - Multi-Provider Automation Engine

## 1. Problem Statement
SaaS users need a way to automate WhatsApp replies regardless of whether they use Evolution API or Green API. Currently, the backend is specialized for Evolution API and lacks a multi-tenant rule engine.

## 2. Target Audience
- **SaaS Owners**: Using this project as their messaging engine.
- **End-Users**: Customers of the SaaS who want to set "Auto-replies" on their numbers.

## 3. Core Features (MVP)
- **Universal Webhook Relay**: A single entry point that accepts webhooks from any provider and maps them to a specific tenant.
- **Rule Engine**: 
    - Trigger: Message Received (matching keywords/types).
    - Actions: 
        - `send_message`: Reply via WhatsApp.
        - `http_request`: Send data to an external URL (Webhooks).
- **Multi-Tenancy**: All rules and connections isolated by `tenant_id`.
- **Local Testing UI**: Integrated into the existing `/admin` playground for testing before SaaS exposure.

## 4. User Experience (Dashboard)
1. User connects Number (Selects Provider: Evolution/Green).
2. User copies the generated Webhook URL from the dashboard.
3. User pastes URL into Provider console (e.g., Green API settings).
4. User defines a rule: "If message starts with 'Price', reply with '$10'".

## 5. Success Metrics
- Webhook processing latency < 200ms.
- 100% tenant isolation (User A never sees User B's messages).

---
[[Roadmap]] | [[SDD-EvolutionBackend]]
