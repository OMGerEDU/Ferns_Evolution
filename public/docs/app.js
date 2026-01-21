const API_URL = '/api';
let API_KEY = localStorage.getItem('evolution_api_key');
let connectedInstances = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConnectedInstances();
});

// Load connected instances
async function loadConnectedInstances() {
    try {
        const res = await fetchAPI('/instances');
        if (!res.success) throw new Error(res.error);

        const instances = res.data;

        // Filter for connected instances
        const processed = await Promise.all(instances.map(async (inst) => {
            const name = inst.name || inst.instance?.instanceName || inst.instanceName;
            if (!name) return null;

            try {
                const s = await fetchAPI(`/instances/${name}`);
                if (s.success && (s.data.instance?.state === 'open' || s.data.instance?.status === 'open')) {
                    return { name, status: 'connected' };
                }
            } catch (e) { }
            return null;
        }));

        connectedInstances = processed.filter(i => i);

        // Populate selector
        const select = document.getElementById('instance-select');
        select.innerHTML = '<option value="">Select an instance...</option>';

        connectedInstances.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst.name;
            option.textContent = inst.name;
            select.appendChild(option);
        });

        if (connectedInstances.length === 0) {
            select.innerHTML = '<option value="">No connected instances</option>';
        }
    } catch (e) {
        console.error('Failed to load instances:', e);
    }
}

