---
id: CLAR-001
type: clarification
status: review
project: EvolutionBackend
created: 2026-01-26
---

# Clarification & Understanding - Multi-Provider SaaS

To design a robust, scalable architecture for your SaaS automations, I need to align on a few key structural decisions.

## 🧠 Current Understanding
- **SaaS Model**: The project will serve multiple customers (tenants), each with their own WhatsApp numbers.
- **Provider Mix**: You use both **Evolution API** and **Green API**.
- **Requirement**: Automations (e.g., "when X do Y") must work regardless of the provider.
- **Complexity**: Unique webhooks per user are likely required to route incoming messages correctly to their respective automation rules.

## ❓ Clarification Questions

1. **User/Tenant Management**: Do you already have a `users` or `tenants` table in your database? Should the `automations` table link to a `tenant_id` (UUID), or is there another identifier you prefer?
2. **Webhook URL Generation**: Is my proposal of providing each user with a unique, secure URL (e.g., `https://backend.com/wh/{{provider}}/{{tenant_id}}/{{secret}}`) acceptable? This simplifies routing and increases security.
3. **Provider Selection**: Will users be able to connect both Evolution and Green API numbers to the *same* account? If so, we'll need a way for the user to specify the provider during the number setup phase.
4. **Shared vs. Dedicated Instances**: 
   - Will you be hosting a massive "Super Instance" of Evolution API for all users?
   - Or will each user (or you, on their behalf) create a dedicated instance?
   - *Note: This affects how we name instances for loop-prevention.*
5. **Message Persistence**: Do you want the backend to store a history of all incoming/outgoing messages processed by the automation engine, or just the automation rules themselves?
6. **Existing Webhook Handler**: You mentioned "when message received is already here". Is this handler meant for *internal* use only, or is it already serving customers?

## ⏭️ Next Steps
Once these are answered, I will proceed to:
1. **Strategic Roadmap**: Phasing the integration of Green API and the new Webhook Relay.
2. **PRD**: Defining the final feature set for the Automation Engine.

---
[[Analysis-MultiProviderArchitecture]] | [[000-Index]]
