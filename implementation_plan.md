# Implementation Plan - Missing Evolution APIs

Implementing stickers, message editing, presence, media download, and voice messages (PTT).

## Proposed Changes

### Backend Service

#### [MODIFY] [src/services/evolution.js](file:///d:/SKUL/Sasha/EvolutionBackend/src/services/evolution.js)
- Add `updateMessage(instanceName, messageKey, newMessage)`
- Add `sendSticker(instanceName, number, stickerUrl, options)`
- Add `sendPresence(instanceName, number, presence)`
- Add `getBase64(instanceName, message)`
- Update `sendAudio` to accept `options.ptt`

### Backend Routes

#### [MODIFY] [src/routes/chats.js](file:///d:/SKUL/Sasha/EvolutionBackend/src/routes/chats.js)
- `PUT /update-message`
- `POST /presence`
- `POST /download-media`

#### [MODIFY] [src/routes/messages.js](file:///d:/SKUL/Sasha/EvolutionBackend/src/routes/messages.js)
- `POST /sticker`
- Update `POST /audio` documentation/validation for `ptt`

## Verification Plan

### Manual Verification
1. **Send Sticker**:
   ```bash
   curl -X POST http://localhost:8080/api/messages/sticker \
     -H "Content-Type: application/json" \
     -d '{ "instanceName": "test", "number": "...", "sticker": "https://..." }'
   ```
2. **Edit Message**:
   - Send a text message, get the `key`.
   - Call `PUT /api/chats/update-message` with the key and new text.
   - Verify update on phone.
3. **Presence**:
   - Call `POST /api/chats/presence` with `{ "presence": "composing" }`.
   - Verify "Typing..." status on phone.
4. **Download Media**:
   - Send an image to the bot.
   - Use the webhook payload (or findMessages) to get the message object.
   - Call `POST /api/chats/download-media` with the message object.
   - Verify base64 output.
5. **Voice Note**:
   - Call `POST /api/messages/audio` with `{ "ptt": true }`.
   - Verify it appears as a voice note (waveform) on phone, not an audio file.