// Try endpoint
async function tryEndpoint(endpointId) {
    const instanceName = document.getElementById('instance-select').value;

    if (!instanceName && !endpointId.includes('get-instances')) {
        alert('Please select an instance first');
        return;
    }

    const responsePanel = document.getElementById(`response-${endpointId}`);
    responsePanel.classList.add('active');
    responsePanel.innerHTML = '<div class="loading"></div>';

    try {
        let result;

        switch (endpointId) {
            case 'get-instances':
                result = await fetchAPI('/instances');
                break;

            case 'get-instance':
                result = await fetchAPI(`/instances/${instanceName}`);
                break;

            case 'delete-instance':
                if (!confirm(`Are you sure you want to delete instance "${instanceName}"?`)) {
                    responsePanel.classList.remove('active');
                    return;
                }
                result = await fetchAPI(`/instances/${instanceName}`, { method: 'DELETE' });
                break;

            case 'logout-instance':
                result = await fetchAPI(`/instances/${instanceName}/logout`, { method: 'POST' });
                break;

            case 'send-text':
                const number = document.getElementById('input-send-text-number').value;
                const text = document.getElementById('input-send-text-text').value;

                if (!number || !text) {
                    alert('Please fill in all required fields');
                    responsePanel.classList.remove('active');
                    return;
                }

                result = await fetchAPI('/messages/text', {
                    method: 'POST',
                    body: JSON.stringify({ instanceName, number, text })
                });
                break;

            case 'send-media':
                const mediaNumber = document.getElementById('input-send-media-number').value;
                const mediaUrl = document.getElementById('input-send-media-url').value;
                const caption = document.getElementById('input-send-media-caption').value;

                if (!mediaNumber || !mediaUrl) {
                    alert('Please fill in all required fields');
                    responsePanel.classList.remove('active');
                    return;
                }

                result = await fetchAPI('/messages/media', {
                    method: 'POST',
                    body: JSON.stringify({
                        instanceName,
                        number: mediaNumber,
                        media: mediaUrl,
                        mediatype: 'image', // simplified for demo
                        caption: caption || undefined
                    })
                });
                break;

                break;

            case 'send-sticker':
                const stickerNum = document.getElementById('input-send-sticker-number').value;
                const stickerUrl = document.getElementById('input-send-sticker-url').value;
                if (!stickerNum || !stickerUrl) {
                    alert('Please fill in required fields');
                    responsePanel.classList.remove('active');
                    return;
                }
                result = await fetchAPI('/messages/sticker', {
                    method: 'POST', body: JSON.stringify({ instanceName, number: stickerNum, sticker: stickerUrl })
                });
                break;

            case 'send-audio':
                const audioNumber = document.getElementById('input-send-audio-number').value;
                const audioUrl = document.getElementById('input-send-audio-url').value;
                const ptt = document.getElementById('input-send-audio-ptt').checked;

                if (!audioNumber || !audioUrl) {
                    alert('Please fill in required fields');
                    responsePanel.classList.remove('active');
                    return;
                }
                result = await fetchAPI('/messages/audio', {
                    method: 'POST', body: JSON.stringify({ instanceName, number: audioNumber, audioUrl, ptt })
                });
                break;

            case 'send-location':
                const locNumber = document.getElementById('input-send-location-number').value;
                const lat = document.getElementById('input-send-location-lat').value;
                const long = document.getElementById('input-send-location-long').value;
                const addr = document.getElementById('input-send-location-address').value;

                if (!locNumber || !lat || !long) {
                    alert('Missing fields');
                    responsePanel.classList.remove('active');
                    return;
                }
                result = await fetchAPI('/messages/location', {
                    method: 'POST', body: JSON.stringify({ instanceName, number: locNumber, latitude: lat, longitude: long, address: addr })
                });
                break;

            case 'send-contact':
                const contactNumber = document.getElementById('input-send-contact-number').value;
                const contactData = document.getElementById('input-send-contact-data').value;
                // For simplicity, contactData should be object string but let's assume valid
                // or just send simple struct. Evolution expects object/array.
                // We'll skip complex validation.
                result = await fetchAPI('/messages/contact', {
                    method: 'POST', body: JSON.stringify({ instanceName, number: contactNumber, contact: JSON.parse(contactData || '{}') })
                });
                break;

            case 'send-poll':
                const pollNumber = document.getElementById('input-send-poll-number').value;
                const pollName = document.getElementById('input-send-poll-name').value;
                const options = document.getElementById('input-send-poll-options').value.split(',').map(s => s.trim());
                result = await fetchAPI('/messages/poll', {
                    method: 'POST', body: JSON.stringify({ instanceName, number: pollNumber, name: pollName, values: options })
                });
                break;

            case 'fetch-chats':
                result = await fetchAPI(`/chats?instanceName=${instanceName}`);
                break;

            case 'mark-read':
                // we need messageKey input
                const mk = document.getElementById('input-mark-read-key').value;
                result = await fetchAPI('/chats/mark-read', { method: 'PUT', body: JSON.stringify({ instanceName, messageKey: mk }) });
                break;

            case 'find-messages':
                // ...
                result = await fetchAPI('/chats/find-messages', { method: 'POST', body: JSON.stringify({ instanceName, page: 1, limit: 10 }) });
                break;

            case 'fetch-groups':
                result = await fetchAPI(`/groups?instanceName=${instanceName}`);
                break;

            case 'create-group':
                // simple impl
                const s = document.getElementById('input-create-group-subject').value;
                const p = document.getElementById('input-create-group-participants').value.split(','); // array of numbers
                result = await fetchAPI('/groups/create', { method: 'POST', body: JSON.stringify({ instanceName, subject: s, participants: p }) });
                break;

                break;

            case 'update-message':
                const msgKey = document.getElementById('input-update-message-key').value;
                const newText = document.getElementById('input-update-message-text').value;
                if (!msgKey || !newText) {
                    alert('Please fill in fields'); responsePanel.classList.remove('active'); return;
                }
                result = await fetchAPI('/chats/update-message', {
                    method: 'PUT', body: JSON.stringify({ instanceName, messageKey: msgKey, newMessage: newText })
                });
                break;

            case 'send-presence':
                const presNum = document.getElementById('input-send-presence-number').value;
                const presStatus = document.getElementById('input-send-presence-status').value;
                if (!presNum) {
                    alert('Number required'); responsePanel.classList.remove('active'); return;
                }
                result = await fetchAPI('/chats/presence', {
                    method: 'POST', body: JSON.stringify({ instanceName, number: presNum, presence: presStatus })
                });
                break;

            case 'download-media':
                const msgJson = document.getElementById('input-download-media-json').value;
                try {
                    const msgObj = JSON.parse(msgJson);
                    result = await fetchAPI('/chats/download-media', {
                        method: 'POST', body: JSON.stringify({ instanceName, message: msgObj })
                    });
                } catch (e) {
                    alert('Invalid JSON'); responsePanel.classList.remove('active'); return;
                }
                break;

            case 'fetch-profile':
                const fetchProfNum = document.getElementById('input-fetch-profile-number').value;
                result = await fetchAPI('/profile/fetch', { method: 'POST', body: JSON.stringify({ instanceName, number: fetchProfNum }) });
                break;

            case 'fetch-profile-picture':
                const fetchPicNum = document.getElementById('input-fetch-picture-number').value;
                result = await fetchAPI('/profile/picture-url', { method: 'POST', body: JSON.stringify({ instanceName, number: fetchPicNum }) });
                break;

            case 'update-profile-name':
                const profileName = document.getElementById('input-update-name').value;

                if (!profileName) {
                    alert('Please enter a name');
                    responsePanel.classList.remove('active');
                    return;
                }

                result = await fetchAPI('/profile/name', {
                    method: 'POST',
                    body: JSON.stringify({ instanceName, name: profileName })
                });
                break;

            case 'update-profile-status':
                const status = document.getElementById('input-update-status').value;

                if (!status) {
                    alert('Please enter a status');
                    responsePanel.classList.remove('active');
                    return;
                }

                result = await fetchAPI('/profile/status', {
                    method: 'POST',
                    body: JSON.stringify({ instanceName, status })
                });
                break;

            case 'update-profile-picture':
                const picUrl = document.getElementById('input-update-picture-url').value;
                result = await fetchAPI('/profile/picture', { method: 'POST', body: JSON.stringify({ instanceName, picture: picUrl }) });
                break;

            default:
                throw new Error('Unknown endpoint');
        }

        displayResponse(responsePanel, result);
    } catch (e) {
        displayResponse(responsePanel, { success: false, error: e.message }, true);
    }
}

