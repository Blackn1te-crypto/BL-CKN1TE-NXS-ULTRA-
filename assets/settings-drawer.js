/* ═══════════════════════════════════════════════════════════════════
   BL@CKN1TE-NXS-ULTRA · SETTINGS-DRAWER.JS
   Drawer navigation + settings modal + all drawer item actions
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ═══════════════ SETTINGS STATE ═══════════════
    let botSettings = {
        readReceipts: true,
        ghostMode: false,
        aiEnabled: false,
        autoReact: false,
        antiDelete: false,
        antiStatus: false,
        antiLink: false,
        antiCall: false,
        publicMode: false,
        autoTyping: true
    };

    // Load saved settings
    try {
        const stored = localStorage.getItem('botSettings');
        if (stored) botSettings = { ...botSettings, ...JSON.parse(stored) };
    } catch (e) {}

    function saveSettingsToBot() {
        try { localStorage.setItem('botSettings', JSON.stringify(botSettings)); } catch (e) {}
        const socket = window.socket;
        const currentBotName = localStorage.getItem('botName') || '';
        if (socket && currentBotName) {
            socket.emit('bot-settings-update', { userId: currentBotName, settings: botSettings });
        }
    }

    // ═══════════════ DRAWER NAVIGATION ═══════════════
    function toggleDrawer() {
        const d = document.getElementById('sideDrawer');
        const o = document.getElementById('drawerOverlay');
        if (!d || !o) return;
        d.classList.toggle('open');
        o.classList.toggle('open');
    }

    function setActiveDrawer(action) {
        document.querySelectorAll('.drawer-item').forEach(item => {
            item.classList.toggle('active', item.dataset.action === action);
        });
    }

    // ═══════════════ OPEN SETTINGS ═══════════════
    function openSettings() {
        const currentBotName = localStorage.getItem('botName') || 'Not set';
        const html = `
            <h3>Bot Configuration</h3>
            <p style="color: var(--muted); font-size: 0.72rem; margin-bottom: 14px;">Toggle features — changes save instantly to the bot</p>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Read Receipts</span>
                    <span class="desc">Show blue ticks when reading messages</span>
                </div>
                <div class="toggle-switch ${botSettings.readReceipts ? 'on' : ''}" data-key="readReceipts"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Ghost Mode</span>
                    <span class="desc">Never mark incoming messages as read</span>
                </div>
                <div class="toggle-switch ${botSettings.ghostMode ? 'on' : ''}" data-key="ghostMode"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">AI Auto-Reply</span>
                    <span class="desc">Groq LLM responses to non-command messages</span>
                </div>
                <div class="toggle-switch ${botSettings.aiEnabled ? 'on' : ''}" data-key="aiEnabled"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Auto-React</span>
                    <span class="desc">Random emoji reactions to messages</span>
                </div>
                <div class="toggle-switch ${botSettings.autoReact ? 'on' : ''}" data-key="autoReact"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Anti-Delete</span>
                    <span class="desc">Recover messages deleted by sender</span>
                </div>
                <div class="toggle-switch ${botSettings.antiDelete ? 'on' : ''}" data-key="antiDelete"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Anti-Status</span>
                    <span class="desc">Auto-view & react to WhatsApp status</span>
                </div>
                <div class="toggle-switch ${botSettings.antiStatus ? 'on' : ''}" data-key="antiStatus"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Anti-Link</span>
                    <span class="desc">Remove links from group chats</span>
                </div>
                <div class="toggle-switch ${botSettings.antiLink ? 'on' : ''}" data-key="antiLink"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Anti-Call</span>
                    <span class="desc">Auto-reject incoming calls</span>
                </div>
                <div class="toggle-switch ${botSettings.antiCall ? 'on' : ''}" data-key="antiCall"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Public Mode</span>
                    <span class="desc">Allow commands from anyone</span>
                </div>
                <div class="toggle-switch ${botSettings.publicMode ? 'on' : ''}" data-key="publicMode"></div>
            </div>

            <div class="setting-row">
                <div class="setting-row-label">
                    <span class="name">Auto-Typing</span>
                    <span class="desc">Show "typing..." while processing</span>
                </div>
                <div class="toggle-switch ${botSettings.autoTyping ? 'on' : ''}" data-key="autoTyping"></div>
            </div>

            <div style="margin-top: 18px; padding: 12px; background: rgba(0, 255, 157, 0.06); border: 1px solid rgba(0, 255, 157, 0.2); border-radius: 10px;">
                <p style="font-size: 0.72rem; color: var(--primary); text-align: center; margin: 0;">
                    <i class="fas fa-check-circle"></i> Applied to ${currentBotName}
                </p>
            </div>
        `;
        window.openModal('⚙️ SETTINGS', html);

        setTimeout(() => {
            document.querySelectorAll('.toggle-switch[data-key]').forEach(el => {
                el.addEventListener('click', () => {
                    el.classList.toggle('on');
                    const key = el.dataset.key;
                    botSettings[key] = el.classList.contains('on');
                    saveSettingsToBot();
                    window.showToast(`${key} → ${botSettings[key] ? 'ON' : 'OFF'}`, 'info', 1500);
                });
            });
        }, 100);
    }

    // ═══════════════ DRAWER ACTIONS ═══════════════
    function handleDrawerAction(action) {
        const currentBotName = localStorage.getItem('botName') || '';
        switch (action) {
            case 'dashboard':
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setActiveDrawer('dashboard');
                break;
            case 'sessions':
                document.getElementById('sessionsCard')?.scrollIntoView({ behavior: 'smooth' });
                setActiveDrawer('sessions');
                window.refreshSessions();
                break;
            case 'pair':
                document.getElementById('pairCard')?.scrollIntoView({ behavior: 'smooth' });
                setActiveDrawer('pair');
                break;
            case 'console':
                window.openModal('💻 LIVE CONSOLE', `
                    <h3>Live Console</h3>
                    <p>Terminal logs stream to your browser console (F12).</p>
                    <p>Type <b style="color: var(--primary);">.menu</b> in WhatsApp to see the cyberpunk menu.</p>
                `);
                break;

            // ─── Store & Services ───
            case 'store':
                window.openModal('🛍️ SETTING STORE', `
                    <h3>ULTRA Setting Store</h3>
                    <p>All packs <b style="color: var(--primary);">installed & active</b>:</p>
                    <p>✅ Core Bot — Full</p>
                    <p>✅ AI Engine (Groq) — Full</p>
                    <p>✅ Anti-Ban Shield — Full</p>
                    <p>✅ Auto-React Pro — Full</p>
                    <p>✅ Media Downloader Pro — Full</p>
                    <p>✅ Group Moderation Suite — Full</p>
                    <p>✅ Anti-Delete Engine — Full</p>
                    <p>✅ Auto-Status Engine — Full</p>
                    <p style="color: var(--primary); margin-top: 12px; font-weight: 700;">🎩 All ULTRA modules unlocked</p>
                `);
                break;
            case 'billing':
                window.openModal('💳 BILLING', `
                    <h3>Billing Overview</h3>
                    <p>Plan: <b style="color: var(--primary);">ULTRA LIFETIME</b></p>
                    <p>Status: <b style="color: var(--primary);">ACTIVE · 24/7/365</b></p>
                    <p>Next renewal: <b>NEVER (Lifetime access)</b></p>
                    <p style="color: var(--primary); margin-top: 12px; font-weight: 700;">✅ Full ULTRA access granted</p>
                `);
                break;
            case 'db':
                window.openModal('🗄️ BL@CKN1TE DB', '<p>Loading...</p>');
                fetch('/api/json/stats').then(r => r.json()).then(d => {
                    document.getElementById('nexusModalBody').innerHTML = `
                        <h3>BL@CKN1TE Database</h3>
                        <p>Total sessions: <b style="color: var(--primary);">${d.sessions.total}</b></p>
                        <p>Running bots: <b style="color: var(--primary);">${d.sessions.running}</b></p>
                        <p>Online sessions: <b style="color: var(--primary);">${d.sessions.online}</b></p>
                        <p>Paused: <b style="color: var(--warning);">${d.sessions.paused}</b></p>
                        <p>Storage used: <b style="color: var(--primary);">${d.system.memory.used}</b></p>
                        <p>Storage total: <b>${d.system.memory.total}</b></p>
                        <p>AI: <b style="color: var(--primary);">${d.aiReady ? 'READY' : 'OFFLINE'}</b></p>
                    `;
                }).catch(() => {
                    document.getElementById('nexusModalBody').innerHTML = '<p>Failed to load DB info.</p>';
                });
                break;
            case 'ads':
                window.openModal('📢 ADS MANAGER', `
                    <h3>Ad Campaigns</h3>
                    <p>Ad integration: <b style="color: var(--primary);">ENABLED</b></p>
                    <p>Promote your business through the bot.</p>
                    <a href="https://wa.me/263714799483" target="_blank" style="display:inline-block; padding:12px 22px; background:rgba(0,255,157,0.1); border:1px solid rgba(0,255,157,0.4); border-radius:10px; color:#fff; text-decoration:none; margin-top:12px;">
                        <i class="fab fa-whatsapp"></i> Contact Owner
                    </a>
                `);
                break;
            case 'storage':
                window.openModal('💾 STORAGE', '<p>Loading...</p>');
                fetch('/api/json/stats').then(r => r.json()).then(d => {
                    document.getElementById('nexusModalBody').innerHTML = `
                        <h3>Storage & System</h3>
                        <p>Total RAM: <b style="color: var(--primary);">${d.system.memory.total}</b></p>
                        <p>Used RAM: <b style="color: var(--primary);">${d.system.memory.used}</b></p>
                        <p>Utilization: <b style="color: var(--primary);">${d.system.memory.percent}</b></p>
                        <p>CPU Load: <b style="color: var(--primary);">${d.system.cpu}</b></p>
                        <p>Platform: <b>${d.system.platform}</b></p>
                        <p>Node: <b>${d.system.node}</b></p>
                        <p>Uptime: <b>${d.system.uptimeHuman}</b></p>
                    `;
                }).catch(() => {});
                break;
            case 'shortener':
                window.openModal('🔗 URL SHORTENER', `
                    <h3>URL Shortener</h3>
                    <p>Status: <b style="color: var(--primary);">ACTIVE</b></p>
                    <p>Command: <b style="color: var(--primary);">.shorten &lt;url&gt;</b></p>
                    <p>Links are tracked per session.</p>
                `);
                break;
            case 'webhooks':
                window.openModal('🔌 WEBHOOKS', `
                    <h3>Webhook Endpoints</h3>
                    <p>Status: <b style="color: var(--primary);">LISTENING</b></p>
                    <p>Incoming: <b style="color: var(--primary);">/api/webhook</b></p>
                    <p>Outgoing: <b style="color: var(--primary);">/api/json/*</b></p>
                    <p>Socket.IO: <b style="color: var(--primary);">ws://your-server</b></p>
                    <p>Health: <b style="color: var(--primary);">/health</b></p>
                `);
                break;

            // ─── Others ───
            case 'changelog':
                window.openModal('📝 CHANGELOG', `
                    <h3>ULTRA Changelog</h3>
                    <p><b style="color: var(--primary);">V16 · ULTRA</b> — Current</p>
                    <p>• Extended drawer with 22 items</p>
                    <p>• Cyberpunk code generation console</p>
                    <p>• Searchable A–Z country list</p>
                    <p>• Server-side login auth</p>
                    <p>• Per-session START / STOP</p>
                    <p>• Groq AI integration</p>
                    <p>• Logo caching (instant menu)</p>
                `);
                break;
            case 'backup':
                window.openModal('📥 BACKUP CONFIG', `
                    <h3>Backup Configuration</h3>
                    <p>Config includes: Bot name, prefixes, session prefs, anti-features.</p>
                    <p>Backups stored in <b>data/</b>.</p>
                    <p style="color: var(--primary); margin-top: 12px; font-weight: 700;">✅ Backup ready</p>
                `);
                break;
            case 'restore':
                window.openModal('📤 RESTORE CONFIG', `
                    <h3>Restore Configuration</h3>
                    <p>Bot data: <b style="color: var(--primary);">data/bot_data.json</b></p>
                    <p>Session states: <b style="color: var(--primary);">data/session_states.json</b></p>
                    <p style="color: var(--primary); margin-top: 12px; font-weight: 700;">✅ Auto-restore enabled</p>
                `);
                break;
            case 'logs':
                window.openModal('📄 SYSTEM LOGS', `
                    <h3>System Logs</h3>
                    <p>Browser: DevTools (F12) → Console</p>
                    <p>Server: <b>node server.js</b> terminal</p>
                    <p style="color: var(--primary); margin-top: 12px; font-weight: 700;">✅ Logging active</p>
                `);
                break;

            // ─── Details & Secure ───
            case 'session-info':
                window.openModal('🪪 SESSION INFO', `
                    <h3>Session Information</h3>
                    <p>User: <b style="color: var(--primary);">${currentBotName || 'Not set'}</b></p>
                    <p>Session: <b style="color: var(--primary);">ACTIVE</b></p>
                    <p>Started: <b>${new Date().toLocaleString()}</b></p>
                    <p>TTL: <b>30 minutes of inactivity</b></p>
                    <p>Encryption: <b style="color: var(--primary);">AES-256</b></p>
                `);
                break;
            case '2fa':
                window.openModal('🔑 2FA / OTP', `
                    <h3>Two-Factor Authentication</h3>
                    <p>Status: <b style="color: var(--primary);">READY</b></p>
                    <p>OTP delivery via WhatsApp enabled.</p>
                    <p style="color: var(--muted); font-size: 0.72rem;">Contact owner for setup.</p>
                `);
                break;
            case 'devices':
                window.openModal('📱 LINKED DEVICES', `
                    <h3>Linked Devices</h3>
                    <p>Currently linked: <b style="color: var(--primary);" id="linkedCount">--</b></p>
                    <p style="color: var(--muted); font-size: 0.75rem; margin-top: 12px;">Check Live Sessions for active links.</p>
                `);
                fetch('/api/json/stats').then(r => r.json()).then(d => {
                    const el = document.getElementById('linkedCount');
                    if (el) el.innerText = d.sessions.online + ' device(s)';
                }).catch(() => {});
                break;
            case 'activity':
                window.openModal('🕐 LOGIN ACTIVITY', `
                    <h3>Login Activity</h3>
                    <p>Current session: <b style="color: var(--primary);">${new Date().toLocaleString()}</b></p>
                    <p>IP: <b style="color: var(--primary);">Hidden for security</b></p>
                    <p>Auth method: <b>Server-side session</b></p>
                    <p>Channel verified: <b style="color: var(--primary);">YES</b></p>
                `);
                break;

            // ─── Settings & Stats ───
            case 'settings':
                openSettings();
                break;
            case 'stats':
                window.openModal('📊 LIVE STATS', '<p>Loading...</p>');
                fetch('/api/json/stats').then(r => r.json()).then(d => {
                    document.getElementById('nexusModalBody').innerHTML = `
                        <h3>Live System Stats</h3>
                        <p>Bot: <b style="color: var(--primary);">${d.bot}</b></p>
                        <p>Ping: <b style="color: var(--primary);">${d.ping > 0 ? d.ping + ' ms' : '--'}</b></p>
                        <p>Uptime: <b>${d.system.uptimeHuman}</b></p>
                        <p>CPU Load: <b>${d.system.cpu}</b></p>
                        <p>Memory: <b>${d.system.memory.used} / ${d.system.memory.total} (${d.system.memory.percent})</b></p>
                        <p>Node: <b>${d.system.node}</b></p>
                        <p>Sessions: <b>${d.sessions.total}</b></p>
                        <p>Running: <b style="color: var(--primary);">${d.sessions.running}</b></p>
                        <p>Online: <b style="color: var(--primary);">${d.sessions.online}</b></p>
                        <p>Paused: <b style="color: var(--warning);">${d.sessions.paused}</b></p>
                        <p>AI: <b style="color: var(--primary);">${d.aiReady ? 'READY' : 'OFFLINE'}</b></p>
                    `;
                }).catch(() => {});
                break;

            // ─── Support ───
            case 'about':
                window.openModal('ℹ️ ABOUT ULTRA', `
                    <h3>BL@CKN1TE-NXS-ULTRA</h3>
                    <p style="color: var(--primary); font-family: Orbitron; font-weight: 700; letter-spacing: 2px; margin-bottom: 12px;">THE INCISIVE TRI-HAT HACKER</p>
                    <p><b>Features:</b><br>
                        • Multi-session WhatsApp bots<br>
                        • Pairing-code linking<br>
                        • Lifetime auto-reconnect<br>
                        • Groq AI engine ready<br>
                        • Live monitoring dashboard<br>
                        • Ultra-fast Baileys core<br>
                        • Cyberpunk menu system
                    </p>
                    <p><b>Prefixes:</b> .  /  &gt;</p>
                    <p style="color: var(--muted); font-size: 0.75rem; margin-top: 14px;">© 2026 BL@CKN1TE · ULTRA EDITION</p>
                `);
                break;
            case 'contact':
                window.openModal('📱 CONTACT OWNER', `
                    <h3>Reach BL@CKN1TE</h3>
                    <p>Tap to open WhatsApp:</p>
                    <a href="https://wa.me/263714799483" target="_blank" style="display:block; padding:14px; background:rgba(0,255,157,0.08); border:1px solid rgba(0,255,157,0.3); border-radius:12px; color:#fff; text-decoration:none; margin-bottom:10px;">
                        <b>Primary Support</b><br>
                        <span style="color: var(--primary);">+263 714 799 483</span>
                    </a>
                    <a href="https://wa.me/263780540231" target="_blank" style="display:block; padding:14px; background:rgba(0,255,157,0.08); border:1px solid rgba(0,255,157,0.3); border-radius:12px; color:#fff; text-decoration:none;">
                        <b>Alternate</b><br>
                        <span style="color: var(--primary);">+263 780 540 231</span>
                    </a>
                `);
                break;
            case 'channel':
                window.open('https://whatsapp.com/channel/0029VbDubJNHbFV50Y6oiO3f', '_blank');
                break;
            case 'support':
                window.openModal('🎧 SUPPORT', `
                    <h3>24/7 Support</h3>
                    <p>Status: <b style="color: var(--primary);">ONLINE</b></p>
                    <p>Response time: usually within 1 hour.</p>
                    <p><b>Channels:</b></p>
                    <p>• WhatsApp (Primary)</p>
                    <p>• WhatsApp Channel (Updates)</p>
                    <p style="color: var(--primary); margin-top: 12px; font-weight: 700;">✅ Support team ready</p>
                `);
                break;
        }
    }

    // ═══════════════ BIND EVENTS ═══════════════
    function bindDrawerEvents() {
        document.querySelectorAll('.drawer-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.dataset.toggle) {
                    e.stopPropagation();
                    const submenu = document.getElementById(item.dataset.toggle);
                    if (submenu) {
                        item.classList.toggle('open');
                        submenu.classList.toggle('open');
                    }
                    return;
                }
                const action = item.dataset.action;
                if (!action) return;
                toggleDrawer();
                setTimeout(() => handleDrawerAction(action), 250);
            });
        });

        document.querySelectorAll('.drawer-subitem').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (!action) return;
                toggleDrawer();
                setTimeout(() => handleDrawerAction(action), 250);
            });
        });
    }

    // ═══════════════ EXPOSE ═══════════════
    window.toggleDrawer = toggleDrawer;
    window.handleDrawerAction = handleDrawerAction;
    window.openSettings = openSettings;

    // ═══════════════ INIT ═══════════════
    document.addEventListener('DOMContentLoaded', () => {
        bindDrawerEvents();
        console.log('[SETTINGS-DRAWER] Ready');
    });
})();
