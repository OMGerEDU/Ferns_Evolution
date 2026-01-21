# Walkthrough - New Evolution API Features

Verified implementation of requested Evolution API v2 features.

## 🚀 New Capabilities

### 1. Message Editing
**Endpoint**: `PUT /api/chats/update-message`
**Usage**:
```bash
curl -X PUT http://localhost:8080/api/chats/update-message \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance",
    "messageKey": "...",
    "newMessage": "Corrected text"
  }'
```

### 2. Stickers
**Endpoint**: `POST /api/messages/sticker`
**Usage**:
```bash
curl -X POST http://localhost:8080/api/messages/sticker \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance",
    "number": "5511...",
    "sticker": "https://example.com/sticker.webp"
  }'
```

### 3. Presence (Typing Indicators)
**Endpoint**: `POST /api/chats/presence`
**Usage**:
```bash
curl -X POST http://localhost:8080/api/chats/presence \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance",
    "number": "5511...",
    "presence": "composing" 
  }'
```
*Values*: `composing`, `recording`, `available`, `unavailable`.

### 4. Media Download (Base64)
**Endpoint**: `POST /api/chats/download-media`
**Usage**:
```bash
curl -X POST http://localhost:8080/api/chats/download-media \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance",
    "message": { ...messageObject... }
  }'
```

### 5. Voice Notes (PTT)
**Endpoint**: `POST /api/messages/audio`
**Usage**:
```bash
curl -X POST http://localhost:8080/api/messages/audio \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance",
    "number": "5511...",
    "audioUrl": "https://example.com/voice.mp3",
    "ptt": true
  }'
```

### 6. Profile Picture URL
**Endpoint**: `POST /api/profile/picture-url`
**Usage**:
```bash
curl -X POST http://localhost:8080/api/profile/picture-url \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-instance",
    "number": "5511..."
  }'
```

## 🛠️ Verification Results
- **Service Layer**: Methods added to `evolution.js`.
- **Router Layer**: Routes registered in `chats.js` and `messages.js`.
- **Docs**: Interactive documentation at `/docs` updated with new endpoints.
- **Docker**: Rebuilt and running.
- **Syntax**: Fixed duplicate catch blocks.

### Group Names
Fixed priority so that Group names (`subject`) are shown instead of the last respondent's name.

### Sticker Viewing
The interactive documentation now renders Base64 previews automatically.
**Result**: Using "Download Media" on a sticker message now displays the sticker image directly in the success panel.

> [!NOTE]
> All new endpoints return standardized JSON errors if required fields are missing.
