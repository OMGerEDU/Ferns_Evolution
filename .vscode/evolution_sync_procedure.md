# Evolution API Sync Procedure Technical Analysis

This document details the data flow, API endpoints, and critical logic used to synchronize Evolution API (v2) data with the internal Supabase database.

## 0. Verification of Implementation (Proof of Existence)

Contrary to external analysis, the following files and dependencies are **fully implemented** and present in the codebase:

**1. Core Service Files:**
-   `src/services/messageSync.js` (Size: ~36KB)
    -   Contains `pollNewMessages`, `syncChatsToSupabase`, `syncMessagesToSupabase`.
-   `src/services/EvolutionApiService.js` (Size: ~25KB)
    -   Contains full API wrapping (`fetchChats`, `fetchMessages`, `sendText`, etc.).

**2. Dependencies (`package.json`):**
-   `@supabase/supabase-js`: `^2.87.1` (Present in `dependencies` object).

**3. Execution Evidence:**
-   Directory Listing of `src/services/`:
    ```text
    AnalyticsService.js
    EvolutionApiService.js  <-- EXISTS
    ScheduledMessageService.js
    api.js
    ...
    greenApi.js
    messageSync.js          <-- EXISTS
    snapshotService.js
    ```


## 1. Chat Discovery & Metadata (`syncChatsToSupabase`)

**Objective**: Populate the `chats` table with participants, avatars, and basic metadata.

**Logic Location**: `src/services/messageSync.js` -> `syncChatsToSupabase`

### API Interaction
Calls `EvolutionApiService.fetchChats(instanceName)`:
```javascript
// src/services/EvolutionApiService.js
async fetchChats(instanceName) {
    // Endpoint: /api/chats?instanceName={instance}
    // Returns array of chat objects
    const response = await fetch(`${BASE_URL}/api/chats?instanceName=${instanceName}`, { ... });
    // Normalizes result to { id, remoteJid, name, unreadCount, timestamp, ... }
}
```

### Normalization Logic
Critical transformation occurs in `normalizeEvoChats`. Note the handling of Group Names (`@g.us`) which often come as participant names in `pushName`, requiring fallback to `subject` or `groupName`.

```javascript
// src/services/messageSync.js
const normalizeEvoChats = (evoChats) => {
  return (evoChats || []).map(c => ({
    id: c.remoteJid,              // Use actual JID as the ID
    chatId: c.remoteJid,
    remoteJid: c.remoteJid,       
    // PRIORITY: Subject > GroupName > Name > PushName > JID
    name: (typeof c.remoteJid === 'string' && c.remoteJid.includes('@g.us'))
      ? (c.subject || c.groupSubject || c.groupName || c.name || c.remoteJid?.split('@')[0] || 'Unknown')
      : (c.name || c.pushName || c.remoteJid?.split('@')[0] || 'Unknown'),
    image: c.profilePicUrl,       
    unreadCount: c.unreadCount || 0,
    timestamp: c.updatedAt ? new Date(c.updatedAt).getTime() / 1000 : Date.now() / 1000
  }));
};
```

## 2. Message History (`syncMessagesToSupabase`)

**Objective**: Fetch and store messages for a specific chat.

**Logic Location**: `src/services/messageSync.js` -> `syncMessagesToSupabase`

### API Interaction
Calls `EvolutionApiService.fetchMessages`:
```javascript
// src/services/EvolutionApiService.js
async fetchMessages(instanceName, remoteJid, limit = 50) {
    // Endpoint: POST /api/chats/find-messages
    // Body: { where: { key: { remoteJid } }, options: { limit, sort: { "messageTimestamp": "DESC" } } }
    const response = await fetch(`${BASE_URL}/api/chats/find-messages`, ...);
    
    // Response Handling: Standardizes nested `data.data.messages.records` vs `data.messages`
}
```

### Message Normalization
Baileys/Evolution messages are deeply nested. `normalizeEvoMessage` flattens them:

```javascript
// src/services/messageSync.js
const normalizeEvoMessage = (msg) => {
  if (!msg || !msg.key) return null;
  let m = msg.message || {};
  
  // Unwrap wrappers (ViewOnce, Ephemeral, etc.)
  if (m.viewOnceMessage) m = m.viewOnceMessage.message || {};
  if (m.ephemeralMessage) m = m.ephemeralMessage.message || {};
  // ... (other unwinders)

  // Extract Text Content
  const textContent = m.conversation || 
                      m.extendedTextMessage?.text || 
                      m.imageMessage?.caption || ...;

  return {
    idMessage: key.id,
    chatId: key.remoteJid,
    timestamp: msg.messageTimestamp, // Seconds
    type: key.fromMe ? 'outgoing' : 'incoming',
    typeMessage: 'textMessage' | 'imageMessage' | ...,
    textMessage: textContent,
    _raw: msg // Preserve raw for debug
  };
};
```

## 3. Real-time Polling Strategy (`pollNewMessages`)

Since Webhooks are not configured/reliable here, we use **Activity-Based Polling**.

**Logic Location**: `src/services/messageSync.js` -> `pollNewMessages`

```javascript
// src/services/messageSync.js
export async function pollNewMessages(instanceId, token, numberId, onNewMessage, provider) {
  if (provider === 'evolution-api') {
    // 1. Fetch Chat List (Lightweight)
    const evoRes = await EvolutionApiService.fetchChats(instanceId);
    const chats = evoRes.data || [];

    // 2. Filter Active Chats (Updated in last 45s)
    const now = Date.now() / 1000;
    const recentChats = chats.filter(c => (now - c.timestamp) < 45);

    // 3. Sync & Notify
    for (const chat of recentChats) {
      if (!numberId) continue;
      
      // Resolve Internal DB ID
      const { data: dbChat } = await supabase.from('chats').select('id')...;

      if (dbChat) {
         // Fetch latest messages (Deep Sync)
         await syncMessagesToSupabase(dbChat.id, instanceId, token, chat.remoteJid, 20, provider);
      }
      
      // Trigger UI Sound/Update
      if (onNewMessage) onNewMessage({ ... });
    }
  }
}
```

## 4. Database Ingestion Schema

The normalized data is upserted into Supabase:

**Table**: `messages`
-   `green_id` (Text, Unique): Mapped from `msg.key.id`.
-   `chat_id` (UUID): Internal Chat UUID.
-   `content` (Text): Extracted text content.
-   `media_meta` (JSONB): Structured media data (url, caption, type).
-   `timestamp` (Timestamptz).

**Table**: `chats`
-   `remote_jid` (Text, Unique per Number): The WhatsApp JID.
-   `last_message` (Text): Preview.
-   `last_message_at` (Timestamptz).

## 5. Potential Issues for Analysis

1.  **Timestamp Skew**: If the server time differs from Evolution API time, the "45 seconds" filter in `pollNewMessages` might miss chats despite them moving to the top.
2.  **API Response Structure**: Evolution API responses vary by version. `fetchMessages` has logic to handle `data.data`, `data.messages`, etc., but a new structure could break extraction.
3.  **Group Name Persistence**: If `syncChatsToSupabase` runs *after* a user manually renames a chat locally, it might overwrite the local name with the "Last Sender" name if the normalization logic fails to find the Subject.
