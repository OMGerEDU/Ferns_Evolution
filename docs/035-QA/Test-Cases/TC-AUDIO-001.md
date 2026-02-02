---
id: TC-AUDIO-001
type: test-case
status: active
created: 2026-02-01
feature: Audio Conversion
priority: Critical
---

# Test Case: Send WebM with Mismatched Headers

## Objective
Verify that the backend successfully converts and sends a WebM file even if the payload incorrectly claims it is `audio/mp4` or has a weird extension.

## Pre-conditions
1. Backend is running with `ffmpeg` installed.
2. Valid instance connected.

## Test Data
*   **Audio URL**: `https://files.test.com/sample.webm` (or any public WebM file)
*   **Payload**:
    ```json
    {
        "instanceName": "your_instance",
        "number": "target_number",
        "audioUrl": "https://files.test.com/sample.webm",
        "ptt": true
    }
    ```

## Steps
1. Send the payload via Postman or Curl.
2. Monitor Backend Logs (`docker compose logs -f backend`).
3. Check WhatsApp on the target device.

## Expected Result
1. **Logs**: Should show:
    *   `Processing Audio Request`
    *   `Converting audio to MP3 on backend...`
    *   `Executing conversion` (ffmpeg command)
    *   `Evolution API response` (success)
2. **WhatsApp**: Message appears as a playable **Audio File** (MP3), not a corrupt document.
