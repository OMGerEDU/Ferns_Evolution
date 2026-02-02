const axios = require('axios');

// CONFIG
const API_URL = 'http://localhost:3000/wh/greenapi';
// We need a tenant ID and secret. 
// For local testing, we might need to fetch this from the DB or just assume the 'default' tenant exists.
// Let's assume the user can find these in the UI, but for this script we'll try to hit the endpoint.
// Since the path is /wh/:provider/:tenantId/:secret, we need valid ones.
// HACK: We will let the script user input them, or just use placeholders if they turned off auth (unlikely).
// BETTER: The Admin UI shows the URL. We can ask the user to paste it.

const TENANT_ID = process.argv[2] || 'YOUR_TENANT_ID';
const SECRET = process.argv[3] || 'YOUR_SECRET';

if (!process.argv[2]) {
    console.error('Usage: node test_greenapi.js <TENANT_ID> <SECRET>');
    console.error('Find these in your Admin UI > Automations tab URL (or Green API Config wizard step).');
    process.exit(1);
}

const url = `${API_URL}/${TENANT_ID}/${SECRET}`;

// Payload from Green API Docs (incomingMessageReceived)
const payload = {
    "typeWebhook": "incomingMessageReceived",
    "instanceData": {
        "idInstance": 110182315,
        "wid": "110182315@c.us",
        "typeInstance": "whatsapp"
    },
    "timestamp": Math.floor(Date.now() / 1000),
    "idMessage": "F1234567890ABCDEF",
    "senderData": {
        "chatId": "123456789@c.us",
        "sender": "123456789@c.us",
        "senderName": "Test User"
    },
    "messageData": {
        "typeMessage": "textMessage",
        "textMessageData": {
            "textMessage": "Hello Green World"
        }
    }
};

console.log(`Sending webhook to: ${url}`);
console.log('Payload:', JSON.stringify(payload, null, 2));

axios.post(url, payload)
    .then(res => {
        console.log('Success:', res.status, res.data);
    })
    .catch(err => {
        console.error('Error:', err.response ? err.response.data : err.message);
    });
