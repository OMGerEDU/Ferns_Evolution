const API_URL = '/api';
const AUTH_URL = '/admin/auth';
let API_KEY = localStorage.getItem('evolution_api_key');

// State
let connectionPollInterval = null;

// UI References
const sections = {
    login: document.getElementById('login-section'),
    dashboard: document.getElementById('dashboard-section'),
    wizard: document.getElementById('wizard-section')
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
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            API_KEY = data.apiKey;
            localStorage.setItem('evolution_api_key', API_KEY);
            showSection('dashboard');
            loadDashboard();
        } else {
            showNotify('Invalid credentials', 'error');
        }
    } catch (e) { showNotify(e.message, 'error'); }
});

window.logout = () => {
    localStorage.removeItem('evolution_api_key');
    API_KEY = null;
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
                ${inst.status === 'disconnected'
                ? `<button class="btn btn-secondary" onclick="restartWizard('${inst.name}')">Connect</button>`
                : `<button class="btn btn-secondary" onclick="logoutInstance('${inst.name}')">Logout</button>`}
                <button class="btn btn-danger" onclick="openDeleteModal('${inst.name}')">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });
}

function updateStats(t, c, d) {
    document.getElementById('stat-total').textContent = t;
    document.getElementById('stat-connected').textContent = c;
    document.getElementById('stat-disconnected').textContent = d;
}

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

window.submitWizardConfig = async () => {
    const name = document.getElementById('wiz-name').value.trim();
    const phone = document.getElementById('wiz-phone').value.trim();
    if (!name) return showNotify('Instance name required', 'error');

    wizardInstanceName = name;
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
