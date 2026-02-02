---
id: MTP-Audio-Delivery
type: test-plan
status: draft
created: 2026-02-01
description: Master Test Plan for Audio Message Delivery and Conversion
---

# Master Test Plan: Audio Delivery

## 1. Introduction
This test plan covers the verification of audio message delivery, specifically focusing on the backend's ability to handle potentially mismatched audio formats (WebM labeled as MP4/OGG) by normalizing them to standard MP3.

## 2. Scope
*   **In Scope**: 
    *   Backend `POST /api/messages/audio` endpoint.
    *   Server-side `ffmpeg` conversion (WebM -> MP3).
    *   Delivery to WhatsApp via Evolution API.
*   **Out of Scope**: 
    *   Frontend UI recording logic (we treat the payload as given).

## 3. Test Strategy
*   **Automated Integration Tests**: N/A (requires real WhatsApp instance).
*   **Manual Verification**: 
    *   Send raw JSON payload (simulating the "broken" frontend).
    *   Verify backend logs show "Converting audio to MP3".
    *   Verify message delivery on real device.

## 4. Test Cases
| ID | Title | Priority |
| :--- | :--- | :--- |
| TC-AUDIO-001 | Send WebM with Mismatched Headers | Critical |
| TC-AUDIO-002 | Send Valid MP3 | High |
| TC-AUDIO-003 | Send Invalid URL (404) | Medium |
