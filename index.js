// ============================================================
// index.js
// BL@CKN1TE-NXS V16 — Entry Point
// Simply boots server.js (which contains the full bot logic)
// ============================================================

console.log('╔═══════════════════════════════════════════╗');
console.log('║  ░▒▓█  BL@CKN1TE-NXS  •  V16  █▓▒░        ║');
console.log('║  ⚡ Booting via index.js → server.js       ║');
console.log('╚═══════════════════════════════════════════╝');

// Load the real server
require('./server.js');

// Keep process alive (server.js already listens, this is belt-and-suspenders)
process.stdin.resume();

// ♾️ Never let the process die from stray signals
process.on('SIGINT', () => console.log('♾️ [index.js] SIGINT ignored — staying online'));
process.on('SIGTERM', () => console.log('♾️ [index.js] SIGTERM ignored — staying online'));
