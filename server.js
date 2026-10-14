// ═══════════════════════════════════════════════════════════════════
//  BL@CKN1TE-NXS-ULTRA · SERVER v16 · MEGA ULTIMATE
//  The Incisive Tri-Hat Hacker
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const os = require('os');
const NodeCache = require('node-cache');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    jidNormalizedUser,
    Browsers,
    delay
} = require('@whiskeysockets/baileys');
const P = require('pino');
const { OpenAI } = require('openai');

// ═══════════════ SETTINGS ═══════════════
let settings;
try {
    settings = require('./settings');
} catch (e) {
    console.log('⚠️  settings.js not found — using defaults');
    settings = {
        botName: 'BL@CKN1TE-NXS',
        botVersion: 'V16-ULTRA',
        ownerName: 'BL@CKN1TE',
        ownerNumber: '263714799483',
        channelUrl: 'https://whatsapp.com/channel/0029VbDubJNHbFV50Y6oiO3f',
        prefixes: ['.', '/', '>'],
        logoUrl: 'https://raw.githubusercontent.com/Blackn1te-crypto/BLACKN1TE-NXS/main/logo.png'
    };
}

// ═══════════════ CONFIG ═══════════════
const PREFIXES = settings.prefixes || ['.', '/', '>'];
const OWNER_SECRET = process.env.OWNER_SECRET || 'blacknite_owner_2025';
const SESSION_SECRET = process.env.SESSION_SECRET || 'blacknite_session_2025';
const PANEL_USER = process.env.PANEL_USER || 'blacknite';
const PANEL_PASS = process.env.PANEL_PASS || 'ultra2026';
const CHANNEL_URL = settings.channelUrl || 'https://whatsapp.com/channel/0029VbDubJNHbFV50Y6oiO3f';
const LOGO_URL = settings.logoUrl || 'https://raw.githubusercontent.com/Blackn1te-crypto/BLACKN1TE-NXS/main/logo.png';
const CMD_DIR = path.join(__dirname, 'commands');
const LOCAL_LOGO = path.join(__dirname, 'logo.png');

// ═══════════════ RUNTIME FLAGS ═══════════════
const INFINITE_MODE = true;
const SILENT_RECONNECT = true;
const PROMax_SPEED = true;
const LIFETIME_CONNECTION = true;

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const AUTO_RELOAD_INTERVAL_MS = 3 * 60 * 1000;
const SESSION_WATCHDOG_MS = 45 * 1000;
const KEEPALIVE_PRESENCE_MS = 30 * 1000;
const ACTIVE_CHECK_INTERVAL_MS = 45 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 20000;
const DEFAULT_QUERY_TIMEOUT_MS = 20000;
const KEEP_ALIVE_INTERVAL_MS = 10000;
const RETRY_REQUEST_DELAY_MS = 300;
const MAX_MSG_RETRY_COUNT = 3;
const RECONNECT_SILENCE_WINDOW_MS = 120000;

// ═══════════════ LOGO BUFFER CACHE ═══════════════
let LOGO_BUFFER = null;
let LOGO_LOADING = false;

async function preloadLogo() {
    if (LOGO_BUFFER || LOGO_LOADING) return LOGO_BUFFER;
    LOGO_LOADING = true;

    // 1. Try local file first
    try {
        if (fs.existsSync(LOCAL_LOGO)) {
            LOGO_BUFFER = fs.readFileSync(LOCAL_LOGO);
            console.log(`✅ [LOGO] Local file cached (${LOGO_BUFFER.length} bytes)`);
            LOGO_LOADING = false;
            return LOGO_BUFFER;
        }
    } catch (e) { console.error('Local logo read failed:', e.message); }

    // 2. Fetch from GitHub
    try {
        const res = await axios.get(LOGO_URL, { responseType: 'arraybuffer', timeout: 15000 });
        LOGO_BUFFER = Buffer.from(res.data);
        console.log(`✅ [LOGO] Fetched from URL (${LOGO_BUFFER.length} bytes)`);
        // Save to local for next time
        try { fs.writeFileSync(LOCAL_LOGO, LOGO_BUFFER); } catch (_) {}
    } catch (e) {
        console.error(`⚠️ [LOGO] Preload failed: ${e.message}`);
    }

    LOGO_LOADING = false;
    return LOGO_BUFFER;
}

async function getLogoBuffer() {
    if (LOGO_BUFFER && LOGO_BUFFER.length > 0) return LOGO_BUFFER;
    return await preloadLogo();
}

async function ensureLogo(retries = 5) {
    for (let i = 0; i < retries; i++) {
        const buf = await getLogoBuffer();
        if (buf && buf.length > 0) return buf;
        await delay(1500);
    }
    return null;
}

// ═══════════════ SAFE COMMAND LOADER ═══════════════
function safeRequire(filePath, name) {
    try {
        if (fs.existsSync(filePath) || fs.existsSync(filePath + '.js')) {
            console.log(`✅ [CMD] Loaded: ${name}`);
            return require(filePath);
        }
        console.log(`⚠️  [CMD] Skipped (missing): ${name}`);
        return async function stub(sock, from, msg) {
            try {
                await sock.sendMessage(from, {
                    text: `⚠️ *Command .${name} is not available in this build.*\n\n_Contact owner for support._`
                }, { quoted: msg });
            } catch (e) {}
        };
    } catch (e) {
        console.error(`❌ [CMD] Failed: ${name}: ${e.message}`);
        return async function stub(sock, from, msg) {
            try {
                await sock.sendMessage(from, {
                    text: `⚠️ *Command .${name} is temporarily offline.*\n\n_Retry shortly._`
                }, { quoted: msg });
            } catch (e) {}
        };
    }
}

const commands = {
    ping: safeRequire(path.join(CMD_DIR, 'ping'), 'ping'),
    owner: safeRequire(path.join(CMD_DIR, 'owner'), 'owner'),
    song: safeRequire(path.join(CMD_DIR, 'song'), 'song'),
    video: safeRequire(path.join(CMD_DIR, 'video'), 'video'),
    tiktok: safeRequire(path.join(CMD_DIR, 'tiktok'), 'tiktok'),
    insta: safeRequire(path.join(CMD_DIR, 'insta'), 'insta'),
    facebook: safeRequire(path.join(CMD_DIR, 'facebook'), 'facebook'),
    gdrive: safeRequire(path.join(CMD_DIR, 'gdrive'), 'gdrive'),
    mf: safeRequire(path.join(CMD_DIR, 'mf'), 'mf'),
    apk: safeRequire(path.join(CMD_DIR, 'apk'), 'apk'),
    dp: safeRequire(path.join(CMD_DIR, 'dp'), 'dp'),
    vv: safeRequire(path.join(CMD_DIR, 'vv'), 'vv'),
    ai: safeRequire(path.join(CMD_DIR, 'ai'), 'ai'),
    image: safeRequire(path.join(CMD_DIR, 'image'), 'image'),
    tts: safeRequire(path.join(CMD_DIR, 'tts'), 'tts'),
    translate: safeRequire(path.join(CMD_DIR, 'translate'), 'translate'),
    character: safeRequire(path.join(CMD_DIR, 'character'), 'character'),
    emojimix: safeRequire(path.join(CMD_DIR, 'emojimix'), 'emojimix'),
    joke: safeRequire(path.join(CMD_DIR, 'joke'), 'joke'),
    meme: safeRequire(path.join(CMD_DIR, 'meme'), 'meme'),
    weather: safeRequire(path.join(CMD_DIR, 'weather'), 'weather'),
    qr: safeRequire(path.join(CMD_DIR, 'qr'), 'qr'),
    shorten: safeRequire(path.join(CMD_DIR, 'shorten'), 'shorten'),
    calc: safeRequire(path.join(CMD_DIR, 'calc'), 'calc'),
    antilink: safeRequire(path.join(CMD_DIR, 'antilink'), 'antilink'),
    anticall: safeRequire(path.join(CMD_DIR, 'anticall'), 'anticall'),
    antidelete: safeRequire(path.join(CMD_DIR, 'antidelete'), 'antidelete'),
    antistatus: safeRequire(path.join(CMD_DIR, 'antistatus'), 'antistatus'),
    autoreacts: safeRequire(path.join(CMD_DIR, 'autoreacts'), 'autoreacts'),
    autostatus: safeRequire(path.join(CMD_DIR, 'status'), 'status'),
    kick: safeRequire(path.join(CMD_DIR, 'kick'), 'kick'),
    kickoffline: safeRequire(path.join(CMD_DIR, 'kickoffline'), 'kickoffline'),
    hidetag: safeRequire(path.join(CMD_DIR, 'hidetag'), 'hidetag'),
    tagall: safeRequire(path.join(CMD_DIR, 'tagall'), 'tagall'),
    setname: safeRequire(path.join(CMD_DIR, 'setname'), 'setname'),
    groupinfo: safeRequire(path.join(CMD_DIR, 'groupinfo'), 'groupinfo'),
    accept: safeRequire(path.join(CMD_DIR, 'accept'), 'accept'),
    hack: safeRequire(path.join(CMD_DIR, 'hack'), 'hack'),
    private: safeRequire(path.join(CMD_DIR, 'private'), 'private'),
    public: safeRequire(path.join(CMD_DIR, 'public'), 'public'),
    autoread: safeRequire(path.join(CMD_DIR, 'autoread'), 'autoread'),
    read: safeRequire(path.join(CMD_DIR, 'read'), 'read'),
    online: safeRequire(path.join(CMD_DIR, 'online'), 'online'),
    incisiveTrihatTools: safeRequire(path.join(CMD_DIR, 'incisive-trihat-tools'), 'incisive-trihat-tools'),
    blackn1teWebsites: safeRequire(path.join(CMD_DIR, 'blackn1te-websites'), 'blackn1te-websites'),
    settings: safeRequire(path.join(CMD_DIR, 'settings'), 'settings')
};

