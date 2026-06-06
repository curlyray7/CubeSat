/* ============================================================
   auth.js — Authentification applicative (Option B)
   Gestion de session, login, logout
   ============================================================ */

/* Comptes applicatifs — NE PAS versionner avec de vrais mots de passe */
const USERS = {
  analyste_data: { password: 'Test1234!', role: 'analyste'    },
  operateur_sat:  { password: 'Test1234!', role: 'operateur'   },
  resp_mission:   { password: 'Test1234!', role: 'responsable' },
  admin_nano:     { password: 'Test1234!', role: 'admin'       },
};

/* Permissions back-office par rôle */
const BO_PERMS = {
  analyste:    [],
  operateur:   ['bo-statut', 'bo-fenetre'],
  responsable: ['bo-mission'],
  admin:       ['bo-statut', 'bo-fenetre', 'bo-mission', 'bo-desorbiter'],
};

const ROLE_LABELS = {
  analyste:    'Analyste',
  operateur:   'Opérateur',
  responsable: 'Responsable',
  admin:       'Admin',
};

const ROLE_CLASS = {
  analyste:    'role-analyste',
  operateur:   'role-operateur',
  responsable: 'role-responsable',
  admin:       'role-admin',
};

/* Session en mémoire (pas de localStorage pour rester simple) */
let SESSION = { user: null, role: null };

/* ── Connexion ───────────────────────────────────────────── */
function handleLogin() {
  const username = $('login-user').value.trim();
  const password = $('login-pass').value;
  const errEl    = $('login-error');

  errEl.classList.add('hidden');

  if (!USERS[username] || USERS[username].password !== password) {
    const span = document.getElementById('login-error-text');
    if (span) span.textContent = 'Identifiant ou mot de passe incorrect.';
    errEl.classList.remove('hidden');
    // Redéclencher l'animation shake
    errEl.style.animation = 'none';
    errEl.offsetHeight; // reflow
    errEl.style.animation = '';
    return;
  }

  SESSION = { user: username, role: USERS[username].role };
  // Arrêter la scène Three.js du login pour libérer le GPU
  if (window.loginScene) window.loginScene.stop();
  hideEl('login-page');
  showEl('app-page');
  initApp();
}

/* ── Déconnexion ─────────────────────────────────────────── */
function handleLogout() {
  destroyGlobe();           // globe.js
  removeTheme();            // nav.js — retire la classe de thème
  SESSION = { user: null, role: null };
  hideEl('app-page');
  showEl('login-page');
  $('login-pass').value = '';
  $('login-error').classList.add('hidden');
}

/* ── Touche Entrée sur le formulaire de login ────────────── */
document.addEventListener('DOMContentLoaded', () => {
  ['login-user', 'login-pass'].forEach(id => {
    $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });
});
