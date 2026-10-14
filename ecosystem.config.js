// ═══════════════════════════════════════════════════════════════════
//  BL@CKN1TE-NXS-ULTRA · PM2 Ecosystem Config
//  The Incisive Tri-Hat Hacker
// ═══════════════════════════════════════════════════════════════════
//
//  Usage:
//    pm2 start ecosystem.config.js
//    pm2 start ecosystem.config.js --env production
//    pm2 start ecosystem.config.js --env development
//
//    pm2 status
//    pm2 logs blacknite-ultra
//    pm2 restart blacknite-ultra
//    pm2 stop blacknite-ultra
//    pm2 delete blacknite-ultra
//    pm2 save         (persist across reboots)
//    pm2 startup      (auto-start on boot)
//
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    apps: [
        {
            // ══════════ IDENTITY ══════════
            name: 'blacknite-ultra',
            script: './server.js',
            cwd: __dirname,

            // ══════════ EXECUTION MODE ══════════
            // 'fork'    → single instance (recommended for Baileys/WhatsApp)
            // 'cluster' → multi-core (NOT recommended — WhatsApp session conflict)
            exec_mode: 'fork',
            instances: 1,

            // ══════════ AUTO-RESTART ══════════
            watch: false,               // Never watch — file changes cause WhatsApp reconnect
            ignore_watch: [
                'node_modules',
                'auth_info',
                'data',
                'logs',
                '.git',
                '*.log',
                '*.json'
            ],

            // ══════════ RESPAWN BEHAVIOUR ══════════
            autorestart: true,
            max_restarts: 50,           // Max restarts within 60s window before giving up
            min_uptime: '10s',          // App must stay up 10s to be considered "started"
            restart_delay: 3000,        // Wait 3s between restarts
            max_memory_restart: '1G',   // Restart if RAM exceeds 1GB (Baileys can leak)

            // ══════════ CRASH RECOVERY ══════════
            kill_timeout: 5000,         // Grace period before force-kill on stop
            wait_ready: false,          // Don't wait for process.send('ready')
            listen_timeout: 10000,      // Wait 10s for the app to bind to port

            // ══════════ ENVIRONMENT ══════════
            // Loads .env automatically (server.js calls require('dotenv').config())
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },

            // Environment overrides for --env production
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },

            // Environment overrides for --env development
            env_development: {
                NODE_ENV: 'development',
                PORT: 3000
            },

            // ══════════ LOGGING ══════════
            // Combined stdout + stderr in one file
            output: './logs/pm2-out.log',
            error: './logs/pm2-error.log',

            // Split logs per app (helpful when running multiple bots)
            merge_logs: false,

            // Log format: 'raw' | 'json' — raw is human-readable
            log_type: 'raw',

            // Timestamp prefix on every log line
            time: true,

            // Rotate logs when they exceed 10MB, keep 7 days
            max_size: '10M',
            retain: 7,

            // Enable log rotation (requires pm2-logrotate module)
            // Install: pm2 install pm2-logrotate
            // Then configure:
            //   pm2 set pm2-logrotate:max_size 10M
            //   pm2 set pm2-logrotate:retain 7
            //   pm2 set pm2-logrotate:compress true
            //   pm2 set pm2-logrotate:workerInterval 30

            // ══════════ SOURCE MAPS / STACK TRACES ══════════
            source_map_support: true,
            instance_var: 'INSTANCE_ID',

            // ══════════ NODE OPTIONS ══════════
            node_args: [
                '--max-old-space-size=1024',   // 1GB heap limit
                '--no-warnings'                // Suppress Node deprecation warnings
            ],

            // ══════════ ENV FILE (PM2 v5+) ══════════
            // Optional: auto-load a specific env file instead of .env
            // env_file: './.env'
        }
    ]
};
