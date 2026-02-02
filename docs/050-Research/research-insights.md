# Research Insights: Automation Engine & Visual Editor

This document summarizes findings and opportunities for upgrading the Evolution Sync automation ecosystem.

## Current State Analysis (`v1.0`)
- **Triggers**: Static matching (Provider, Type, Source, Text Contains).
- **Execution**: Linear (Match → Actions).
- **Actions**: Simple (`send_message`, `http_request`).
- **Data Model**: Flexible `JSONB` for triggers and actions, but logic is hardcoded in `automationEngine.js`.

## Modern Trends (2024-2025)
### 1. Advanced Logic Nodes
- **Conditional Branching**: "IF" nodes that check message content, user data, or time.
- **Wait/Delay**: Pausing workflows for a set duration or until an event occurs.
- **AB Testing**: Splitting traffic between different response paths.

### 2. AI & NLP Integration
- **LLM Nodes**: Sending the message context to GPT-4/Claude for intelligent replies.
- **Sentiment Analysis**: Changing the flow if the user sounds frustrated.
- **Intent Recognition**: Mapping phrases to specific intents rather than static keywords.

### 3. Interactive Messaging (Evolution API Native)
- **Buttons & Lists**: Sending interactive response options instead of just text.
- **Flows**: Multi-step forms inside WhatsApp.

### 4. Ecosystem Integrations
- **CRM Triggers**: Triggering a WhatsApp message from an external system (e.g., "Order Placed").
- **Variable Support**: Capturing user input (e.g., "What is your name?") and using it in later nodes.

## Technical Opportunities for "Existing Models"
- **Unified Adapter Protocol**: Standardizing how `TriggerNode` and `ActionNode` payloads are structured to support 10+ providers.
- **Stateful Engine**: Storing the "current node" for a user so they can be in the middle of a multi-step conversation.
- **Dynamic Variable Injection**: Using `{{name}}` or `{{last_order}}` in action nodes.