// Display response
function displayResponse(panel, data, isError = false) {
    const statusClass = isError || !data.success ? 'error' : 'success';
    const statusText = isError || !data.success ? 'Error' : 'Success';

    const jsonStr = JSON.stringify(data, null, 2);
    let mediaHtml = '';

    // If response has base64, render it as an image (for stickers/images)
    if (data.success && data.data && data.data.base64) {
        const mimeType = data.data.mimetype || 'image/png';
        mediaHtml = `
            <div class="media-preview" style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; text-align: center;">
                <p style="margin-bottom: 8px; font-weight: bold;">Preview:</p>
                <img src="data:${mimeType};base64,${data.data.base64}" style="max-width: 200px; max-height: 200px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);" />
            </div>
        `;
    }

    panel.innerHTML = `
        <div class="response-header">
            <div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <button class="copy-btn" onclick="copyResponse('${panel.id}')">Copy</button>
        </div>
        <div class="response-body">
            <pre id="${panel.id}-content">${escapeHtml(jsonStr)}</pre>
            ${mediaHtml}
        </div>
    `;
}

// Copy response
function copyResponse(panelId) {
    const content = document.getElementById(`${panelId}-content`).textContent;
    navigator.clipboard.writeText(content).then(() => {
        const btn = event.target;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
    });
}

// Fetch API helper
async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        ...options.headers
    };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // Check content type before parsing
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        // Return error object for non-JSON responses
        return {
            success: false,
            error: res.ok ? 'Server returned non-JSON response' : `HTTP ${res.status}: ${res.statusText}`,
            details: text.substring(0, 200) // First 200 chars for debugging
        };
    }

    return res.json();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
