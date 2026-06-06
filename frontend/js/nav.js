/* ============================================================
   nav.js — Initialisation de l'app et navigation entre screens
   ============================================================ */

/* ── Gestion du thème visuel par rôle ────────────────────── */
const ROLE_THEMES = {
  analyste:    'theme-analyste',
  operateur:   'theme-operateur',
  responsable: 'theme-responsable',
  admin:       'theme-admin',
};

function applyTheme(role) {
  // Supprimer tout thème précédent
  document.body.classList.remove(...Object.values(ROLE_THEMES));
  const theme = ROLE_THEMES[role];
  if (theme) document.body.classList.add(theme);
}

function removeTheme() {
  document.body.classList.remove(...Object.values(ROLE_THEMES));
}

/* ── Initialisation post-login ───────────────────────────── */
function initApp() {
  const { user, role } = SESSION;

  // Appliquer le thème du rôle
  applyTheme(role);

  // Badge utilisateur dans la navbar
  $('nav-username').textContent = user;
  const badge = $('nav-role-badge');
  badge.textContent = ROLE_LABELS[role];
  badge.className   = `user-role ${ROLE_CLASS[role]}`;

  // Afficher/masquer les onglets back-office selon le rôle
  const perms = BO_PERMS[role] || [];
  ['bo-statut', 'bo-fenetre', 'bo-mission', 'bo-desorbiter'].forEach(tab => {
    const btn = $(`tab-${tab}`);
    if (!btn) return;
    perms.includes(tab) ? btn.classList.remove('hidden') : btn.classList.add('hidden');
  });
  // Afficher le dropdown "Administration" si au moins une action est disponible
  const adminDropdown = $('nav-admin-dropdown');
  if (adminDropdown) {
    perms.length > 0
      ? adminDropdown.classList.remove('hidden')
      : adminDropdown.classList.add('hidden');
  }

  // Préchargement des données (front-office.js + back-office.js)
  loadSatellites();
  loadCommunications();
  loadMissions();
  loadAlertes();
  initFo5SatFilter().then(() => loadFenetres()); // FO-05
  buildBoStatut();
  buildBoFenetre();
  buildBoMission();
  buildBoDesorbiter();

  // Démarrer sur le Globe
  showScreen('globe', $('tab-globe'));
  // Charger les données BDD avant d'initialiser le globe
  loadGlobeData().then(() => initGlobe());
}

/* ── Dropdown Administration ─────────────────────────────── */
function toggleAdminMenu(e) {
  e.stopPropagation();
  $('nav-admin-dropdown').classList.toggle('open');
}

/** Sélection d'un écran BO depuis le dropdown */
function pickBoScreen(name, itemEl) {
  // Fermer le menu
  $('nav-admin-dropdown').classList.remove('open');
  // Marquer l'item actif
  document.querySelectorAll('.nav-dropdown-item').forEach(b => b.classList.remove('active'));
  itemEl.classList.add('active');
  // Marquer le bouton trigger comme actif
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  $('tab-bo-root').classList.add('active');
  // Naviguer
  showScreen(name, null);
}

// Fermer le menu si on clique ailleurs
document.addEventListener('click', () => {
  const dd = $('nav-admin-dropdown');
  if (dd) dd.classList.remove('open');
});

/* ── Navigation entre screens ────────────────────────────── */
function showScreen(name, btnEl) {
  const isGlobe     = (name === 'globe');
  const globeScreen = $('screen-globe');
  const dataContent = $('app-data-content');

  if (isGlobe) {
    globeScreen.classList.add('active');
    dataContent.style.display = 'none';
    resumeGlobe();   // globe.js — reprend l'animation RAF
  } else {
    pauseGlobe();    // globe.js — suspend l'animation RAF
    globeScreen.classList.remove('active');
    dataContent.style.display = 'block';
    dataContent.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $(`screen-${name}`);
    if (target) target.classList.add('active');

  }

  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-dropdown-item').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}
