# Backend Specifications for Frontend Developer

## 1. Media Download Endpoint (CRITICAL)

**Status:** Confirmed. The endpoint exists at `/api/chats/download-media`.

*   **Endpoint:** `POST /api/chats/download-media`
*   **Payload:**
    ```json
    {
      "instanceName": "your_instance_name",
      "message": {
        "key": {
           "remoteJid": "...",
           "id": "...",
           "fromMe": true/false
        },
        "message": {
             // Evolution expects the message content here, e.g. stickerMessage, imageMessage
             // WARNING: Ensure you are passing the FULL message object structure as received from Evolution/Webhooks.
        }
      }
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "data": {
        "base64": "...", // The Base64 string of the media
        "mimetype": "..."
      }
    }
    ```
*   **Backend Logic:**
    This endpoint wraps Evolution API's `/chat/getBase64FromMediaMessage`.
    *   It forwards the `message` object provided in the payload to Evolution.
    *   It automatically sets `convertToMp4: false`.
    *   **Sticker Note:** If downloading a sticker fails, it might be that Evolution cannot process that specific sticker type or the message object is malformed. Verify the `message` object has the correct `stickerMessage` structure.

---

## 2. Voice Notes vs Audio Files

**Status:** Confirmed. Separate handling is available.

*   **Endpoint:** `POST /api/messages/audio`
*   **Payload (PTT/Voice Note):**
    ```json
    {
      "instanceName": "your_instance_name",
      "number": "phone_number",
      "audioUrl": "https://public-url-to-audio.ogg",
      "ptt": true  // NOTE: Backend currently IGNORES this and forces as Audio File for reliability
    }
    ```
*   **Payload (Audio File):**
    ```json
    {
      "instanceName": "your_instance_name",
      "number": "phone_number",
      "audioUrl": "https://public-url-to-audio.mp3",
      "ptt": false
    }
    ```
*   **Backend Logic:**
    *   **CRITICAL UPDATE**: The backend now **FORCES** all audio to be sent as standard **Audio Files** (using `sendMedia`).
    *   It ignores the `ptt` flag.
    *   This is done to prevent "Waiting for message" errors and "Request Entity Too Large" errors associated with the Voice Note (PTT) conversion process.
    *   **URL Support:** YES. Always use Public URLs.

---

## 3. API Proxy Structure

**Status:** Wrapper (Manual Routes).

*   **Architecture:**
    The backend is a **Node.js Wrapper** that defines specific routes in `src/routes/*.js`. It is **NOT** a direct proxy for all Evolution API endpoints.
*   **Routing:**
    *   You **cannot** call arbitrary Evolution API endpoints (like `/chat/getBase64...`) directly via this backend.
    *   You **must** use the defined routes (e.g., `/api/chats/download-media`, `/api/messages/text`).
*   **Why 404s?**
    Attempting to hit Evolution API paths (e.g. `/chat/getBase64FromMediaMessage`) on this backend will result in a 404 because those routes are not bridged. You must use `/api/chats/download-media`.

---

## 4. Chats & Contacts

**Status:** Confirmed.

*   **Endpoint:** `GET /api/chats`
*   **Query Parameters:**
    *   `instanceName`: (Required) e.g., `?instanceName=Sasha`
*   **Backend Logic:**
    *   Proxies to Evolution API: `/chat/findChats/{instanceName}`.
    *   Returns the list of chats.

---

## Summary of Correct Endpoints

| Frontend Action | Correct Backend Endpoint | Method | Key Payload Fields |
| :--- | :--- | :--- | :--- |
| **Fetch Chat List** | `/api/chats?instanceName={val}` | `GET` | `instanceName` (query) |
| **Download Media** | `/api/chats/download-media` | `POST` | `instanceName`, `message` (object) |
| **Send Voice Note** | `/api/messages/audio` | `POST` | `instanceName`, `number`, `audioUrl`, `ptt: true` |
| **Send Audio File** | `/api/messages/audio` | `POST` | `instanceName`, `number`, `audioUrl`, `ptt: false` |
| **Send Attachment** | `/api/messages/media` | `POST` | `instanceName`, `number`, `media` (URL/Base64), `mediatype` |
| **Send Text** | `/api/messages/text` | `POST` | `instanceName`, `number`, `text` |

**Recommendation:**
Always send **Public URLs** for media/audio to avoid 413 Errors.
