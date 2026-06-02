/* ============================================================
   nav.js — Initialisation de l'app et navigation entre screens
   ============================================================ */

/* ── Initialisation post-login ───────────────────────────── */
function initApp() {
  const { user, role } = SESSION;

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

  // Préchargement des données (front-office.js + back-office.js)
  loadSatellites();
  loadCommunications();
  loadMissions();
  loadAlertes();
  buildBoStatut();
  buildBoFenetre();
  buildBoMission();
  buildBoDesorbiter();

  // Démarrer sur le Globe
  showScreen('globe', $('tab-globe'));
  initGlobe();
}

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
  if (btnEl) btnEl.classList.add('active');
}
