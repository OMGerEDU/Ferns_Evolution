# Task: Implement Missing Evolution API Features

## Phase 1: Service Layer Implementation (`src/services/evolution.js`)
- [x] **Message Editing**
    - [x] Implement `updateMessage(instanceName, messageKey, newMessage)`
    - [x] Endpoint: `PUT /chat/updateMessage/{instance}`
- [x] **Stickers**
    - [x] Implement `sendSticker(instanceName, number, stickerUrl)`
    - [x] Endpoint: `POST /message/sendSticker/{instance}`
- [x] **Presence**
    - [x] Implement `sendPresence(instanceName, number, presence)`
    - [x] Endpoint: `POST /chat/sendPresence/{instance}`
    - [x] Enums: `composing`, `recording`, `available`, `unavailable`
- [x] **Media Download**
    - [x] Implement `getBase64(instanceName, message)`
    - [x] Endpoint: `POST /chat/getBase64FromMediaMessage/{instance}`
- [x] **Voice Notes (PTT)**
    - [x] Update `sendAudio` to support `ptt: true`
    - [x] Ensure `audioMessage` payload includes `ptt` boolean

## Phase 2: Route Layer Implementation (`src/routes/`)
- [x] **Chat Routes (`src/routes/chats.js`)**
    - [x] `PUT /update-message` -> calls `updateMessage`
    - [x] `POST /presence` -> calls `sendPresence`
    - [x] `POST /download-media` -> calls `getBase64`
- [x] **Message Routes (`src/routes/messages.js`)**
    - [x] `POST /sticker` -> calls `sendSticker`
    - [x] Update `POST /audio` -> acceptance of `ptt` boolean in body

## Phase 3: Verification
- [x] **Bug Fixes**
    - [x] **Fix Media Download 400 Error** (Fetch raw message from Evolution before download)
- [x] **Manual Testing**
    - [x] Send a sticker
    - [x] Edit a sent text message
    - [x] Send "typing..." presence
    - [x] Download a media message (image/audio)
    - [x] Send a voice note (PTT)
- [x] **Phase 4: Profile Picture API**
    - [x] Implement `fetchProfilePictureUrl` in `evolution.js`
    - [x] Add `POST /api/profile/picture-url` in `profile.js`
    - [x] Update interactive documentation
    - [x] Verify functionality
- [x] **Phase 5: Groups & Stickers Improvements**
    - [x] Fix Group Name mapping (prioritize name over pushName)
    - [x] Verify Sticker download support in `getBase64`
    - [x] Update documentation with Sticker viewing examples
    - [x] Verify both improvements
