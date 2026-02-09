# Clarification: "Micro-Automations" (Small & Helpful)

You asked for **small, helpful tools** that don't need external services. Here are 4 "Module Packs" we can build directly into your EvolutionBackend.

### Pack 1: The "Media Wizard" 🎨
**Focus:** Fun & Daily Utility
*   **!sticker**: Reply to any image/video to instantly get a sticker back.
*   **!toimg**: Reply to a sticker to get the image back.
*   **!mp3**: Reply to a video to extract just the audio.

### Pack 2: The "Admin Power Tools" ⚡
**Focus:** Managing Groups & Troubleshooting
*   **!everyone**: Tag all members in a group (hidden mention) for important alerts.
*   **!purge [N]**: Delete the last N messages in a chat (great for cleanup).
*   **!id**: Reply to a message to get its raw `messageId` and `remoteJid` (essential for debugging automations).

### Pack 3: The "Personal Assistant" 🧠
**Focus:** Productivity for You
*   **!note [text]**: Saves text to a personal database table.
*   **!remind [10m] [text]**: Simple internal timer (using Node.js `setTimeout`).
*   **!me**: Returns your own user info JSON.

### Pack 4: The "Privacy Guard" 🛡️
**Focus:** Safety
*   **!viewonce**: Resend a ViewOnce message as normal media (to keep a copy).
*   **!profile [user]**: Get full profile picture URL of a user.

## Decision Time
Which **Pack** would be most immediately useful to you?
(We can build all of them eventually, but let's pick one to start perfect).
