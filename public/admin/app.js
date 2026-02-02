const API_URL = '/api';
const AUTH_URL = '/admin/auth';
let API_KEY = localStorage.getItem('evolution_api_key') || sessionStorage.getItem('evolution_api_key');

// State
let connectionPollInterval = null;
let currentTenant = null;
let currentRules = []; // Store rules for client-side access
let editingRuleId = null; // Track which rule is being edited

// UI References
const sections = {
    login: document.getElementById('login-section'),
    dashboard: document.getElementById('dashboard-section'),
    wizard: document.getElementById('wizard-section'),
    automations: document.getElementById('automations-section')
};

const wizardSteps = {
    1: document.getElementById('wizard-step-1'),
    2: document.getElementById('wizard-step-2'),
    3: document.getElementById('wizard-step-3')
};

// --- INITIALIZATION ---
if (API_KEY) {
    showSection('dashboard');
    loadDashboard();
}

// --- AUTH ---
// --- AUTH ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('api-key-input').value.trim();
    const remember = document.getElementById('remember-me').checked;

    if (!key) return showNotify('Please enter a Global API Key', 'error');

    // Validate Key by making a simple request
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    try {
        // Temporarily set key to test
        API_KEY = key;
        const res = await fetchAPI('/instances');

        if (res.success || (res.error && !res.error.includes('Unauthorized') && !res.error.includes('Forbidden'))) {
            // Success or unrelated error -> Key is likely good
            if (remember) {
                localStorage.setItem('evolution_api_key', key);
            } else {
                sessionStorage.setItem('evolution_api_key', key);
            }
            showSection('dashboard');
            loadDashboard();
        } else {
            API_KEY = null;
            showNotify('Invalid API Key', 'error');
        }
    } catch (e) {
        API_KEY = null;
        showNotify('Connection failed: ' + e.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

window.logout = () => {
    localStorage.removeItem('evolution_api_key');
    sessionStorage.removeItem('evolution_api_key');
    API_KEY = null;
    document.getElementById('api-key-input').value = '';
    showSection('login');
};

// --- DASHBOARD LOGIC ---
async function loadDashboard() {
    const list = document.getElementById('instances-list');
    list.innerHTML = '<div style="padding:2rem;text-align:center">Loading...</div>';

    try {
        const res = await fetchAPI('/instances');
        if (!res.success) throw new Error(res.error);
        const instances = res.data;

        if (instances.length === 0) {
            list.innerHTML = '<div style="padding:2rem;text-align:center;color:#9ca3af">No instances found. Click "Add Instance" to start.</div>';
            updateStats(0, 0, 0);
            return;
        }

        // Fetch status for each
        const processed = await Promise.all(instances.map(async (inst) => {
            const name = inst.name || inst.instance?.instanceName || inst.instanceName;
            if (!name) return null;
            let status = 'disconnected';
            try {
                const s = await fetchAPI(`/instances/${name}`);
                if (s.success && (s.data.instance?.state === 'open' || s.data.instance?.status === 'open')) status = 'connected';
            } catch (e) { }
            return { name, status };
        }));

        const valid = processed.filter(i => i);
        renderList(valid);

        const total = valid.length;
        const connected = valid.filter(i => i.status === 'connected').length;
        updateStats(total, connected, total - connected);

    } catch (e) {
        list.innerHTML = `<div style="padding:2rem;text-align:center;color:#ef4444">Error: ${e.message}</div>`;
    }
}

function renderList(instances) {
    const list = document.getElementById('instances-list');
    list.innerHTML = '';

    // Sort connected first
    instances.sort((a, b) => a.status === 'connected' ? -1 : 1);

    instances.forEach(inst => {
        const row = document.createElement('div');
        row.className = 'instance-row';
        row.innerHTML = `
            <div class="instance-info">
                <span style="font-weight:600">${inst.name}</span>
                <span class="status-badge ${inst.status}">${inst.status}</span>
            </div>
            <div class="instance-actions">
                <button class="btn btn-secondary" style="margin-right:8px" onclick="goToAutomations('${inst.name}')">Automations</button>
                ${inst.status === 'disconnected'
                ? `<button class="btn btn-secondary" onclick="restartWizard('${inst.name}')">Connect</button>`
                : `<button class="btn btn-secondary" onclick="logoutInstance('${inst.name}')">Logout</button>`}
                <button class="btn btn-danger" onclick="openDeleteModal('${inst.name}')">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });
}

window.goToAutomations = (instanceName) => {
    // For MVP, we just switch tabs. In future, filter by instanceName.
    showSection('automations');
    // Pre-fill trigger? 
    // const triggerInput = document.getElementById('rule-trigger');
    // if(triggerInput) triggerInput.value = `[${instanceName}] `;
};

function updateStats(t, c, d) {
    document.getElementById('stat-total').textContent = t;
    document.getElementById('stat-connected').textContent = c;
    document.getElementById('stat-disconnected').textContent = d;
}

// --- AUTOMATIONS LOGIC ---
async function loadAutomations() {
    const list = document.getElementById('automations-list');
    list.innerHTML = '<div style="padding:2rem;text-align:center">Loading...</div>';

    try {
        // 1. Get Default Tenant (or create if needed for testing)
        if (!currentTenant) {
            const tRes = await fetchAPI('/tenants/default');
            if (tRes.success) {
                currentTenant = tRes.data;
            } else {
                throw new Error('Failed to load tenant: ' + tRes.error);
            }
        }

        // 2. Fetch Rules
        const res = await fetchAPI(`/automations?tenantId=${currentTenant.id}`);
        if (res.success) {
            currentRules = res.data;
            renderRules(res.data);
        } else {
            list.innerHTML = `<div style="color:red">${res.error}</div>`;
        }
    } catch (e) {
        list.innerHTML = `<div style="color:red">${e.message}</div>`;
    }
}

function renderRules(rules) {
    const list = document.getElementById('automations-list');

    // Webhook URL Banner
    const whUrl = `${window.location.origin}/wh/evolution/${currentTenant.id}/${currentTenant.webhook_secret}`;
    const headerHtml = `
        <div style="background:rgba(16,185,129,0.1); padding:1rem; border-radius:6px; margin-bottom:1rem; border:1px solid #059669;">
            <strong>Your Webhook URL:</strong><br>
            <code style="display:block; margin-top:0.5rem; background:#000; padding:0.5rem; word-break:break-all;">${whUrl}</code>
        </div>
    `;

    if (!rules || rules.length === 0) {
        list.innerHTML = headerHtml + '<div style="padding:2rem;text-align:center;color:#9ca3af">No rules found. Click "New Rule" to create one.</div>';
        return;
    }

    list.innerHTML = headerHtml;
    rules.forEach(rule => {
        const row = document.createElement('div');
        row.className = 'instance-row';
        row.style.cursor = 'pointer';
        row.onclick = () => editRule(rule.id);

        row.innerHTML = `
            <div class="instance-info">
                <div>
                    <div style="font-weight:600">${rule.name}</div>
                    <div style="font-size:0.8rem;color:#9ca3af">
                        Trigger: "${rule.trigger.text_contains}" 
                        <span style="margin:0 5px">→</span> 
                        Action: ${rule.actions[0].type === 'send_message' ? 'Send Text' : 'HTTP Request'}
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                 <button class="btn btn-secondary" onclick="copyRule(event, ${rule.id})">Json</button>
                 <button class="btn btn-danger" key="delete-btn" onclick="deleteWrapper(event, ${rule.id})">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });
}

window.deleteWrapper = (e, id) => {
    e.stopPropagation();
    deleteRule(id);
};

window.copyRule = (e, id) => {
    e.stopPropagation();
    const rule = currentRules.find(r => r.id === id);
    if (!rule) return;

    // Copy simplified version or full? Full is good for debugging/backup
    const { id: _id, tenant_id, created_at, updated_at, ...cleanRule } = rule;

    navigator.clipboard.writeText(JSON.stringify(cleanRule, null, 2)).then(() => {
        showNotify('Rule JSON copied', 'success');
    });
};

window.editRule = (id) => {
    const rule = currentRules.find(r => r.id === id);
    if (!rule) return;

    editingRuleId = id;

    // Populate form
    document.getElementById('rule-name').value = rule.name;
    document.getElementById('rule-trigger').value = rule.trigger.text_contains || '';
    document.getElementById('rule-msg-type').value = rule.trigger.message_type || 'any';
    document.getElementById('rule-source').value = rule.trigger.source || 'any';

    // Assume action 0 is the main one for MVP
    const action = rule.actions[0];
    if (action && action.type === 'send_message') {
        document.getElementById('rule-response').value = action.params.text || '';
    }

    // Change Modal Title (Need to query selector since no ID on H3)
    document.querySelector('#rule-modal h3').textContent = 'Edit Automation';

    document.getElementById('rule-modal').classList.add('active');
};

window.deleteRule = async (id) => {
    if (!confirm('Delete rule?')) return;
    await fetchAPI(`/automations/${id}`, { method: 'DELETE' });
    loadAutomations();
};

window.openRuleModal = () => {
    editingRuleId = null;
    document.getElementById('rule-name').value = '';
    document.getElementById('rule-trigger').value = '';
    document.getElementById('rule-response').value = '';
    document.querySelector('#rule-modal h3').textContent = 'Create Automation';
    document.getElementById('rule-modal').classList.add('active');
};

window.closeRuleModal = () => document.getElementById('rule-modal').classList.remove('active');

window.saveRule = async () => {
    const name = document.getElementById('rule-name').value;
    const triggerText = document.getElementById('rule-trigger').value;
    const msgType = document.getElementById('rule-msg-type').value;
    const source = document.getElementById('rule-source').value;
    const responseText = document.getElementById('rule-response').value;

    if (!name || !triggerText) {
        return showNotify('Name and Trigger required', 'error');
    }

    const payload = {
        tenantId: currentTenant.id,
        name,
        enabled: true,
        trigger: {
            provider: 'any',
            text_contains: triggerText,
            message_type: msgType,
            source: source
        },
        actions: [{ type: 'send_message', params: { text: responseText } }]
    };

    let res;
    if (editingRuleId) {
        // UPDATE
        res = await fetchAPI(`/automations/${editingRuleId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    } else {
        // CREATE
        res = await fetchAPI('/automations', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    if (res.success) {
        closeRuleModal();
        loadAutomations();
        showNotify(editingRuleId ? 'Rule updated' : 'Rule created', 'success');
        editingRuleId = null;
    } else {
        showNotify(res.error, 'error');
    }
};

// --- WIZARD LOGIC ---
let wizardInstanceName = '';

window.startWizard = () => {
    document.getElementById('wiz-name').value = '';
    document.getElementById('wiz-phone').value = '';
    showSection('wizard');
    showWizardStep(1);
};

window.restartWizard = (name) => {
    document.getElementById('wiz-name').value = name;
    document.getElementById('wiz-phone').value = '';
    showSection('wizard');
    showWizardStep(1);
};

window.cancelWizard = () => {
    stopPolling();
    stopQRPolling();
    showSection('dashboard');
    loadDashboard();
};

window.toggleProviderFields = () => {
    const provider = document.getElementById('wiz-provider').value;
    const nameInput = document.getElementById('wiz-name');
    if (provider === 'greenapi') {
        nameInput.placeholder = 'idInstance (e.g. 1101823151)';
        document.getElementById('wiz-phone').parentElement.style.display = 'none';
        document.getElementById('wiz-connect-title').textContent = 'Connect Green API';
        document.getElementById('wiz-connect-desc').textContent = 'Enter your API Token below.';
    } else {
        nameInput.placeholder = 'e.g. support-bot';
        document.getElementById('wiz-phone').parentElement.style.display = 'block';
        document.getElementById('wiz-connect-title').textContent = 'Connect WhatsApp';
        document.getElementById('wiz-connect-desc').textContent = 'Scan the QR code or enter the pairing code.';
    }
};

window.submitWizardConfig = async () => {
    const provider = document.getElementById('wiz-provider').value;
    const name = document.getElementById('wiz-name').value.trim();
    const phone = document.getElementById('wiz-phone').value.trim();

    if (!name) return showNotify('Instance Name / ID required', 'error');

    wizardInstanceName = name;

    // GREEN API PATH
    if (provider === 'greenapi') {
        // For POC, we just show them the webhook URL to configure manually
        showWizardStep(3);
        const whUrl = `${window.location.origin}/wh/greenapi/${currentTenant?.id || 'default'}/${currentTenant?.webhook_secret || 'secret'}`;
        document.getElementById('wizard-step-3').innerHTML = `
            <div style="font-size:4rem; margin-bottom:1rem;">🟢</div>
            <div class="wizard-header">
                <h2>Green API Config</h2>
                <p>Set this URL in your Green API Console:</p>
                <code style="display:block; background:#000; padding:1rem; margin:1rem 0; word-break:break-all;">${whUrl}</code>
                <p style="font-size:0.8rem; color:#9ca3af">Note: For this POC, outgoing messages use a hardcoded token. Real implementation would save your API Token to the DB.</p>
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="finishWizard()">Done</button>
        `;
        return;
    }

    // EVOLUTION PATH (Existing)
    showWizardStep(2); // Move to visual waiting state

    // Reset displays
    document.getElementById('wiz-pairing-display').style.display = 'none';
    document.getElementById('wiz-qr-display').style.display = 'none';

    // Format number: Remove non-digits, replace leading 0 with 972 (default to Israel if 05...)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('05')) {
        formattedPhone = '972' + formattedPhone.substring(1);
    }

    try {
        const payload = {
            instanceName: name,
            qrcode: !formattedPhone, // If number provided, do NOT ask for QR init (Pairing flow)
            number: formattedPhone
        };

        const res = await fetchAPI('/instances', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            handleConnectionResponse(res.data);
            startConnectionPolling(name);
        } else {
            showNotify(res.error, 'error');
            showWizardStep(1); // Go back
        }
    } catch (e) {
        showNotify(e.message, 'error');
        showWizardStep(1);
    }
};

function handleConnectionResponse(data) {
    const pairingDisplay = document.getElementById('wiz-pairing-display');
    const qrDisplay = document.getElementById('wiz-qr-display');
    const codeEl = document.getElementById('wiz-code');

    if (data.pairingCode) {
        // Pairing Code Flow
        pairingDisplay.style.display = 'block';
        qrDisplay.style.display = 'none';
        codeEl.textContent = data.pairingCode;
    } else if (data.qrcode?.base64 || data.base64) {
        // QR Flow
        pairingDisplay.style.display = 'none';
        qrDisplay.style.display = 'flex';
        qrDisplay.innerHTML = `<img src="${data.qrcode?.base64 || data.base64}" alt="QR">`;
    } else {
        // Fallback: Start polling for QR
        startQRPolling(wizardInstanceName);
    }
}

let qrPollInterval = null;

function startQRPolling(name) {
    stopQRPolling();

    // Poll every 2 seconds for up to 30 seconds
    let attempts = 0;
    const maxAttempts = 15;

    qrPollInterval = setInterval(async () => {
        attempts++;

        try {
            const res = await fetchAPI(`/instances/${name}/qr`);
            if (res.success && (res.data?.base64 || res.data?.qrcode?.base64)) {
                const qrDisplay = document.getElementById('wiz-qr-display');
                qrDisplay.style.display = 'flex';
                qrDisplay.innerHTML = `<img src="${res.data?.base64 || res.data?.qrcode?.base64}" alt="QR">`;
                stopQRPolling();
            }
        } catch (e) {
            console.error('QR fetch error:', e);
        }

        if (attempts >= maxAttempts) {
            stopQRPolling();
            console.warn('QR polling timeout');
        }
    }, 2000);
}

function stopQRPolling() {
    if (qrPollInterval) clearInterval(qrPollInterval);
    qrPollInterval = null;
}

function startConnectionPolling(name) {
    stopPolling();
    connectionPollInterval = setInterval(async () => {
        try {
            const res = await fetchAPI(`/instances/${name}`);
            if (res.success) {
                const state = res.data.instance?.state || res.data.instance?.status;
                if (state === 'open') {
                    stopPolling();
                    stopQRPolling();
                    showWizardStep(3); // Success!
                }
            }
        } catch (e) { }
    }, 2000);
}

function stopPolling() {
    if (connectionPollInterval) clearInterval(connectionPollInterval);
    connectionPollInterval = null;
}

window.finishWizard = () => {
    cancelWizard(); // Redirects to dashboard
};

// --- DELETE LOGIC ---
let deleteTarget = null;
const deleteModal = document.getElementById('delete-modal');

window.openDeleteModal = (name) => {
    deleteTarget = name;
    document.getElementById('delete-target').textContent = name;
    deleteModal.classList.add('active');
};

window.closeDeleteModal = () => {
    deleteModal.classList.remove('active');
    deleteTarget = null;
};

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (!deleteTarget) return;
    try {
        const res = await fetchAPI(`/instances/${deleteTarget}`, { method: 'DELETE' });
        if (res.success) {
            showNotify('Deleted successfully', 'success');
            closeDeleteModal();
            loadDashboard();
        } else {
            showNotify(res.error || 'Failed to delete', 'error');
        }
    } catch (e) { showNotify(e.message, 'error'); }
});

window.logoutInstance = async (name) => {
    if (!confirm(`Logout ${name}?`)) return;
    try {
        await fetchAPI(`/instances/${name}/logout`, { method: 'POST' });
        loadDashboard();
    } catch (e) { showNotify(e.message, 'error'); }
};

// --- HELPERS ---
function showSection(id) {
    Object.values(sections).forEach(el => el.classList.remove('active'));
    sections[id].classList.add('active');

    // Load data hook
    if (id === 'automations') loadAutomations();
}

function showWizardStep(step) {
    Object.values(wizardSteps).forEach(el => el.classList.remove('active'));
    wizardSteps[step].classList.add('active');
}

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
        return {
            success: false,
            error: res.ok ? 'Server returned non-JSON response' : `HTTP ${res.status}: ${res.statusText}`,
            details: text.substring(0, 200)
        };
    }

    return res.json();
}

function showNotify(msg, type = 'success') {
    const area = document.getElementById('notification-area');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    area.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