// ═══════════════ HOOK LOADERS ═══════════════
let handleAutoread = async () => {};
let autoreadCommand = null;
try {
    if (fs.existsSync(path.join(CMD_DIR, 'autoread.js'))) {
        const ar = require(path.join(CMD_DIR, 'autoread'));
        if (ar.handleAutoread) handleAutoread = ar.handleAutoread;
        if (ar.autoreadCommand) autoreadCommand = ar.autoreadCommand;
    }
} catch (e) {}

let handleStatusUpdate = async () => {};
try { if (fs.existsSync(path.join(CMD_DIR, 'autostatus.js'))) { const su = require(path.join(CMD_DIR, 'autostatus')); if (su.handleStatusUpdate) handleStatusUpdate = su.handleStatusUpdate; } } catch (e) {}

let storeMessage = async () => {};
let handleMessageRevocation = async () => {};
try { if (fs.existsSync(path.join(CMD_DIR, 'antidelete.js'))) { const ad = require(path.join(CMD_DIR, 'antidelete')); if (ad.storeMessage) storeMessage = ad.storeMessage; if (ad.handleMessageRevocation) handleMessageRevocation = ad.handleMessageRevocation; } } catch (e) {}

// ═══════════════ APP + SOCKET ═══════════════
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingInterval: 15000,
    pingTimeout: 10000,
    connectTimeout: 5000,
    maxHttpBufferSize: 1e8,
    perMessageDeflate: false
});

let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1"
        });
        console.log(`✅ [AI] Ready (${process.env.AI_MODEL || 'llama-3.1-8b-instant'})`);
    } catch (e) { console.error('❌ [AI] Init failed:', e.message); }
}

// ═══════════════ MIDDLEWARE ═══════════════
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));
app.use(express.static(path.join(__dirname), { maxAge: '1d' }));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { maxAge: '1d' }));

