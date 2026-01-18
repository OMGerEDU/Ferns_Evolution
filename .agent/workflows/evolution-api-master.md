---
description: Evolution API Master Agent - Expert knowledge and workflows for Evolution API v2
---

# Evolution API Master Agent

This workflow provides expert guidance on using the Evolution API, including instance management, messaging, and troubleshooting.

## 🚀 Key Workflows

### 1. Connection & Pairing

**Standard QR Code:**
```bash
# Create Instance
POST /instance/create
{
  "instanceName": "my-instance",
  "qrcode": true
}

# Get QR
GET /instance/connect/my-instance
```

**Pairing Code (Phone Number):**
If use wants to connect via Pairing Code instead of QR:
```bash
# Create Instance (qrcode: true is still fine, but we will use the connect endpoint with specific body)
POST /instance/create
{
  "instanceName": "my-instance",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS"
}

# Get Pairing Code
GET /instance/connect/my-instance?number=5511999999999
# OR
GET /instance/connect/my-instance
# (Wait for API confirmation on exact payload for pairing code)
```
*> Note: Detailed pairing code implementation is being verified against `codebase.md`.*

### 2. Messaging

**Send Text:**
```bash
POST /message/sendText/my-instance
{
  "number": "5511999999999",
  "text": "Hello World"
}
```

**Send Media:**
```bash
POST /message/sendMedia/my-instance
{
  "number": "5511999999999",
  "media": "https://example.com/image.png",
  "mediatype": "image",
  "caption": "Check this out!"
}
```

### 3. Groups

**Create Group:**
```bash
POST /group/create/my-instance
{
  "subject": "My Group",
  "participants": ["5511999999999"],
  "description": "Group Description"
}
```

## 🛠️ Troubleshooting

- **404 Not Found**: Check if instance exists and is running.
- **400 Bad Request**: Check payload format. Ensure numbers include country code.
- **Connection Issues**: Restart instance `PUT /instance/restart/:instance`.

## 📚 Reference

- **Official Docs**: `d:/SKUL/Sasha/EvolutionBackend/.agent/workflows/codebase.md`

## 🌍 Real World Examples (Production)

**Base URL**: `https://evolution.omger.cloud`
**Auth Header**: `apikey: 54yWPufPt9y2Wp9QUap` (from your .env)

### Create Instance (Pairing Code)
```bash
curl -X POST https://evolution.omger.cloud/api/instances \
  -H "apikey: 54yWPufPt9y2Wp9QUap" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-phone",
    "number": "5511999999999", 
    "qrcode": true
  }'
```

### Check Connection State
```bash
curl -X GET https://evolution.omger.cloud/api/instances/my-phone \
  -H "apikey: 54yWPufPt9y2Wp9QUap"
```

### Send Text Message
```bash
curl -X POST https://evolution.omger.cloud/api/messages/send \
  -H "apikey: 54yWPufPt9y2Wp9QUap" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-phone",
    "number": "5511888888888",
    "text": "Hello from Evolution!"
  }'
```
