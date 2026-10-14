/* ═══════════════════════════════════════════════════════════════════
   BL@CKN1TE-NXS-ULTRA · INLINE.JS
   Critical inline boot — auth guard + preloader reveal
   Load FIRST (before other scripts)
   ═══════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    try {
        const SESSION_KEY = 'nexusAuth';
        const SESSION_TTL = 30 * 60 * 1000;

        // Hide page until auth check completes
        document.documentElement.style.visibility = 'hidden';

        const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);

        if (!raw) {
            window.location.replace('/login.html');
            return;
        }

        const s = JSON.parse(raw);

        if (!s.timestamp || (Date.now() - s.timestamp > SESSION_TTL)) {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            window.location.replace('/login.html');
            return;
        }

        // Expose session for other scripts
        window.__nexusSession = s;

        // Reveal page once DOM is ready
        const reveal = () => {
            document.documentElement.style.visibility = 'visible';
            document.documentElement.style.transition = 'opacity 0.3s ease';
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(reveal, 30);
        } else {
            document.addEventListener('DOMContentLoaded', () => setTimeout(reveal, 30));
        }
    } catch (e) {
        window.location.replace('/login.html');
    }
})();
