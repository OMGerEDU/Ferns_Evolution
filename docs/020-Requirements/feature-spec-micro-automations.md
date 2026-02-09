# Feature Spec: Built-in Micro-Automations

## Goal
Implement a set of lightweight, zero-dependency "Micro-Automations" that run locally on the EvolutionBackend. These tools provide immediate utility (fun, administration, productivity) using simple command triggers.

## Scope (The "Packs")

### 1. Media Wizard 🎨
*   **Command:** `!sticker` (in reply to image/video)
*   **Behavior:** Converts media to WebP sticker.
*   **Tech:** Uses existing `ffmpeg` (via `fluent-ffmpeg` or similar execution).

### 2. Admin Power Tools ⚡
*   **Command:** `!everyone` (or `!all`)
*   **Behavior:** Fetches group metadata, extracts all participant JIDs, sends a message with hidden mentions for all users.
*   **Constraint:** Only works if sender is Admin.
*   **Command:** `!purge [N]` (reply)
*   **Behavior:** Deletes the last N messages (requires Admin).
*   **Command:** `!id` (reply)
*   **Behavior:** Replies with text: `Message ID: ... \n Remote JID: ...`

### 3. Personal Assistant 🧠
*   **Command:** `!note [text]`
*   **Behavior:** Saves `[text]` to a new `personal_notes` table in Postgres.
*   **Command:** `!notes`
*   **Behavior:** Lists top 10 recent notes.
*   **Command:** `!me`
*   **Behavior:** Returns JSON dump of sender's contact info.

### 4. Privacy Guard 🛡️
*   **Command:** `!viewonce` (reply)
*   **Behavior:** Downloads the ViewOnce media and re-sends it as normal media to the same chat (or private chat).

## Architecture
*   **Router:** A new `src/services/commandRouter.js` will intercept messages *before* they hit key-word triggers.
*   **Modules:** Each "Pack" will be a separate service file in `src/services/commands/`.
*   **Database:** New table `personal_notes` (UUID, content, created_at, user_jid).

## Success Criteria
*   [ ] `!sticker` works on images and short videos (<5s).
*   [ ] `!everyone` pings all members.
*   [ ] `!note` saves data to DB.
*   [ ] No external API calls are made.