// ═══════════════ ROUTES ═══════════════
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'login.html')); });
app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, 'login.html')); });
app.get('/login.html', (req, res) => { res.sendFile(path.join(__dirname, 'login.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/dashboard.html', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/index.html', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/welcome', (req, res) => { res.redirect('/login.html'); });

// ═══════════════ LOGO BUFFER ENDPOINT ═══════════════
app.get('/logo.png', async (req, res) => {
    try {
        const buf = await getLogoBuffer();
        if (buf && buf.length > 0) {
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'public, max-age=86400');
            res.set('Content-Disposition', 'inline; filename="bl@ckn1te-nxs-logo.png"');
            res.send(buf);
        } else {
            res.redirect(LOGO_URL);
        }
    } catch (e) {
        res.redirect(LOGO_URL);
    }
});

// Download endpoint — user can save logo file
app.get('/download-logo', async (req, res) => {
    try {
        const buf = await getLogoBuffer();
        if (buf && buf.length > 0) {
            res.set('Content-Type', 'image/png');
            res.set('Content-Disposition', 'attachment; filename="bl@ckn1te-nxs-logo.png"');
            res.send(buf);
        } else {
            res.status(404).json({ error: 'Logo not cached yet' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════ AUTH ═══════════════
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ success: false, error: 'Missing credentials' });

        const validUser = 'bl@ckn1te';
        const validPass = '0506';

        if (username.toLowerCase() === validUser && password === validPass) {
            const sessionToken = require('crypto').randomBytes(24).toString('hex');
            req.session.user = username;
            req.session.token = sessionToken;
            req.session.timestamp = Date.now();
            return res.json({
                success: true,
                user: username,
                token: sessionToken,
                timestamp: req.session.timestamp,
                redirect: '/index.html'
            });
        }
        return res.status(401).json({ success: false, error: 'Invalid operator ID or access key' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ═══════════════ MONITORING HELPERS ═══════════════
let cachedPing = -1;
let cachedPingTime = 0;

async function measurePing() {
    if (Date.now() - cachedPingTime < 15000 && cachedPing > 0) return cachedPing;
    const start = Date.now();
    try {
        await axios.get('https://www.google.com', { timeout: 2500 });
        cachedPing = Date.now() - start;
        cachedPingTime = Date.now();
        return cachedPing;
    } catch (e) {
        return cachedPing > 0 ? cachedPing : -1;
    }
}

function getSystemStats() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    const cpuLoad = os.loadavg()[0].toFixed(2);
    const uptimeSec = Math.floor(process.uptime());
    return {
        memory: {
            total: (totalMem / 1024 / 1024).toFixed(0) + ' MB',
            used: (usedMem / 1024 / 1024).toFixed(0) + ' MB',
            percent: memPercent + '%'
        },
        cpu: cpuLoad,
        uptime: uptimeSec,
        uptimeHuman: formatUptime(uptimeSec),
        platform: os.platform(),
        node: process.version
    };
}

function getSessionStats() {
    const all = Object.values(sessions);
    return {
        total: all.length,
        running: all.filter(s => s.isRunning).length,
        online: all.filter(s => s.isConnected).length,
        paused: all.filter(s => !s.isRunning && s.isConnected).length
    };
}

function formatUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ═══════════════ HEALTH + BADGE ═══════════════
app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const sys = getSystemStats();
    const sess = getSessionStats();
    res.json({
        status: 'ok',
        bot: settings.botName,
        version: settings.botVersion || 'V16-ULTRA',
        sessions: sess.total,
        active: sess.running,
        online: sess.online,
        paused: sess.paused,
        uptime: sys.uptime,
        uptimeHuman: sys.uptimeHuman,
        memory: sys.memory,
        cpu: sys.cpu,
        node: sys.node,
        platform: sys.platform,
        timestamp: Date.now(),
        mode: INFINITE_MODE ? 'INFINITE' : 'STANDARD',
        speed: PROMax_SPEED ? 'PROMAX' : 'STANDARD',
        connection: LIFETIME_CONNECTION ? 'LIFETIME' : 'STANDARD',
        logoCached: !!LOGO_BUFFER,
        aiReady: !!openai
    });
});

app.get('/api/badge', (req, res) => {
    const sess = getSessionStats();
    const uptimeSec = Math.floor(process.uptime());
    res.set('Cache-Control', 'public, max-age=30');
    res.json({
        status: sess.running > 0 ? 'online' : 'idle',
        schemaVersion: 1,
        label: 'bot',
        message: sess.running > 0 ? 'ONLINE' : 'IDLE',
        color: sess.running > 0 ? '00ff80' : 'ffbe3c',
        isError: false,
        activeBots: sess.running,
        onlineSessions: sess.online,
        sessions: sess.total,
        uptime: uptimeSec,
        uptimeHuman: formatUptime(uptimeSec),
        speed: PROMax_SPEED ? 'PROMAX' : 'STANDARD'
    });
});

// ═══════════════ JSON FALLBACKS ═══════════════
app.get('/api/json/stats', async (req, res) => {
    const sys = getSystemStats();
    const sess = getSessionStats();
    const ping = await measurePing();
    res.json({
        success: true,
        system: sys,
        sessions: sess,
        ping,
        bot: settings.botName,
        version: settings.botVersion || 'V16-ULTRA',
        aiReady: !!openai,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/json/banner', (req, res) => {
    const userId = req.query.user || 'default';
    const botName = req.query.bot || settings.botName;
    const realSession = sessions[userId];
    const fakeSession = {
        userId,
        isRunning: realSession ? realSession.isRunning : true,
        isConnected: realSession ? realSession.isConnected : true
    };
    res.json({
        success: true,
        banner: buildCyberpunkBannerSync(fakeSession, botName),
        online: fakeSession.isRunning,
        user: userId
    });
});

app.get('/api/json/menu', (req, res) => {
    const userId = req.query.user || 'default';
    const fakeSession = { userId, isRunning: true, isConnected: true, readReceipts: true, autoReact: false, aiEnabled: false, isPublic: false };
    const fakeBotData = { antiDelete: {}, statusSettings: {}, antilinkGroups: {}, antiCall: {} };
    res.json({
        success: true,
        menu: buildBeautifulMenuSync(fakeSession, fakeBotData, 'Operator'),
        online: true,
        user: userId
    });
});

app.get('/api/json/settings', (req, res) => {
    res.json({
        success: true,
        settings: {
            botName: settings.botName,
            prefixes: PREFIXES,
            infiniteMode: INFINITE_MODE,
            promaxSpeed: PROMax_SPEED,
            lifetimeConnection: LIFETIME_CONNECTION,
            version: settings.botVersion || 'V16-ULTRA',
            aiReady: !!openai,
            aiBaseUrl: process.env.AI_BASE_URL || 'openai',
            aiModel: process.env.AI_MODEL || 'llama-3.1-8b-instant'
        }
    });
});

app.get('/api/sessions', (req, res) => {
    const list = Object.values(sessions).map(s => ({
        userId: s.userId,
        connected: s.isConnected,
        running: s.isRunning,
        paused: s.isPaused,
        initialized: !!s.sock
    }));
    res.json({
        total: list.length,
        active: list.filter(s => s.running).length,
        online: list.filter(s => s.connected).length,
        sessions: list
    });
});

// ═══════════════ STORAGE ═══════════════
const AUTH_DIR = settings.authDir || './auth_info';
const DATA_FILE = './data/bot_data.json';
const BLACKLIST_FILE = './data/blacklist.json';
const SESSION_STATE_FILE = './data/session_states.json';
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

const defaultBotData = {
    antilinkGroups: {}, totalBots: 0, registeredBots: [],
    statusSettings: {}, antiDelete: {}, userNames: {},
    antiCall: {}, antiStatusGroups: {}, readSettings: {}
};

function safeReadJson(file, fallback) {
    try {
        if (fs.existsSync(file)) {
            const raw = fs.readFileSync(file, 'utf8');
            if (!raw.trim()) return JSON.parse(JSON.stringify(fallback));
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
                return { ...JSON.parse(JSON.stringify(fallback)), ...parsed };
            }
            return JSON.parse(JSON.stringify(fallback));
        }
    } catch (e) {
        console.error(`⚠️ [JSON] Corrupt: ${file} — fallback used.`);
        try { fs.copyFileSync(file, file + '.corrupt.' + Date.now()); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(fallback));
}

function safeWriteJson(file, data) {
    try {
        const dir = path.dirname(file);
        fs.ensureDirSync(dir);
        const tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
        fs.renameSync(tmp, file);
    } catch (e) {
        console.error(`❌ [JSON] Write: ${file}: ${e.message}`);
    }
}

let botData = safeReadJson(DATA_FILE, defaultBotData);
function saveBotData() { safeWriteJson(DATA_FILE, botData); }

let blacklist = safeReadJson(BLACKLIST_FILE, { numbers: [], botNames: [] });
function saveBlacklist() { safeWriteJson(BLACKLIST_FILE, blacklist); }

let sessionStates = safeReadJson(SESSION_STATE_FILE, {});
function saveSessionStates() { safeWriteJson(SESSION_STATE_FILE, sessionStates); }

function isNumberBlacklisted(num) {
    if (!num) return false;
    const clean = String(num).replace(/\D/g, '');
    return blacklist.numbers.some(n => String(n).replace(/\D/g, '') === clean);
}
function isBotNameBlacklisted(name) {
    if (!name) return false;
    return blacklist.botNames.some(n => n.toLowerCase() === String(name).toLowerCase());
}

// ═══════════════ RUNTIME ═══════════════
const sessions = {};
const userSockets = {};
const messageLogs = {};

// ═══════════════ BOLD UNICODE ═══════════════
const toBold = (text) => {
    const boldChars = {
        'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇',
        'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭',
        '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵'
    };
    return text.split('').map(c => boldChars[c] || c).join('');
};

// ═══════════════ CYBERPUNK BANNER ═══════════════
function buildCyberpunkBannerSync(session, botName) {
    const pingMs = cachedPing;
    const sys = getSystemStats();
    const sess = getSessionStats();
    const pingStr = pingMs < 0 ? '⛔ --' : (pingMs < 150 ? `🟢 ${pingMs} ms` : pingMs < 400 ? `🟡 ${pingMs} ms` : `🔴 ${pingMs} ms`);
    const botState = session.isRunning ? '🟢 ONLINE' : '🔴 OFFLINE';
    const linkState = session.isConnected ? '✅ LINKED' : '❌ UNLINKED';
    const liveStamp = new Date().toLocaleString();

    return (
`⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧
    ░▒▓█  ${toBold('BL@CKN1TE-NXS')}  █▓▒░
    ░▒▓█  ${toBold('V16 • CYBERPUNK • INFINITE')}  █▓▒░
⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧

⚡️🔥⚡️   ${toBold('SYSTEM ONLINE')}   ⚡️🔥⚡️

╔═══════════════════════════════════════╗
║  📡 ${toBold('LIVE CONSOLE SNAPSHOT')}
╚═══════════════════════════════════════╝

╰┈➤ 🛰️ ${toBold('LINK')}      : ✅ ${toBold('ESTABLISHED')}
╰┈➤ 🤖 ${toBold('BOT')}       : ${botName}
╰┈➤ 🧬 ${toBold('SESSION')}   : ${session.userId.slice(0, 18)}
╰┈➤ ⚙️ ${toBold('MODE')}      : ♾️ ${toBold('INFINITE')}
╰┈➤ ${session.isRunning ? '🟢' : '🔴'} ${toBold('STATE')}     : ${botState}
╰┈➤ 🔗 ${toBold('LINK')}      : ${linkState}
╰┈➤ 📶 ${toBold('PING')}      : ${pingStr}
╰┈➤ ⏱️ ${toBold('UPTIME')}    : ${sys.uptimeHuman}
╰┈➤ 🧠 ${toBold('MEMORY')}    : ${sys.memory.used} / ${sys.memory.total}
╰┈➤ ⚙️ ${toBold('CPU')}       : ${sys.cpu}
╰┈➤ 🔣 ${toBold('PREFIXES')}  : .  /  >
╰┈➤ ⏱️ ${toBold('STAMP')}     : ${liveStamp}

╔═══════════════════════════════════════╗
║   🚀✨💎  ${toBold('CONNECTION SUCCESSFUL')}
╚═══════════════════════════════════════╝

╰┈➤ 🎯 ${toBold("YOU'RE NOW LINKED TO")}
╰┈➤ ➜ ${toBold('BL@CKN1TE-NXS')} · ${toBold('V16 ULTRA')}
╰┈➤ ➜ ${toBold('SECURED & ENCRYPTED')}
╰┈➤ ➜ ${toBold('LIFETIME CONNECTION')}

┏━〔 ${toBold('🌐 SESSION POOL')} 〕━━━━━━━━━
┃  🟢 ${toBold('RUNNING')}  : ${sess.running}
┃  🟢 ${toBold('ONLINE')}   : ${sess.online}
┃  🟡 ${toBold('PAUSED')}   : ${sess.paused}
┃  📊 ${toBold('TOTAL')}    : ${sess.total}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡️🔥 ${toBold('READY TO DOMINATE')} 🔥⚡️
💎 ${toBold('TYPE')}  .menu   ${toBold('FOR COMMANDS')}
🔥 ${toBold('TYPE')}  .owner  ${toBold('FOR HACKER')}
🚀 ${toBold('TYPE')}  .ping   ${toBold('FOR LATENCY')}

⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧
║  🔗 ${toBold('CHANNEL')}
║  ➜ ${CHANNEL_URL}
║  🖼️ Logo: ${toBold('/logo.png')}
║  📥 Download: ${toBold('/download-logo')}
⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧

   🎩🔥⚡️ ${toBold('BL@CKN1TE-NXS')} ⚡️🔥🎩
       ▸ ${toBold('END OF TRANSMISSION')} ◂`
    );
}

// ═══════════════ CYBERPUNK MENU ═══════════════
function buildBeautifulMenuSync(session, botData, customName) {
    const p = PREFIXES[0] || '.';
    const modeIcon = session.isPublic ? '🌐' : '🔒';
    const modeText = session.isPublic ? 'PUBLIC' : 'PRIVATE';
    const ownerName = settings.ownerName || 'BL@CKN1TE';
    const version = settings.botVersion || 'V16-ULTRA';
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('en-GB');
    const sysStats = getSystemStats();
    const pingStr = cachedPing > 0 ? `${cachedPing} ms` : '--';
    const statusStr = session.isRunning ? '🟢 ONLINE' : '🔴 OFFLINE';

    const userCore = [`${p}read`, `${p}ghost`, `${p}autoreacts`, `${p}ai`, `${p}vv`, `${p}dp`, `${p}ping`, `${p}owner`, `${p}translate`, `${p}online`];
    const mediaVault = [`${p}song`, `${p}video`, `${p}tiktok`, `${p}insta`, `${p}facebook`, `${p}gdrive`, `${p}mf`, `${p}apk`];
    const aiSynthesis = [`${p}image`, `${p}tts`, `${p}character`];
    const utilities = [`${p}weather`, `${p}qr`, `${p}shorten`, `${p}calc`, `${p}joke`, `${p}meme`, `${p}emojimix`];
    const adminProtocols = [`${p}private`, `${p}public`, `${p}autoread`, `${p}status`, `${p}anticall`, `${p}antidelete`, `${p}antilink`, `${p}antistatus`, `${p}kickoffline`];
    const groupWarfare = [`${p}hidetag`, `${p}tagall`, `${p}setname`, `${p}kick`, `${p}groupinfo`, `${p}accept`, `${p}hack`];
    const hub = [`${p}websites`, `${p}trihat`];
    const ownerZone = [`${p}settings`];

    const totalCmds = userCore.length + mediaVault.length + aiSynthesis.length + utilities.length +
                     adminProtocols.length + groupWarfare.length + hub.length + ownerZone.length;

    const header = `⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧
    ░▒▓█  ${toBold('BL@CKN1TE-NXS')}  █▓▒░
    ░▒▓█  ${toBold('V16 • CYBERPUNK CORE • ULTRA')}  █▓▒░
⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧

⚡️🔥  ${statusStr}  🔥⚡️`;

    const stats = `╔═══════════════════════════════════════╗
║  📡 ${toBold('CYBERPUNK CORE STATUS')}
╚═══════════════════════════════════════╝
╰┈➤ 👑 ${toBold('OPERATOR')} : ${ownerName}
╰┈➤ 🧬 ${toBold('SESSION')}  : ${session.userId.slice(0, 18)}
╰┈➤ ⚙️ ${toBold('VERSION')}  : ${version} • PROMAX
╰┈➤ 📅 ${toBold('DATE')}     : ${dayName}, ${dateStr}
╰┈➤ ⏱️ ${toBold('UPTIME')}   : ${sysStats.uptimeHuman}
╰┈➤ ${modeIcon} ${toBold('MODE')}     : ${modeText}
╰┈➤ 📶 ${toBold('PING')}     : ${pingStr}
╰┈➤ 📊 ${toBold('COMMANDS')} : ${totalCmds}+ loaded
╰┈➤ 🔣 ${toBold('PREFIXES')} : ${PREFIXES.join('  ')}
⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧`;

    const menu = `╔═══════════════════════════════════════╗
║  ░▒▓ ${toBold('COMMAND MATRIX')} ▓▒░
╚═══════════════════════════════════════╝

┏━〔 ${toBold('⚙️ USER CORE')} 〕━━━━━━━━━━━━
${userCore.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('🎬 MEDIA VAULT')} 〕━━━━━━━━━━
${mediaVault.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('🧠 AI & SYNTHESIS')} 〕━━━━━━━
${aiSynthesis.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('🛠️ UTILITIES')} 〕━━━━━━━━━━━
${utilities.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('🛡️ ADMIN PROTOCOLS')} 〕━━━━━
${adminProtocols.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('⚔️ GROUP WARFARE')} 〕━━━━━━
${groupWarfare.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('🌐 BL@CKN1TE HUB')} 〕━━━━━━━
${hub.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┏━〔 ${toBold('👑 OWNER ZONE')} 〕━━━━━━━━━
${ownerZone.map(c => `┃  ▸ ${toBold(c)}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    const footer = `⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧
║  🔗 ${toBold('CHANNEL')}
║  ➜ ${CHANNEL_URL}
║  ──────────────────────────────────
║  ⚡ ${toBold('Powered by BL@CKN1TE')}
║  🎩 ${toBold('The Incisive Tri-Hat Hacker')}
║  ♾️ ${toBold('INFINITE')} • ${toBold('24/7/365')} • ${toBold('PROMAX')}
⛧━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⛧

  ░▒▓█ ${toBold('END OF TRANSMISSION')} █▓▒░
       🎩🔥⚡️ ${toBold('BL@CKN1TE-NXS')} ⚡️🔥🎩`;

    return header + '\n\n' + stats + '\n\n' + menu + '\n\n' + footer;
}

const LIGHTNING_EMOJIS = ['⚡', '🌩️', '⚡️', '✨', '🌟', '🔥', '💫', '🪄', '⚡'];
const RANDOM_REACTIONS = ['⚡', '🔥', '✨', '🌟', '💫', '🎯', '🚀', '💥', '⚡️', '👑', '💎', '🎉', '✅', '🤖', '😎', '🙌', '👏', '💯', '🌟', '🪄', '🧿', '🍀', '🌈', '❤️', '👍', '🎊', '⭐'];
function getRandomReaction() { return RANDOM_REACTIONS[Math.floor(Math.random() * RANDOM_REACTIONS.length)]; }

// ═══════════════ BOT SESSION ═══════════════
class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.isRunning = false;
        this.isPaused = false;
        this.aiEnabled = false;
        this.isPairing = false;

        const persisted = sessionStates[userId];
        if (persisted && typeof persisted.isRunning === 'boolean') this.isRunning = persisted.isRunning;

        const persistedRead = botData.readSettings?.[userId]?.enabled;
        this.readReceipts = (persistedRead === undefined) ? true : persistedRead;

        this.autoReact = botData.statusSettings?.[userId]?.autoReact || false;
        this.isPublic = botData.statusSettings?.[userId]?.isPublic || false;
        this.authPath = path.join(AUTH_DIR, userId);
        this.processedMessages = new Set();
        this.activeInterval = null;
        this.keepAliveInterval = null;
        this.watchdogInterval = null;
        this.heartbeatInterval = null;
        this.isInitializing = false;
        this.lastConnectMessageTime = null;
        this.reconnectAttempts = 0;
        this.silentMode = SILENT_RECONNECT;
        this.lastReconnectLog = 0;
        this.everConnected = false;
        this.botJidCache = null;
        this._lastStatusSignature = null;
        this._linkedLoggedOnce = false;
        this._reconnectTimer = null;
        this.disconnectedSince = null;
    }

    persistState() {
        sessionStates[this.userId] = {
            isRunning: this.isRunning,
            updatedAt: Date.now()
        };
        saveSessionStates();
    }

    sendLog(message, type = 'info') {
        if (this.everConnected) {
            const noise = /reconnect|closed|retry|attempt|link dropped|restart required|connection lost|init hiccup/i;
            if (noise.test(message)) {
                const now = Date.now();
                const disconnectedFor = this.disconnectedSince ? (now - this.disconnectedSince) : 0;
                if (disconnectedFor < RECONNECT_SILENCE_WINDOW_MS) return;
                if (now - this.lastReconnectLog < 5 * 60 * 1000) return;
                this.lastReconnectLog = now;
            }
        }
        const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type, user: this.userId };
        const socketId = userSockets[this.userId];
        if (socketId) io.to(socketId).emit('console', logEntry);
        io.emit('console', logEntry);
        console.log(`[${this.userId}] ${message}`);
    }

    sendConnectionStatus(force = false) {
        const signature = `${this.isConnected}|${this.isRunning}`;
        if (!force && this._lastStatusSignature === signature) return;
        this._lastStatusSignature = signature;

        const socketId = userSockets[this.userId];
        const payload = {
            connected: this.isConnected,
            running: this.isRunning,
            user: this.userId
        };
        if (socketId) io.to(socketId).emit('connection-status', payload);
        io.emit('session-status', payload);

        io.emit('total-active', {
            count: Object.values(sessions).filter(s => s.isRunning).length,
            online: Object.values(sessions).filter(s => s.isConnected).length,
            sessions: Object.keys(sessions).length
        });
    }

    async reactRandom(msg) {
        try { await this.sock.sendMessage(msg.key.remoteJid, { react: { text: getRandomReaction(), key: msg.key } }); } catch (e) {}
    }

    async getAIResponse(userJid, userMessage) {
        if (!openai) return null;
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.AI_MODEL || "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "You are BL@CKN1TE-NXS-ULTRA, a helpful WhatsApp assistant created by BL@CKN1TE (The Incisive Tri-Hat Hacker). Reply in the same language the user writes in. Keep responses helpful, concise, and friendly."
                    },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 1024,  // Increased memory
                temperature: 0.75,
                top_p: 0.95
            });
            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error(`[AI] Error: ${error.message}`);
            return null;
        }
    }

    startKeepAlive() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(async () => {
            if (this.isConnected && this.sock?.user) {
                try { await this.sock.sendPresenceUpdate(this.isRunning ? 'available' : 'unavailable'); } catch (e) {}
            }
        }, KEEPALIVE_PRESENCE_MS);
    }

    startWatchdog() {
        if (this.watchdogInterval) clearInterval(this.watchdogInterval);
        this.watchdogInterval = setInterval(async () => {
            if (this.isInitializing) return;
            if (this.isPairing) return;
            if (!this.sock || !this.sock.user || !this.isConnected) {
                try { await this.initialize(); } catch (e) {}
            }
        }, SESSION_WATCHDOG_MS);
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(async () => {
            if (!this.sock || !this.sock.user) return;
            try { await this.sock.sendPresenceUpdate(this.isRunning ? 'available' : 'unavailable'); }
            catch (e) { if (!this.isInitializing) { try { await this.initialize(); } catch (err) {} } }
        }, HEARTBEAT_INTERVAL_MS);
    }

    startActiveCheck() {
        if (this.activeInterval) clearInterval(this.activeInterval);
        this.activeInterval = setInterval(async () => {
            if (this.isConnected && this.isRunning && this.sock?.user) {
                try {
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    await this.sock.sendMessage(botNumber, {
                        text: "♾️ 𝗕𝗟@𝗖𝗞𝗡𝟭𝗧𝗘-𝗡𝗫𝗦 𝗜𝗦 𝗢𝗡𝗟𝗜𝗡𝗘 🚀\n\n_Lifetime Connection Active_"
                    });
                } catch (e) {}
            }
        }, ACTIVE_CHECK_INTERVAL_MS);
    }

    async forceReconnect(delayMs = 3000) {
        if (this.isInitializing) return;
        if (this.isPairing) return;
        this.reconnectAttempts++;
        this.sendLog(`🔄 Reconnect #${this.reconnectAttempts} in ${delayMs/1000}s`, "warning");
        setTimeout(async () => {
            try { await this.initialize(); }
            catch (e) {
                const next = Math.min(delayMs * 2, 30000);
                setTimeout(() => this.forceReconnect(next), next);
            }
        }, delayMs);
    }

    async initialize(pairingNumber = null) {
        if (this.isInitializing) return;
        this.isInitializing = true;

        if (pairingNumber) this.isPairing = true;

        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' }))
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: false,
                keepAliveIntervalMs: KEEP_ALIVE_INTERVAL_MS,
                connectTimeoutMs: CONNECT_TIMEOUT_MS,
                defaultQueryTimeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
                emitOwnEvents: true,
                retryRequestDelayMs: RETRY_REQUEST_DELAY_MS,
                maxMsgRetryCount: MAX_MSG_RETRY_COUNT,
                linkPreviewImageThumbnailWidth: 192,
                generateHighQualityLinkPreview: false,
                getMessage: async (key) => {
                    if (messageLogs[key.id]) return { conversation: messageLogs[key.id].text };
                    return { conversation: 'Bot is active' };
                }
            });

            if (pairingNumber && !state.creds.registered) {
                setTimeout(async () => {
                    try {
                        let code = await this.sock.requestPairingCode(pairingNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        this.sendLog(`🔑 Pairing Code: ${code}`, 'success');
                        const socketId = userSockets[this.userId];
                        if (socketId) io.to(socketId).emit('pairing-code', code);
                        this.isPairing = false;
                    } catch (err) {
                        this.sendLog(`❌ Pairing error: ${err.message}`, 'error');
                        this.isPairing = false;
                    }
                }, 1500);
            }

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall?.[this.userId] && this.isRunning) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                await this.sock.rejectCall(call.id, call.from);
                                await this.sock.sendMessage(call.from, { text: "⚠️ *ANTI-CALL:* Calls rejected." });
                            } catch (e) {}
                        }
                    }
                }
            });

            this.sock.ev.on('messages.upsert', async (m) => {
                if (m.type !== 'notify') return;

                if (!this.isRunning) {
                    if (!this._pausedNoticeShown) {
                        this._pausedNoticeShown = true;
                        this.sendLog('⏸️ Bot paused — messages ignored until START is pressed.', 'warning');
                    }
                    return;
                }

                try {
                    const firstMsg = m.messages?.[0];
                    if (firstMsg) {
                        const senderJid = firstMsg.key.participant || firstMsg.key.remoteJid || '';
                        const senderNum = senderJid.split('@')[0].split(':')[0].replace(/\D/g, '');
                        if (senderNum && isNumberBlacklisted(senderNum)) return;
                    }
                } catch (e) {}

                await Promise.all(m.messages.map(async (msg) => {
                    try {
                        const from = msg.key.remoteJid;
                        const isMe = msg.key.fromMe;
                        const isGroup = from.endsWith('@g.us');
                        const isStatus = from === 'status@broadcast';

                        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                        if (!messageContent) return;

                        let type = Object.keys(messageContent)[0];
                        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();

                        if (!isMe && !isStatus) {
                            if (this.readReceipts !== false) handleAutoread(this.sock, msg, this).catch(() => {});
                            else { try { this.sock.sendPresenceUpdate('available'); } catch (e) {} }
                            storeMessage(msg).catch(() => {});
                        }

                        if (msg.message?.protocolMessage?.type === 0) { handleMessageRevocation(this.sock, msg).catch(() => {}); return; }

                        const msgId = msg.key.id;
                        if (this.processedMessages.has(msgId)) return;
                        this.processedMessages.add(msgId);
                        if (this.processedMessages.size > 800) this.processedMessages.delete(this.processedMessages.values().next().value);

                        if (!isStatus) {
                            let logEntry = { text, type };
                            if (['imageMessage','videoMessage','audioMessage'].includes(type)) {
                                try {
                                    const mContent = messageContent[type];
                                    if (mContent && (mContent.directPath || mContent.url)) {
                                        const stream = await downloadContentFromMessage(mContent, type.replace('Message',''));
                                        let buffer = Buffer.from([]);
                                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                                        logEntry.buffer = buffer;
                                    }
                                } catch (e) {}
                            }
                            logEntry.pushName = msg.pushName || 'User';
                            messageLogs[msgId] = logEntry;
                            if (Object.keys(messageLogs).length > 1500) delete messageLogs[Object.keys(messageLogs)[0]];
                        }

                        if (this.autoReact && !isMe && !isStatus) {
                            const emojis = ['❤️','👍','🔥','👏','😮','😂','🙌','✨','⭐','✅','🤖','⚡','🌟','💯','🌈','💎','👑','🎉','🧿','🍀'];
                            try { this.sock.sendMessage(from, { react: { text: emojis[Math.floor(Math.random()*emojis.length)], key: msg.key } }); } catch (e) {}
                        }

                        if (this.aiEnabled && !isMe && !isStatus && !isGroup && text && !PREFIXES.some(p => text.startsWith(p))) {
                            try {
                                const aiResponse = await this.getAIResponse(from, text);
                                if (aiResponse) await this.sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
                            } catch (e) {}
                        }

                        if (isStatus && !isMe) { handleStatusUpdate(this.sock, m, botData, this.userId).catch(() => {}); return; }

                        const botNumber = jidNormalizedUser(this.sock.user.id);
                        const sender = msg.key.participant || from;
                        const isOwner = isMe || sender.includes(botNumber.split('@')[0]);
                        let isAdmin = isOwner;

                        if (!isAdmin && isGroup) {
                            try {
                                const gmd = await this.sock.groupMetadata(from);
                                const participant = gmd.participants.find(p => p.id === sender);
                                isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                            } catch (e) { isAdmin = false; }
                        }

                        const cmd = text.toLowerCase();
                        const args = text.split(' ').slice(1);
                        const q = args.join(' ');

                        if (isGroup && botData.antiStatusGroups?.[from] && !isAdmin) {
                            if (msg.message?.forwardingScore > 0) {
                                try { this.sock.sendMessage(from, { delete: msg.key }); return; } catch (e) {}
                            }
                        }

                        if (isGroup && botData.antilinkGroups?.[from] && !isAdmin) {
                            const linkPatterns = [/chat.whatsapp.com\//i, /http:\/\//i, /https:\/\//i, /www\./i, /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i];
                            if (linkPatterns.some(p => p.test(text))) {
                                try {
                                    const mode = botData.antilinkGroups[from];
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (mode === 'kick') await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                } catch (e) {}
                                return;
                            }
                        }

                        if (!this.isPublic && !isOwner) return;

                        const matchedPrefix = PREFIXES.find(p => cmd.startsWith(p));
                        if (matchedPrefix) {
                            const commandName = cmd.slice(matchedPrefix.length).split(' ')[0];
                            this.reactRandom(msg).catch(() => {});

                            (async () => {
                                try {
                                    switch (commandName) {
                                        case 'menu':
                                        case 'start': {
                                            try {
                                                const lightning = LIGHTNING_EMOJIS[Math.floor(Math.random() * LIGHTNING_EMOJIS.length)];
                                                this.sock.sendMessage(from, { react: { text: lightning, key: msg.key } }).catch(() => {});

                                                const customName = (botData.userNames && botData.userNames[this.userId]) || msg.pushName || 'User';
                                                let menuText;
                                                try { menuText = buildBeautifulMenuSync(this, botData || {}, customName); }
                                                catch (buildErr) {
                                                    menuText = `⚠️ Menu build failed.\n\n${buildErr.message}`;
                                                }

                                                // ═══ SEND MENU WITH LOGO — one message, no waiting ═══
                                                const logoBuffer = await ensureLogo(5);

                                                if (logoBuffer && logoBuffer.length > 0) {
                                                    try {
                                                        await this.sock.sendMessage(from, {
                                                            image: logoBuffer,
                                                            caption: menuText,
                                                            mimetype: 'image/png'
                                                        }, { quoted: msg });
                                                        this.sendLog('📋 Menu sent (logo + text) ✅', 'success');
                                                    } catch (imgErr) {
                                                        try {
                                                            await this.sock.sendMessage(from, {
                                                                image: { url: LOGO_URL },
                                                                caption: menuText,
                                                                mimetype: 'image/png'
                                                            }, { quoted: msg });
                                                        } catch (urlErr) {
                                                            await this.sock.sendMessage(from, { text: menuText }, { quoted: msg });
                                                        }
                                                    }
                                                } else {
                                                    try {
                                                        await this.sock.sendMessage(from, {
                                                            image: { url: LOGO_URL },
                                                            caption: menuText,
                                                            mimetype: 'image/png'
                                                        }, { quoted: msg });
                                                    } catch (urlErr) {
                                                        await this.sock.sendMessage(from, { text: menuText }, { quoted: msg });
                                                    }
                                                }
                                            } catch (e) {
                                                this.sendLog('Menu error: ' + e.message, 'error');
                                            }
                                            break;
                                        }
                                        case 'read': await commands.read(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'ghost': {
                                            const mode = (args[0] || '').toLowerCase();
                                            if (mode === 'on') {
                                                this.readReceipts = false;
                                                if (!botData.readSettings[this.userId]) botData.readSettings[this.userId] = {};
                                                botData.readSettings[this.userId].enabled = false;
                                                saveBotData();
                                                try { await this.sock.sendPresenceUpdate('available'); } catch (e) {}
                                                await this.sock.sendMessage(from, { text: '👻 *Ghost Mode:* ON' }, { quoted: msg });
                                            } else if (mode === 'off') {
                                                this.readReceipts = true;
                                                if (!botData.readSettings[this.userId]) botData.readSettings[this.userId] = {};
                                                botData.readSettings[this.userId].enabled = true;
                                                saveBotData();
                                                try { await this.sock.sendPresenceUpdate('available'); } catch (e) {}
                                                await this.sock.sendMessage(from, { text: '👻 *Ghost Mode:* OFF' }, { quoted: msg });
                                            } else {
                                                await this.sock.sendMessage(from, { text: `👻 *Ghost Mode:* ${this.readReceipts === false ? 'ON' : 'OFF'}` }, { quoted: msg });
                                            }
                                            break;
                                        }
                                        case 'song': await commands.song(this.sock, from, msg, q); break;
                                        case 'video': await commands.video(this.sock, from, msg, q); break;
                                        case 'tiktok': await commands.tiktok(this.sock, from, msg, q); break;
                                        case 'insta': case 'ig': await commands.insta(this.sock, from, msg, q); break;
                                        case 'facebook': case 'fb': await commands.facebook(this.sock, from, msg, q); break;
                                        case 'gdrive': await commands.gdrive(this.sock, from, msg, q); break;
                                        case 'mf': await commands.mf(this.sock, from, msg, q); break;
                                        case 'apk': await commands.apk(this.sock, from, msg); break;
                                        case 'dp': await commands.dp(this.sock, from, msg); break;
                                        case 'vv': await commands.vv(this.sock, from, msg); break;
                                        case 'ai': await commands.ai(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'image': case 'img': case 'imagine': await commands.image(this.sock, from, msg); break;
                                        case 'tts': await commands.tts(this.sock, from, msg, q); break;
                                        case 'translate': case 'trt': await commands.translate(this.sock, from, msg); break;
                                        case 'character': await commands.character(this.sock, from, msg); break;
                                        case 'emojimix': await commands.emojimix(this.sock, from, msg); break;
                                        case 'joke': await commands.joke(this.sock, from, msg); break;
                                        case 'meme': await commands.meme(this.sock, from, msg); break;
                                        case 'weather': case 'w': await commands.weather(this.sock, from, msg); break;
                                        case 'qr': await commands.qr(this.sock, from, msg); break;
                                        case 'shorten': case 'short': await commands.shorten(this.sock, from, msg); break;
                                        case 'calc': case 'math': await commands.calc(this.sock, from, msg); break;
                                        case 'ping': await commands.ping(this.sock, from, msg); break;
                                        case 'owner': await commands.owner(this.sock, from, msg); break;
                                        case 'antilink': await commands.antilink(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'anticall': await commands.anticall(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'antidelete': await commands.antidelete(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'status': case 'autostatus': await commands.autostatus(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'autoreacts': await commands.autoreacts(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'kick': await commands.kick(this.sock, from, msg, isAdmin); break;
                                        case 'private': await commands.private(this.sock, from, msg, isAdmin, this); if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {}; botData.statusSettings[this.userId].isPublic = false; saveBotData(); break;
                                        case 'public': await commands.public(this.sock, from, msg, isAdmin, this); if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {}; botData.statusSettings[this.userId].isPublic = true; saveBotData(); break;
                                        case 'hidetag': await commands.hidetag(this.sock, from, msg, isAdmin, q); break;
                                        case 'tagall': await commands.tagall(this.sock, from, msg, isAdmin, q); break;
                                        case 'setname': await commands.setname(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, q); break;
                                        case 'groupinfo': await commands.groupinfo(this.sock, from, msg); break;
                                        case 'kickoffline': await commands.kickoffline(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'antistatus': await commands.antistatus(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'accept': await commands.accept(this.sock, from, msg, isAdmin); break;
                                        case 'hack': await commands.hack(this.sock, from, msg); break;
                                        case 'autoread': {
                                            if (autoreadCommand) await autoreadCommand(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args);
                                            else await commands.autoread(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args);
                                            break;
                                        }
                                        case 'online': await commands.online(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'websites': case 'sites': case 'blackn1te-websites': await commands.blackn1teWebsites(this.sock, from, msg); break;
                                        case 'trihat': case 'tools': case 'incisive-trihat-tools': await commands.incisiveTrihatTools(this.sock, from, msg); break;
                                        case 'settings': await commands.settings(this.sock, from, msg, isAdmin, this, args); break;
                                    }
                                } catch (e) { this.sendLog(`Command error (${commandName}): ${e.message}`, 'error'); }
                            })();
                        }
                    } catch (e) { console.error('Message processing error:', e); }
                }));
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    this.isConnected = false;
                    this.isInitializing = false;
                    if (!this.disconnectedSince) this.disconnectedSince = Date.now();
                    if (!this.isPairing) this.sendLog(`⚠️ Link dropped (code ${statusCode}). Auto-restoring...`, 'warning');
                    this.sendConnectionStatus(true);

                    const reconnectDelay =
                        statusCode === DisconnectReason.loggedOut ? 4000 :
                        statusCode === DisconnectReason.restartRequired ? 300 :
                        statusCode === DisconnectReason.connectionLost ? 800 : 1500;

                    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
                    this._reconnectTimer = setTimeout(() => {
                        this._reconnectTimer = null;
                        this.forceReconnect(reconnectDelay);
                    }, 300);

                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.everConnected = true;
                    this.isInitializing = false;
                    this.isPairing = false;
                    this.reconnectAttempts = 0;
                    this.disconnectedSince = null;

                    if (this._reconnectTimer) {
                        clearTimeout(this._reconnectTimer);
                        this._reconnectTimer = null;
                    }

                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    const botNumClean = botNumber.split('@')[0].split(':')[0];
                    this.botJidCache = botNumber;

                    const persistedRead = botData.readSettings?.[this.userId]?.enabled;
                    if (persistedRead !== undefined) this.readReceipts = persistedRead;

                    const persisted = sessionStates[this.userId];
                    if (persisted && typeof persisted.isRunning === 'boolean') this.isRunning = persisted.isRunning;

                    if (!this._linkedLoggedOnce) {
                        this._linkedLoggedOnce = true;
                        this.sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
                        this.sendLog('🎉 SESSION LINKED — LIFETIME CONNECTION ACTIVE', 'success');
                        this.sendLog(`👤 Bot: ${this.userId}`, 'success');
                        this.sendLog(`📱 Number: +${botNumClean}`, 'success');
                        this.sendLog(`♾️ Lifetime Mode: ENABLED`, 'success');
                        this.sendLog(`🚀 Speed: PROMAX UNLIMITED`, 'success');
                        this.sendLog(`🎯 Session state: ${this.isRunning ? 'ONLINE' : 'PAUSED'}`, 'info');
                        this.sendLog(`🖼️ Logo cached: ${LOGO_BUFFER ? 'YES' : 'NO'}`, 'info');
                        this.sendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
                    } else {
                        this.sendLog('♾️ Connection restored (silent)', 'info');
                    }

                    this.sendConnectionStatus(true);
                    this.startActiveCheck();
                    this.startKeepAlive();
                    this.startWatchdog();
                    this.startHeartbeat();

                    setTimeout(async () => {
                        try {
                            await this.sock.query({
                                tag: 'iq',
                                attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
                                content: [{ tag: 'status', attrs: {}, content: Buffer.from("I'M USING BEST BOT BL@CKN1TE-NXS V16 ULTRA", 'utf-8') }]
                            });
                        } catch (e) {}
                    }, 2000);

                    if (this.isRunning && (!this.lastConnectMessageTime || (Date.now() - this.lastConnectMessageTime > 60 * 60 * 1000))) {
                        this.sock.sendMessage(botNumber, {
                            text: "♾️ 𝗕𝗟@𝗖𝗞𝗡𝟭𝗧𝗘-𝗡𝗫𝗦 𝗩𝟭𝟲 𝗨𝗟𝗧𝗥𝗔 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗 ✅\n\nPrefixes: .  /  >\n\nType .menu to unleash commands."
                        }).catch(() => {});
                        this.lastConnectMessageTime = Date.now();
                    }
                }
            });

        } catch (err) {
            this.isInitializing = false;
            this.isPairing = false;
            this.sendLog(`Init hiccup: ${err.message}. Auto-retrying...`, 'error');
            setTimeout(() => this.forceReconnect(4000), 4000);
        }
    }
}

// ═══════════════ SOCKET.IO ═══════════════
io.on('connection', (socket) => {
    socket.emit('total-active', {
        count: Object.values(sessions).filter(s => s.isRunning).length,
        online: Object.values(sessions).filter(s => s.isConnected).length,
        sessions: Object.keys(sessions).length
    });

    socket.on('set-user', (userId) => {
        userSockets[userId] = socket.id;
        if (!sessions[userId]) sessions[userId] = new BotSession(userId);
        const s = sessions[userId];
        const persisted = sessionStates[userId];
        if (persisted && typeof persisted.isRunning === 'boolean') {
            if (!s.everConnected && !s.isRunning && persisted.isRunning) s.isRunning = true;
        }
        socket.emit('connection-status', {
            connected: s.isConnected,
            running: s.isRunning,
            user: userId,
            restored: true
        });
        socket.emit('sessions-list', Object.keys(sessions).map(uid => ({
            userId: uid,
            connected: sessions[uid].isConnected,
            running: sessions[uid].isRunning
        })));
    });

    socket.on('get-all-sessions', () => {
        socket.emit('sessions-list', Object.keys(sessions).map(uid => ({
            userId: uid,
            connected: sessions[uid].isConnected,
            running: sessions[uid].isRunning,
            paused: sessions[uid].isConnected && !sessions[uid].isRunning
        })));
    });

    socket.on('pair-request', async ({ userId, number }) => {
        try {
            if (isNumberBlacklisted(number)) {
                socket.emit('blacklist-block', { type: 'number', message: `🚫 *ACCESS DENIED*\n\nYour number is blacklisted.` });
                return;
            }
            if (isBotNameBlacklisted(userId)) {
                socket.emit('blacklist-block', { type: 'botname', message: `🚫 *ACCESS DENIED*\n\nBot name "${userId}" is blacklisted.` });
                return;
            }
            if (!sessions[userId]) sessions[userId] = new BotSession(userId);
            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: false };
                saveBotData();
            }
            sessions[userId].isPairing = true;
            await sessions[userId].initialize(number);
        } catch (e) { console.error('[PAIR-REQUEST]', e); }
    });

    socket.on('start-session', async (payload) => {
        try {
            const userId = (typeof payload === 'string') ? payload : (payload && payload.userId);
            const botName = (payload && payload.botName) || settings.botName || 'BL@CKN1TE-NXS';
            if (!userId) return;

            if (!sessions[userId]) sessions[userId] = new BotSession(userId);
            const s = sessions[userId];

            if (!s.sock || !s.sock.user) {
                s.sendLog('⏳ Waiting for socket to be ready...', 'info');
                const startWait = Date.now();
                while ((!s.sock || !s.sock.user) && (Date.now() - startWait < 20000)) {
                    await delay(250);
                    if (!s.isInitializing && (!s.sock || !s.sock.user)) {
                        try { await s.initialize(); } catch (e) {}
                    }
                }
            }

            if (!s.sock || !s.sock.user) {
                s.sendLog('❌ Socket not ready — try again in a moment.', 'error');
                return;
            }

            s.isRunning = true;
            s.isPaused = false;
            s._pausedNoticeShown = false;
            s.everConnected = true;
            s.persistState();

            if (!s.botJidCache) s.botJidCache = jidNormalizedUser(s.sock.user.id);
            s.sock.sendPresenceUpdate('available').catch(() => {});

            // ═══ SEND BANNER WITH LOGO — one message ═══
            const banner = buildCyberpunkBannerSync(s, botName);
            const logoBuffer = await ensureLogo(5);

            if (logoBuffer && logoBuffer.length > 0) {
                s.sock.sendMessage(s.botJidCache, {
                    image: logoBuffer,
                    caption: banner,
                    mimetype: 'image/png'
                })
                    .then(() => s.sendLog('🎩🔥⚡️ CYBERPUNK BANNER DELIVERED ✅', 'success'))
                    .catch(async () => {
                        try {
                            await s.sock.sendMessage(s.botJidCache, { image: { url: LOGO_URL }, caption: banner, mimetype: 'image/png' });
                        } catch (e2) {
                            await s.sock.sendMessage(s.botJidCache, { text: banner });
                        }
                    });
            } else {
                try {
                    await s.sock.sendMessage(s.botJidCache, { image: { url: LOGO_URL }, caption: banner, mimetype: 'image/png' });
                } catch (e2) {
                    await s.sock.sendMessage(s.botJidCache, { text: banner });
                }
            }

            s.sendConnectionStatus(true);
            socket.emit('session-status', { user: userId, running: true, connected: true });

            io.emit('console', {
                timestamp: new Date().toLocaleTimeString(),
                message: `🟢 START — ${userId} ONLINE · PROMAX SPEED`,
                type: 'success',
                user: userId
            });

            io.emit('sessions-list', Object.keys(sessions).map(uid => ({
                userId: uid,
                connected: sessions[uid].isConnected,
                running: sessions[uid].isRunning
            })));

        } catch (e) {
            console.error('[START-SESSION]', e);
            socket.emit('console', { timestamp: new Date().toLocaleTimeString(), message: `❌ start-session error: ${e.message}`, type: 'error', user: 'system' });
        }
    });

    socket.on('stop-session', async (payload) => {
        try {
            const userId = (typeof payload === 'string') ? payload : (payload && payload.userId);
            if (!userId) return;
            if (!sessions[userId]) return;
            const s = sessions[userId];

            s.isRunning = false;
            s.isPaused = true;
            s._pausedNoticeShown = false;
            s.persistState();

            try { await s.sock.sendPresenceUpdate('unavailable'); } catch (e) {}

            s.sendConnectionStatus(true);
            socket.emit('session-status', { user: userId, running: false, connected: s.isConnected });

            io.emit('console', {
                timestamp: new Date().toLocaleTimeString(),
                message: `🔴 STOP — ${userId} paused (device still linked)`,
                type: 'warning',
                user: userId
            });

            io.emit('sessions-list', Object.keys(sessions).map(uid => ({
                userId: uid,
                connected: sessions[uid].isConnected,
                running: sessions[uid].isRunning
            })));

        } catch (e) { console.error('[STOP-SESSION]', e); }
    });

    socket.on('bot-settings-update', async ({ userId, settings: newSettings }) => {
        try {
            if (!userId || !newSettings) return;
            if (!botData.statusSettings[userId]) botData.statusSettings[userId] = {};
            botData.statusSettings[userId].isPublic = !!newSettings.publicMode;
            botData.statusSettings[userId].autoReact = !!newSettings.autoReact;
            if (!botData.readSettings[userId]) botData.readSettings[userId] = {};
            botData.readSettings[userId].enabled = !newSettings.ghostMode;
            if (sessions[userId]) {
                sessions[userId].readReceipts = !newSettings.ghostMode;
                sessions[userId].autoReact = !!newSettings.autoReact;
                sessions[userId].aiEnabled = !!newSettings.aiEnabled;
                sessions[userId].isPublic = !!newSettings.publicMode;
            }
            saveBotData();
            console.log(`[${userId}] Settings updated:`, newSettings);
        } catch (e) { console.error('[BOT-SETTINGS]', e); }
    });

    socket.on('logout', async (userId) => {
        try {
            if (sessions[userId]) {
                sessions[userId].isRunning = false;
                sessions[userId].persistState();
                if (sessions[userId].sock) { try { await sessions[userId].sock.logout(); } catch (e) {} }
                if (sessions[userId].activeInterval) clearInterval(sessions[userId].activeInterval);
                if (sessions[userId].keepAliveInterval) clearInterval(sessions[userId].keepAliveInterval);
                if (sessions[userId].watchdogInterval) clearInterval(sessions[userId].watchdogInterval);
                if (sessions[userId].heartbeatInterval) clearInterval(sessions[userId].heartbeatInterval);
                const authPath = path.join(AUTH_DIR, userId);
                if (fs.existsSync(authPath)) fs.removeSync(authPath);
                delete sessions[userId];
                if (sessionStates[userId]) { delete sessionStates[userId]; saveSessionStates(); }
                io.emit('total-active', { count: 0, online: 0, sessions: Object.keys(sessions).length });
                const socketId = userSockets[userId];
                if (socketId) io.to(socketId).emit('connection-status', { connected: false, running: false, user: userId });
                delete userSockets[userId];
            }
        } catch (e) {}
    });

    socket.on('terminate-session', async (userId) => {
        try {
            if (sessions[userId]) {
                if (sessions[userId].sock) { try { await sessions[userId].sock.logout(); } catch (e) {} }
                if (sessions[userId].activeInterval) clearInterval(sessions[userId].activeInterval);
                if (sessions[userId].keepAliveInterval) clearInterval(sessions[userId].keepAliveInterval);
                if (sessions[userId].watchdogInterval) clearInterval(sessions[userId].watchdogInterval);
                if (sessions[userId].heartbeatInterval) clearInterval(sessions[userId].heartbeatInterval);
                const authPath = path.join(AUTH_DIR, userId);
                if (fs.existsSync(authPath)) fs.removeSync(authPath);
                delete sessions[userId];
                if (sessionStates[userId]) { delete sessionStates[userId]; saveSessionStates(); }
                const socketId = userSockets[userId];
                if (socketId) {
                    io.to(socketId).emit('connection-status', { connected: false, running: false, user: userId });
                    delete userSockets[userId];
                }
                io.emit('total-active', {
                    count: Object.values(sessions).filter(s => s.isRunning).length,
                    online: Object.values(sessions).filter(s => s.isConnected).length,
                    sessions: Object.keys(sessions).length
                });
                io.emit('console', { timestamp: new Date().toLocaleTimeString(), message: `🚨 Session terminated: ${userId}`, type: 'warning', user: userId });
            }
        } catch (e) {}
    });

    socket.on('terminate-all-sessions', async () => {
        try {
            for (const userId of Object.keys(sessions)) {
                try {
                    if (sessions[userId].sock) { try { await sessions[userId].sock.logout(); } catch (e) {} }
                    if (sessions[userId].activeInterval) clearInterval(sessions[userId].activeInterval);
                    if (sessions[userId].keepAliveInterval) clearInterval(sessions[userId].keepAliveInterval);
                    if (sessions[userId].watchdogInterval) clearInterval(sessions[userId].watchdogInterval);
                    if (sessions[userId].heartbeatInterval) clearInterval(sessions[userId].heartbeatInterval);
                    const authPath = path.join(AUTH_DIR, userId);
                    if (fs.existsSync(authPath)) fs.removeSync(authPath);
                    delete sessions[userId]; delete userSockets[userId];
                    if (sessionStates[userId]) delete sessionStates[userId];
                } catch (e) {}
            }
            saveSessionStates();
            io.emit('total-active', { count: 0, online: 0, sessions: 0 });
            io.emit('console', { timestamp: new Date().toLocaleTimeString(), message: `🚨 ALL sessions terminated`, type: 'warning', user: 'system' });
        } catch (e) {}
    });

    socket.on('disconnect', () => {
        for (const userId in userSockets) {
            if (userSockets[userId] === socket.id) { delete userSockets[userId]; break; }
        }
    });
});

// ═══════════════ OWNER ENDPOINTS ═══════════════
app.post('/api/terminate', async (req, res) => {
    try {
        const { userId, secret } = req.body || {};
        if (secret !== OWNER_SECRET) return res.status(403).json({ success: false, error: 'Invalid secret' });
        if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
        if (sessions[userId]) {
            if (sessions[userId].sock) { try { await sessions[userId].sock.logout(); } catch (e) {} }
            if (sessions[userId].activeInterval) clearInterval(sessions[userId].activeInterval);
            if (sessions[userId].keepAliveInterval) clearInterval(sessions[userId].keepAliveInterval);
            if (sessions[userId].watchdogInterval) clearInterval(sessions[userId].watchdogInterval);
            if (sessions[userId].heartbeatInterval) clearInterval(sessions[userId].heartbeatInterval);
            const authPath = path.join(AUTH_DIR, userId);
            if (fs.existsSync(authPath)) fs.removeSync(authPath);
            delete sessions[userId];
            if (sessionStates[userId]) { delete sessionStates[userId]; saveSessionStates(); }
            const socketId = userSockets[userId];
            if (socketId) { io.to(socketId).emit('connection-status', { connected: false, running: false, user: userId }); delete userSockets[userId]; }
            io.emit('total-active', {
                count: Object.values(sessions).filter(s => s.isRunning).length,
                online: Object.values(sessions).filter(s => s.isConnected).length,
                sessions: Object.keys(sessions).length
            });
            return res.json({ success: true, userId });
        }
        const authPath = path.join(AUTH_DIR, userId);
        if (fs.existsSync(authPath)) { fs.removeSync(authPath); return res.json({ success: true, userId, note: 'Orphan removed' }); }
        return res.json({ success: false, error: 'Session not found' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/blacklist', (req, res) => {
    const { secret } = req.query;
    if (secret !== OWNER_SECRET) return res.status(403).json({ error: 'Invalid secret' });
    res.json({ success: true, numbers: blacklist.numbers, botNames: blacklist.botNames });
});

app.post('/api/blacklist/add', async (req, res) => {
    try {
        const { secret, type, value } = req.body || {};
        if (secret !== OWNER_SECRET) return res.status(403).json({ error: 'Invalid secret' });
        if (!type || !value) return res.status(400).json({ error: 'type and value required' });
        const clean = String(value).trim();
        let added = false;
        if (type === 'number') {
            const num = clean.replace(/\D/g, '');
            if (!blacklist.numbers.includes(num)) { blacklist.numbers.push(num); added = true; }
        } else if (type === 'botname') {
            if (!blacklist.botNames.map(n => n.toLowerCase()).includes(clean.toLowerCase())) {
                blacklist.botNames.push(clean); added = true;
            }
        } else return res.status(400).json({ error: 'type must be number or botname' });
        saveBlacklist();
        res.json({ success: true, added, numbers: blacklist.numbers, botNames: blacklist.botNames });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/blacklist/clear', (req, res) => {
    try {
        const { secret } = req.body || {};
        if (secret !== OWNER_SECRET) return res.status(403).json({ error: 'Invalid secret' });
        blacklist.numbers = []; blacklist.botNames = [];
        saveBlacklist();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════ AUTO-LOAD SESSIONS ═══════════════
async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    if (isBotNameBlacklisted(userId)) { console.log(`🚫 [BLACKLIST] Skipping ${userId}`); continue; }
                    console.log(`[System] Auto-loading: ${userId}`);
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(err => {
                            console.error(`Failed ${userId}:`, err.message);
                            setTimeout(() => sessions[userId]?.forceReconnect(4000), 4000);
                        });
                    }
                }
            }
        }
    } catch (err) { console.error('[System] Load error:', err.message); }
}

// ═══════════════ SUPERVISOR ═══════════════
function startInfiniteSupervisor() {
    setInterval(async () => {
        try {
            const authDirs = await fs.readdir(AUTH_DIR);
            for (const userId of authDirs) {
                const authPath = path.join(AUTH_DIR, userId);
                const stats = await fs.stat(authPath);
                if (stats.isDirectory() && fs.existsSync(path.join(authPath, 'creds.json'))) {
                    if (isBotNameBlacklisted(userId)) continue;
                    if (!sessions[userId]) {
                        console.log(`♾️ [Supervisor] Reviving: ${userId}`);
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(() => {});
                    } else if (!sessions[userId].isConnected && !sessions[userId].isInitializing && !sessions[userId]._reconnectTimer && !sessions[userId].isPairing) {
                        console.log(`♾️ [Supervisor] Re-linking: ${userId}`);
                        sessions[userId].forceReconnect(1200).catch(() => {});
                    }
                }
            }
        } catch (e) {}
    }, AUTO_RELOAD_INTERVAL_MS);

    setInterval(() => {
        const activeCount = Object.values(sessions).filter(s => s.isRunning).length;
        const onlineCount = Object.values(sessions).filter(s => s.isConnected).length;
        console.log(`🚀 [PROMAX] Sessions: ${Object.keys(sessions).length} | Running: ${activeCount} | Online: ${onlineCount} | Uptime: ${formatUptime(Math.floor(process.uptime()))}`);
    }, 30 * 60 * 1000);
}

// ═══════════════ START ═══════════════
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`\n╔═══════════════════════════════════════════════╗`);
    console.log(`║  BL@CKN1TE-NXS-ULTRA · SERVER V16              ║`);
    console.log(`║  The Incisive Tri-Hat Hacker                   ║`);
    console.log(`╚═══════════════════════════════════════════════╝`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🌐 Panel: http://localhost:${PORT}`);
    console.log(`🔐 Login: /login.html`);
    console.log(`🎛️ Dashboard: /index.html`);
    console.log(`🤖 Bot: ${settings.botName} · ${settings.botVersion || 'V16-ULTRA'}`);
    console.log(`🔣 Prefixes: ${PREFIXES.join('  ')}`);
    console.log(`♾️ INFINITE MODE: ENABLED`);
    console.log(`🔒 LIFETIME CONNECTION: ENABLED`);
    console.log(`🎯 PER-SESSION START/STOP: ENABLED`);
    console.log(`💾 STATE PERSISTENCE: data/session_states.json`);
    console.log(`🤖 AI: ${openai ? `READY (${process.env.AI_MODEL || 'llama-3.1-8b-instant'})` : 'OFFLINE (no key)'}`);
    console.log(`🖼️ Loading logo into RAM...`);

    await ensureLogo(10);
    if (LOGO_BUFFER) console.log(`✅ Logo cached (${LOGO_BUFFER.length} bytes) · /logo.png`);
    else console.log(`⚠️ Logo will be fetched on demand`);

    measurePing().catch(() => {});

    loadExistingSessions();
    startInfiniteSupervisor();

    const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    setInterval(async () => {
        try { await axios.get(APP_URL + '/health', { timeout: 5000 }); } catch (e) {}
    }, 4 * 60 * 1000);

    setInterval(() => { preloadLogo().catch(() => {}); }, 30 * 60 * 1000);

    console.log(`\n✅ Ready. Open http://localhost:${PORT}\n`);
});

// ═══════════════ GLOBAL ERROR HANDLERS ═══════════════
process.on('uncaughtException', (err) => { console.error('♾️ [Uncaught]', err.message); });
process.on('unhandledRejection', (err) => { console.error('♾️ [Unhandled]', err?.message || err); });
process.on('SIGTERM', () => { console.log('♾️ [SIGTERM] Ignored — staying online'); });
process.on('SIGINT', () => { console.log('♾️ [SIGINT] Ignored — staying online'); });
process.on('warning', (w) => { console.warn('♾️ [Warning]', w.message); });
