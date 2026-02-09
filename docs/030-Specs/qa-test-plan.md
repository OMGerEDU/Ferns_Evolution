# QA Test Plan: Micro-Automations

## 1. Overview
This plan verifies the functionality of the new "Built-in Micro-Automations" (`!sticker`, `!everyone`, `!note`, `!vo`) on the EvolutionBackend.

## 2. Testing Strategy
We will use a **Hybrid Approach**:
1.  **Automated Injection (Backend Logic):** Use a script to simulate incoming webhooks from Evolution API. This proves the backend handles the commands and *attempts* to call the API.
2.  **Manual Verification (End-to-End):** User uses their actual WhatsApp to send commands and verify the final output (actual sticker, actual group mention).

## 3. Automated Test Cases (Script-based)

Run `node scripts/test_micro_automations.js` to execute these simulated scenarios:

| ID | Test Scenario | Trigger | Expected Backend Behavior |
| :--- | :--- | :--- | :--- |
| **TC-AUTO-01** | **Personal Note** | Simulate: `!note Buy milk` | 1. Insert into `personal_notes`. <br> 2. Call `sendReaction`. |
| **TC-AUTO-02** | **List Notes** | Simulate: `!notes` | 1. Query `personal_notes`. <br> 2. Call `sendText` with list. |
| **TC-AUTO-03** | **Check ID** | Simulate: Reply `!id` | 1. Call `sendText` with message ID info. |
| **TC-AUTO-04** | **Sticker (Fail)** | Simulate: `!sticker` (no media) | 1. Call `sendText` "Please reply to image...". |

## 4. Manual Test Cases (User Actions)

| ID | Test Scenario | Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-MAN-01** | **Create Sticker** | 1. Send an image to the bot (or self). <br> 2. Reply to it with `!sticker`. | Bot converts image and sends back a sticker. |
| **TC-MAN-02** | **Tag Everyone** | 1. Go to a Group where you are Admin. <br> 2. Type `!everyone Hello`. | Bot sends "Hello" and *everyone* gets a ping (even if hidden). |
| **TC-MAN-03** | **ViewOnce Reveal** | 1. Send a ViewOnce image to the bot. <br> 2. Reply with `!vo`. | Bot sends the image back as a normal media message. |
| **TC-MAN-04** | **Save Note** | 1. Send `!note Call mom`. <br> 2. Send `!notes`. | Bot confirms with emoji. List shows "Call mom". |

## 5. Prerequisite
- Restart backend: `docker-compose restart backend`
- Ensure Evolution API is connected to a WhatsApp number.
