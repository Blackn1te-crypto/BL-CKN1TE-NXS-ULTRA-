/* ═══════════════════════════════════════════════════════════════════
   BL@CKN1TE-NXS-ULTRA · SCRIPT.JS
   Main dashboard logic — socket, sessions, generation, health poll
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ═══════════════ STATE ═══════════════
    let socket = null;
    let currentBotName = localStorage.getItem('botName') || '';
    let botSessionOnline = false;
    let genAbort = false;
    let genConsole_ = null;

    // Expose globally for drawer module
    window.__nexusState = {
        get socket() { return socket; },
        get botName() { return currentBotName; },
        get online() { return botSessionOnline; }
    };

    // ═══════════════ TOAST ═══════════════
    function showToast(message, type = 'info', duration = 4000) {
        const c = document.getElementById('toastContainer');
        if (!c) return;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(100%)';
            t.style.transition = '0.3s';
            setTimeout(() => t.remove(), 300);
        }, duration);
    }
    window.showToast = showToast;

    // ═══════════════ DRAWER TOGGLE ═══════════════
    window.toggleDrawer = function () {
        const d = document.getElementById('sideDrawer');
        const o = document.getElementById('drawerOverlay');
        if (!d || !o) return;
        d.classList.toggle('open');
        o.classList.toggle('open');
    };

    // ═══════════════ MODAL ═══════════════
    function openModal(title, html) {
        const t = document.getElementById('nexusModalTitle');
        const b = document.getElementById('nexusModalBody');
        const m = document.getElementById('nexusModal');
        if (!t || !b || !m) return;
        t.innerText = title;
        b.innerHTML = html;
        m.classList.add('open');
    }
    window.openModal = openModal;
    window.closeModal = function () {
        document.getElementById('nexusModal')?.classList.remove('open');
    };

    // ═══════════════ COUNTRY / PREFIX ═══════════════
    const COUNTRIES = [
        { name: 'Afghanistan', code: '93' }, { name: 'Albania', code: '355' }, { name: 'Algeria', code: '213' },
        { name: 'Andorra', code: '376' }, { name: 'Angola', code: '244' }, { name: 'Argentina', code: '54' },
        { name: 'Armenia', code: '374' }, { name: 'Australia', code: '61' }, { name: 'Austria', code: '43' },
        { name: 'Azerbaijan', code: '994' }, { name: 'Bahamas', code: '1242' }, { name: 'Bahrain', code: '973' },
        { name: 'Bangladesh', code: '880' }, { name: 'Barbados', code: '1246' }, { name: 'Belarus', code: '375' },
        { name: 'Belgium', code: '32' }, { name: 'Belize', code: '501' }, { name: 'Benin', code: '229' },
        { name: 'Bhutan', code: '975' }, { name: 'Bolivia', code: '591' }, { name: 'Botswana', code: '267' },
        { name: 'Brazil', code: '55' }, { name: 'Brunei', code: '673' }, { name: 'Bulgaria', code: '359' },
        { name: 'Burkina Faso', code: '226' }, { name: 'Burundi', code: '257' }, { name: 'Cambodia', code: '855' },
        { name: 'Cameroon', code: '237' }, { name: 'Canada', code: '1' }, { name: 'Chad', code: '235' },
        { name: 'Chile', code: '56' }, { name: 'China', code: '86' }, { name: 'Colombia', code: '57' },
        { name: 'Congo', code: '242' }, { name: 'Costa Rica', code: '506' }, { name: 'Croatia', code: '385' },
        { name: 'Cuba', code: '53' }, { name: 'Cyprus', code: '357' }, { name: 'Czech Republic', code: '420' },
        { name: 'Denmark', code: '45' }, { name: 'Djibouti', code: '253' }, { name: 'Dominican Republic', code: '1809' },
        { name: 'Ecuador', code: '593' }, { name: 'Egypt', code: '20' }, { name: 'El Salvador', code: '503' },
        { name: 'Estonia', code: '372' }, { name: 'Ethiopia', code: '251' }, { name: 'Fiji', code: '679' },
        { name: 'Finland', code: '358' }, { name: 'France', code: '33' }, { name: 'Gabon', code: '241' },
        { name: 'Gambia', code: '220' }, { name: 'Georgia', code: '995' }, { name: 'Germany', code: '49' },
        { name: 'Ghana', code: '233' }, { name: 'Greece', code: '30' }, { name: 'Guatemala', code: '502' },
        { name: 'Guinea', code: '224' }, { name: 'Guyana', code: '592' }, { name: 'Haiti', code: '509' },
        { name: 'Honduras', code: '504' }, { name: 'Hong Kong', code: '852' }, { name: 'Hungary', code: '36' },
        { name: 'Iceland', code: '354' }, { name: 'India', code: '91' }, { name: 'Indonesia', code: '62' },
        { name: 'Iran', code: '98' }, { name: 'Iraq', code: '964' }, { name: 'Ireland', code: '353' },
        { name: 'Israel', code: '972' }, { name: 'Italy', code: '39' }, { name: 'Ivory Coast', code: '225' },
        { name: 'Jamaica', code: '1876' }, { name: 'Japan', code: '81' }, { name: 'Jordan', code: '962' },
        { name: 'Kazakhstan', code: '7' }, { name: 'Kenya', code: '254' }, { name: 'Kuwait', code: '965' },
        { name: 'Kyrgyzstan', code: '996' }, { name: 'Laos', code: '856' }, { name: 'Latvia', code: '371' },
        { name: 'Lebanon', code: '961' }, { name: 'Lesotho', code: '266' }, { name: 'Liberia', code: '231' },
        { name: 'Libya', code: '218' }, { name: 'Lithuania', code: '370' }, { name: 'Luxembourg', code: '352' },
        { name: 'Macau', code: '853' }, { name: 'Madagascar', code: '261' }, { name: 'Malawi', code: '265' },
        { name: 'Malaysia', code: '60' }, { name: 'Maldives', code: '960' }, { name: 'Mali', code: '223' },
        { name: 'Malta', code: '356' }, { name: 'Mauritania', code: '222' }, { name: 'Mauritius', code: '230' },
        { name: 'Mexico', code: '52' }, { name: 'Moldova', code: '373' }, { name: 'Monaco', code: '377' },
        { name: 'Mongolia', code: '976' }, { name: 'Montenegro', code: '382' }, { name: 'Morocco', code: '212' },
        { name: 'Mozambique', code: '258' }, { name: 'Myanmar', code: '95' }, { name: 'Namibia', code: '264' },
        { name: 'Nepal', code: '977' }, { name: 'Netherlands', code: '31' }, { name: 'New Zealand', code: '64' },
        { name: 'Nicaragua', code: '505' }, { name: 'Niger', code: '227' }, { name: 'Nigeria', code: '234' },
        { name: 'North Korea', code: '850' }, { name: 'Norway', code: '47' }, { name: 'Oman', code: '968' },
        { name: 'Pakistan', code: '92' }, { name: 'Palestine', code: '970' }, { name: 'Panama', code: '507' },
        { name: 'Papua New Guinea', code: '675' }, { name: 'Paraguay', code: '595' }, { name: 'Peru', code: '51' },
        { name: 'Philippines', code: '63' }, { name: 'Poland', code: '48' }, { name: 'Portugal', code: '351' },
        { name: 'Puerto Rico', code: '1787' }, { name: 'Qatar', code: '974' }, { name: 'Romania', code: '40' },
        { name: 'Russia', code: '7' }, { name: 'Rwanda', code: '250' }, { name: 'Saudi Arabia', code: '966' },
        { name: 'Senegal', code: '221' }, { name: 'Serbia', code: '381' }, { name: 'Seychelles', code: '248' },
        { name: 'Sierra Leone', code: '232' }, { name: 'Singapore', code: '65' }, { name: 'Slovakia', code: '421' },
        { name: 'Slovenia', code: '386' }, { name: 'Somalia', code: '252' }, { name: 'South Africa', code: '27' },
        { name: 'South Korea', code: '82' }, { name: 'South Sudan', code: '211' }, { name: 'Spain', code: '34' },
        { name: 'Sri Lanka', code: '94' }, { name: 'Sudan', code: '249' }, { name: 'Suriname', code: '597' },
        { name: 'Sweden', code: '46' }, { name: 'Switzerland', code: '41' }, { name: 'Syria', code: '963' },
        { name: 'Taiwan', code: '886' }, { name: 'Tajikistan', code: '992' }, { name: 'Tanzania', code: '255' },
        { name: 'Thailand', code: '66' }, { name: 'Togo', code: '228' }, { name: 'Tonga', code: '676' },
        { name: 'Trinidad and Tobago', code: '1868' }, { name: 'Tunisia', code: '216' }, { name: 'Turkey', code: '90' },
        { name: 'Turkmenistan', code: '993' }, { name: 'Uganda', code: '256' }, { name: 'Ukraine', code: '380' },
        { name: 'United Arab Emirates', code: '971' }, { name: 'United Kingdom', code: '44' }, { name: 'United States', code: '1' },
        { name: 'Uruguay', code: '598' }, { name: 'Uzbekistan', code: '998' }, { name: 'Vanuatu', code: '678' },
        { name: 'Venezuela', code: '58' }, { name: 'Vietnam', code: '84' }, { name: 'Yemen', code: '967' },
        { name: 'Zambia', code: '260' }, { name: 'Zimbabwe', code: '263' }
    ];

    let selectedCountry = null;

    function initCountrySelector() {
        const countrySearch = document.getElementById('countrySearch');
        const countryDropdown = document.getElementById('countryDropdown');
        const countryList = document.getElementById('countryList');
        const countrySelect = document.getElementById('countrySelect');
        const prefixText = document.getElementById('prefixText');
        if (!countrySearch) return;

        function renderCountryList(filter = '') {
            if (!countryList) return;
            const q = filter.toLowerCase().trim();
            const filtered = q ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q)) : COUNTRIES;

            if (filtered.length === 0) {
                countryList.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7a90;font-size:0.78rem;">No countries found</div>';
                return;
            }

            countryList.innerHTML = filtered.map(c => `
                <div class="country-item" data-code="${c.code}" data-name="${c.name}">
                    <span style="flex:1;">${c.name}</span>
                    <span style="color:#00ff9d;font-family:monospace;font-size:0.8rem;font-weight:700;">+${c.code}</span>
                </div>
            `).join('');

            countryList.querySelectorAll('.country-item').forEach(item => {
                item.addEventListener('click', () => {
                    selectedCountry = { name: item.dataset.name, code: item.dataset.code };
                    countrySearch.value = selectedCountry.name;
                    countrySelect.value = selectedCountry.code;
                    prefixText.innerText = selectedCountry.code;
                    countryDropdown.style.display = 'none';
                });
            });
        }

        countrySearch.addEventListener('focus', () => {
            renderCountryList(countrySearch.value);
            countryDropdown.style.display = 'block';
        });

        countrySearch.addEventListener('input', () => {
            renderCountryList(countrySearch.value);
            countryDropdown.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-shell')) {
                if (countryDropdown) countryDropdown.style.display = 'none';
            }
        });

        renderCountryList();
    }

    // ═══════════════ SOCKET ═══════════════
    function initSocket() {
        try {
            socket = io({ transports: ['websocket', 'polling'], reconnection: true });
            window.socket = socket;

            socket.on('connect', () => {
                console.log('[SOCKET] Connected');
                updateMainStatus(true);
                refreshSessions();
            });

            socket.on('disconnect', () => {
                console.log('[SOCKET] Disconnected');
                updateMainStatus(false);
            });

            socket.on('pairing-code', (code) => {
                revealPairingCode(code);
            });

            socket.on('connection-status', (data) => {
                if (!data) return;
                if (data.user) {
                    currentBotName = data.user;
                    localStorage.setItem('botName', data.user);
                    const nameEl = document.getElementById('drawerUserName');
                    const avatarEl = document.getElementById('drawerAvatar');
                    if (nameEl) nameEl.innerText = data.user;
                    if (avatarEl) avatarEl.innerText = data.user.charAt(0).toUpperCase();
                }
                if (typeof data.running === 'boolean') botSessionOnline = data.running;
                updateMainStatus(botSessionOnline || data.connected);
            });

            socket.on('session-status', (data) => {
                if (!data) return;
                if (typeof data.running === 'boolean') botSessionOnline = data.running;
                updateMainStatus(botSessionOnline);
                refreshSessions();
            });

            socket.on('total-active', (data) => {
                if (!data) return;
                const a = document.getElementById('statActive');
                const s = document.getElementById('statSessions');
                if (a) a.innerText = data.count || 0;
                if (s) s.innerText = data.sessions || 0;
            });

            socket.on('sessions-list', (list) => {
                renderSessions(list);
            });

            socket.on('blacklist-block', (data) => {
                showToast(data?.message || 'Access denied', 'error', 6000);
            });

        } catch (e) {
            console.error('Socket init failed:', e);
        }
    }

    // ═══════════════ STATUS UI ═══════════════
    function updateMainStatus(isOnline) {
        const pill = document.getElementById('mainStatusPill');
        const label = document.getElementById('mainStatusLabel');
        if (!pill || !label) return;
        if (isOnline) {
            pill.classList.remove('offline');
            label.innerText = '— connected';
        } else {
            pill.classList.add('offline');
            label.innerText = '— offline';
        }
    }

    // ═══════════════ CYBERPUNK GENERATION ═══════════════
    function genTimestamp() {
        return new Date().toTimeString().slice(0, 8);
    }

    function termLine(message, type = 'info', prefix = '›') {
        if (!genConsole_) return;
        const div = document.createElement('div');
        div.className = 'gen-line ' + type;
        const pc = type === 'error' ? 'err' : type === 'warning' ? 'warn' : type === 'info' ? 'info' : '';
        div.innerHTML = `<span class="gt">[${genTimestamp()}]</span><span class="gp ${pc}">${prefix}</span><span class="gm ${type}">${message}</span>`;
        genConsole_.appendChild(div);
        genConsole_.scrollTop = genConsole_.scrollHeight;
    }

    function termProgress(label, pct) {
        if (!genConsole_) return;
        let existing = genConsole_.querySelector(`[data-progress="${label}"]`);
        if (existing) {
            const fill = existing.querySelector('.gen-progress-fill');
            const pctEl = existing.querySelector('.gen-progress-pct');
            if (fill) fill.style.width = pct + '%';
            if (pctEl) pctEl.innerText = pct + '%';
        } else {
            const div = document.createElement('div');
            div.className = 'gen-progress';
            div.dataset.progress = label;
            div.innerHTML = `
                <span class="gen-progress-label">${label}</span>
                <div class="gen-progress-track"><div class="gen-progress-fill"></div></div>
                <span class="gen-progress-pct">0%</span>
            `;
            genConsole_.appendChild(div);
        }
        genConsole_.scrollTop = genConsole_.scrollHeight;
    }

    function typeText(message, type = 'info', prefix = '›', speed = 12) {
        return new Promise(resolve => {
            if (!genConsole_ || genAbort) return resolve();
            const div = document.createElement('div');
            div.className = 'gen-line ' + type;
            const id = 'typ-' + Date.now() + Math.random().toString(36).slice(2, 6);
            const pc = type === 'error' ? 'err' : type === 'warning' ? 'warn' : type === 'info' ? 'info' : '';
            div.innerHTML = `<span class="gt">[${genTimestamp()}]</span><span class="gp ${pc}">${prefix}</span><span class="gm ${type}" id="${id}"></span><span class="gen-cursor"></span>`;
            genConsole_.appendChild(div);
            genConsole_.scrollTop = genConsole_.scrollHeight;
            const span = document.getElementById(id);
            let i = 0;
            const interval = setInterval(() => {
                if (genAbort) {
                    clearInterval(interval);
                    const c = div.querySelector('.gen-cursor');
                    if (c) c.remove();
                    return resolve();
                }
                if (!span) { clearInterval(interval); return resolve(); }
                span.textContent = message.slice(0, i + 1);
                i++;
                genConsole_.scrollTop = genConsole_.scrollHeight;
                if (i >= message.length) {
                    clearInterval(interval);
                    const c = div.querySelector('.gen-cursor');
                    if (c) c.remove();
                    resolve();
                }
            }, speed);
        });
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function showGenConsole() {
        genAbort = false;
        document.getElementById('genCard').style.display = 'block';
        document.getElementById('codeCard').style.display = 'none';
        document.getElementById('genActions').style.display = 'none';
        genConsole_ = document.getElementById('genConsole');
        genConsole_.innerHTML = '';
        document.getElementById('genCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function runGenerationSequence(botName, fullNumber) {
        await typeText(`Initializing secure channel for ${botName}...`, 'info', '◆', 14);
        await sleep(400);
        await typeText(`Validating WhatsApp number +${fullNumber}...`, 'info', '◆', 12);
        await sleep(400);
        await typeText(`Connecting to Baileys core...`, 'info', '◆', 14);
        await sleep(500);
        await typeText(`Encrypting session payload...`, 'info', '◆', 12);
        await sleep(400);

        termProgress('HANDSHAKE', 0);
        for (let p = 0; p <= 100; p += 10) {
            if (genAbort) return;
            termProgress('HANDSHAKE', p);
            await sleep(80);
        }
        termLine('Secure handshake established', 'success', '✓');
        await sleep(200);

        await typeText(`Requesting pairing code from WhatsApp servers...`, 'info', '◆', 12);
        await sleep(500);

        termProgress('GENERATING', 0);
        for (let p = 0; p <= 100; p += 5) {
            if (genAbort) return;
            termProgress('GENERATING', p);
            await sleep(60);
        }
        termLine('8-digit pairing code generated', 'success', '✓');
        await sleep(200);

        await typeText(`Awaiting server transmission...`, 'info', '◆', 12);
        await sleep(500);

        const waitDiv = document.createElement('div');
        waitDiv.className = 'gen-line info';
        waitDiv.innerHTML = `<span class="gt">[${genTimestamp()}]</span><span class="gp info">◇</span><span class="gm info">Waiting for server code...<span class="gen-cursor"></span></span>`;
        genConsole_.appendChild(waitDiv);
        genConsole_.scrollTop = genConsole_.scrollHeight;
    }

    function revealPairingCode(code) {
        if (!genConsole_) return;
        genConsole_.querySelectorAll('.gen-cursor').forEach(c => c.remove());

        const codeDiv = document.createElement('div');
        codeDiv.className = 'gen-code-display';
        codeDiv.innerHTML = `
            <div class="label">PAIRING CODE</div>
            <div class="value">${code}</div>
        `;
        genConsole_.appendChild(codeDiv);
        genConsole_.scrollTop = genConsole_.scrollHeight;

        termLine(`✓ Code transmitted successfully`, 'success', '✓');
        termLine(`Open WhatsApp → Linked Devices → Link with phone number`, 'info', '◆');
        termLine(`Enter the code above to complete pairing`, 'info', '◆');

        setTimeout(() => {
            document.getElementById('genActions').style.display = 'flex';
            document.getElementById('pairingCode').innerText = code;
            showToast('Pairing code generated!', 'success', 5000);
            document.getElementById('codeCard').style.display = 'block';
        }, 600);
    }

    window.cancelGenerate = function () {
        genAbort = true;
        document.getElementById('genCard').style.display = 'none';
        document.getElementById('codeCard').style.display = 'none';
        showToast('Generation cancelled', 'info', 2000);
    };

    window.cancelCode = function () {
        document.getElementById('codeCard').style.display = 'none';
        showToast('Code panel closed', 'info', 2000);
    };

    // ═══════════════ CONNECT ═══════════════
    function bindConnect() {
        const btn = document.getElementById('connectBtn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const botName = document.getElementById('botNameInput').value.trim() ||
                            localStorage.getItem('botName') || '';
            const country = document.getElementById('countrySelect').value;
            const number = document.getElementById('numberInput').value.trim();

            if (!botName) return showToast('Enter a bot name', 'error');
            if (!country) return showToast('Select a country', 'error');
            if (!number || number.length < 5) return showToast('Enter valid WhatsApp number', 'error');

            const cleanNumber = number.replace(/^0+/, '').replace(/\D/g, '');
            const fullNumber = country + cleanNumber;
            localStorage.setItem('botName', botName);
            currentBotName = botName;
            const nameEl = document.getElementById('drawerUserName');
            const avatarEl = document.getElementById('drawerAvatar');
            if (nameEl) nameEl.innerText = botName;
            if (avatarEl) avatarEl.innerText = botName.charAt(0).toUpperCase();

            showGenConsole();

            if (socket) {
                socket.emit('set-user', botName);
                socket.emit('pair-request', { userId: botName, number: fullNumber });
            }

            runGenerationSequence(botName, fullNumber);
        });
    }

    // ═══════════════ COPY CODE ═══════════════
    function copyCode(srcId) {
        const code = document.getElementById(srcId)?.innerText || '----';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                showToast('Code copied ✅', 'success', 2000);
                const cc = document.getElementById('codeCard');
                if (cc && cc.style.display !== 'none') {
                    setTimeout(() => {
                        cc.style.transition = 'opacity 0.6s';
                        cc.style.opacity = '0';
                        setTimeout(() => {
                            cc.style.display = 'none';
                            cc.style.opacity = '1';
                        }, 600);
                    }, 800);
                }
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast('Code copied ✅', 'success', 2000);
        }
    }

    function bindCopy() {
        document.getElementById('copyCodeBtn')?.addEventListener('click', () => copyCode('pairingCode'));
        document.getElementById('copyCodeBtn2')?.addEventListener('click', () => copyCode('pairingCode'));
        document.getElementById('cancelPairBtn')?.addEventListener('click', () => {
            document.getElementById('codeCard').style.display = 'none';
            document.getElementById('pairCard').style.display = 'block';
            showToast('Pairing cancelled', 'info', 2000);
        });
    }

    // ═══════════════ SESSIONS ═══════════════
    window.refreshSessions = function () {
        if (socket) socket.emit('get-all-sessions');
    };

    function renderSessions(list) {
        const body = document.getElementById('sessionsBody');
        if (!body) return;
        if (!list || list.length === 0) {
            body.innerHTML = '<p class="hint-text">No sessions yet. Pair a WhatsApp number above.</p>';
            return;
        }
        body.innerHTML = list.map(s => `
            <div class="session-row">
                <div class="session-info">
                    <span class="session-dot ${s.connected ? 'online' : ''}"></span>
                    <div>
                        <div class="session-name">${s.userId}</div>
                        <div class="session-state ${s.running ? 'online' : ''}">
                            ${s.connected ? (s.running ? '● ONLINE' : '● PAUSED') : '● OFFLINE'}
                        </div>
                    </div>
                </div>
                <div>
                    ${s.running
                        ? `<button class="btn-mini danger" onclick="stopSession('${s.userId}')">STOP</button>`
                        : `<button class="btn-mini" onclick="startSession('${s.userId}')">START</button>`}
                </div>
            </div>
        `).join('');
    }

    window.startSession = function (userId) {
        if (socket) {
            socket.emit('set-user', userId);
            socket.emit('start-session', { userId });
            showToast(`Starting ${userId}...`, 'info', 2000);
        }
    };
    window.stopSession = function (userId) {
        if (socket) {
            socket.emit('stop-session', { userId });
            showToast(`Stopping ${userId}...`, 'info', 2000);
        }
    };

    // ═══════════════ HEALTH POLL ═══════════════
    let baseUptime = 0;
    let lastPoll = 0;

    async function pollHealth() {
        try {
            const r = await fetch('/health', { cache: 'no-store' });
            const d = await r.json();
            baseUptime = Number(d.uptime) || 0;
            lastPoll = Date.now();
            const a = document.getElementById('statActive');
            const s = document.getElementById('statSessions');
            const u = document.getElementById('statUptime');
            if (a) a.innerText = d.active || 0;
            if (s) s.innerText = d.sessions || 0;
            if (u) u.innerText = formatDur(baseUptime);
        } catch (e) {}
    }

    function formatDur(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m`;
        return `${Math.floor(sec)}s`;
    }

    // ═══════════════ LOGOUT ═══════════════
    window.performLogout = function () {
        window.toggleDrawer();
        const userId = localStorage.getItem('botName') || 'default';
        if (socket) socket.emit('logout', userId);
        setTimeout(() => {
            localStorage.removeItem('nexusAuth');
            sessionStorage.removeItem('nexusAuth');
            localStorage.removeItem('botName');
            window.location.href = '/login.html';
        }, 800);
    };

    // ═══════════════ PRELOADER ═══════════════
    function hidePreloader() {
        setTimeout(() => {
            document.getElementById('preloader')?.classList.add('hide');
        }, 900);
    }

    // ═══════════════ AUTO-RESUME ═══════════════
    function autoResume() {
        if (currentBotName && socket) {
            setTimeout(() => {
                socket.emit('set-user', currentBotName);
                const bn = document.getElementById('botNameInput');
                const dn = document.getElementById('drawerUserName');
                const da = document.getElementById('drawerAvatar');
                if (bn) bn.value = currentBotName;
                if (dn) dn.innerText = currentBotName;
                if (da) da.innerText = currentBotName.charAt(0).toUpperCase();
                refreshSessions();
            }, 500);
        }
    }

    // ═══════════════ BOOT ═══════════════
    document.addEventListener('DOMContentLoaded', () => {
        initCountrySelector();
        initSocket();
        bindConnect();
        bindCopy();

        // Menu toggle
        document.getElementById('menuToggleBtn')?.addEventListener('click', window.toggleDrawer);

        updateMainStatus(false);

        setTimeout(() => {
            pollHealth();
            refreshSessions();
        }, 800);

        setInterval(pollHealth, 5000);
        setInterval(() => {
            if (!lastPoll) return;
            const u = document.getElementById('statUptime');
            if (u) u.innerText = formatDur(baseUptime + (Date.now() - lastPoll) / 1000);
        }, 1000);

        hidePreloader();
        autoResume();

        console.log('[ULTRA PANEL] Ready 🎩🔥⚡️');
    });
})();
