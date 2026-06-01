/* ============================================================
   NANOÖRBIT — Frontend Logic
   Auth · Front-office · Back-office
   ============================================================ */

// ── Comptes applicatifs (Option B — Niveau Découverte) ───────
const USERS = {
  'analyste_data': { password: 'Test1234!', role: 'analyste' },
  'operateur_sat':  { password: 'Test1234!', role: 'operateur' },
  'resp_mission':   { password: 'Test1234!', role: 'responsable' },
  'admin_nano':     { password: 'Test1234!', role: 'admin' },
};

// Permissions back-office par rôle
const BO_PERMS = {
  analyste:     [],
  operateur:    ['bo-statut', 'bo-fenetre'],
  responsable:  ['bo-mission'],
  admin:        ['bo-statut', 'bo-fenetre', 'bo-mission', 'bo-desorbiter'],
};

const ROLE_LABELS = {
  analyste:    'Analyste',
  operateur:   'Opérateur',
  responsable: 'Responsable',
  admin:       'Admin',
};

const ROLE_CLASS = {
  analyste:   'role-analyste',
  operateur:  'role-operateur',
  responsable:'role-responsable',
  admin:      'role-admin',
};

// Session en mémoire
let SESSION = { user: null, role: null };

// ── Helpers DOM ──────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

function showEl(id)  { $(id)?.classList.remove('hidden'); }
function hideEl(id)  { $(id)?.classList.add('hidden'); }

// ── LOGIN ────────────────────────────────────────────────────
function handleLogin() {
  const username = $('login-user').value.trim();
  const password = $('login-pass').value;
  const errEl    = $('login-error');

  errEl.classList.add('hidden');

  if (!USERS[username] || USERS[username].password !== password) {
    errEl.textContent = '⚠️ Identifiant ou mot de passe incorrect.';
    errEl.classList.remove('hidden');
    return;
  }

  SESSION = { user: username, role: USERS[username].role };
  hideEl('login-page');
  showEl('app-page');
  initApp();
}

// Enter key on login
document.addEventListener('DOMContentLoaded', () => {
  ['login-user','login-pass'].forEach(id => {
    $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });
});

function handleLogout() {
  SESSION = { user: null, role: null };
  hideEl('app-page');
  showEl('login-page');
  $('login-pass').value = '';
  $('login-error').classList.add('hidden');
}

// ── APP INIT ─────────────────────────────────────────────────
function initApp() {
  const { user, role } = SESSION;

  // User badge
  $('nav-username').textContent = user;
  const badge = $('nav-role-badge');
  badge.textContent  = ROLE_LABELS[role];
  badge.className    = `user-role ${ROLE_CLASS[role]}`;

  // Show back-office tabs based on role
  const perms = BO_PERMS[role] || [];
  ['bo-statut','bo-fenetre','bo-mission','bo-desorbiter'].forEach(tab => {
    const btn = $(`tab-${tab}`);
    if (btn) {
      perms.includes(tab) ? btn.classList.remove('hidden') : btn.classList.add('hidden');
    }
  });

  // Load front-office data
  loadSatellites();
  loadCommunications();
  loadMissions();
  loadAlertes();

  // Build back-office forms
  buildBoStatut();
  buildBoFenetre();
  buildBoMission();
  buildBoDesorbiter();

  // Show first tab
  showScreen('fo-satellites', document.querySelector('.nav-tab'));
}

// ── TAB NAVIGATION ───────────────────────────────────────────
function showScreen(name, btnEl) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  // Show target
  const screen = $(`screen-${name}`);
  if (screen) screen.classList.add('active');
  if (btnEl)  btnEl.classList.add('active');
}

// ── FORMAT BADGE ─────────────────────────────────────────────
function formatBadge(fmt) {
  if (!fmt) return fmt;
  const cls = { '1U':'badge-1u','3U':'badge-3u','6U':'badge-6u','12U':'badge-12u' };
  const key  = fmt.replace(/[^0-9U]/g,'');
  return `<span class="badge-format ${cls[key]||'badge-1u'}">${fmt}</span>`;
}

function statusBadge(statut) {
  if (!statut) return '—';
  if (statut.includes('Opérationnel'))  return `<span class="badge-status badge-op">Opérationnel</span>`;
  if (statut.includes('veille'))        return `<span class="badge-status badge-veille">En veille</span>`;
  return `<span class="badge-status badge-des">${statut}</span>`;
}

// ── FO-01 : SATELLITES ───────────────────────────────────────
async function loadSatellites() {
  try {
    const res  = await fetch('/api/satellites');
    const json = await res.json();
    const data = json.data || [];
    const tb    = $('tb-satellites');
    const chips = $('chips-satellites');

    tb.innerHTML = '';
    chips.innerHTML = '';

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">Aucun satellite opérationnel</td></tr>`;
      return;
    }

    // Chips stats par format
    const formats = {};
    data.forEach(s => {
      const fmt = s.format_cubesat || s.format || '?';
      formats[fmt] = (formats[fmt]||0) + 1;
    });
    chips.innerHTML = `<div class="chip chip-green"><span class="chip-value">${data.length}</span> satellites</div>`
      + Object.entries(formats).map(([f,n]) => `<div class="chip chip-blue"><span class="chip-value">${n}</span> ${f}</div>`).join('');

    data.forEach(s => {
      const tr = el('tr');
      const ref    = s.ref_satellite || '—';
      const nom    = s.nom_satellite || '—';
      const fmt    = s.format_cubesat || '—';
      const date   = s.date_lancement || '—';
      const orbite = s.type_orbite || '—';
      const alt    = s.altitude != null ? Number(s.altitude).toLocaleString('fr-FR') : '—';
      const bat    = s.capacite_batterie != null ? Number(s.capacite_batterie).toFixed(1) : '—';
      const statut = s.statut || 'Opérationnel';
      tr.innerHTML = `
        <td><code style="color:var(--atmo-300);font-size:0.85rem">${ref}</code></td>
        <td><strong>${nom}</strong></td>
        <td>${formatBadge(fmt)}</td>
        <td>${date}</td>
        <td><span style="color:var(--text-muted)">${orbite}</span></td>
        <td class="num">${alt}</td>
        <td class="num">${bat}</td>
        <td>${statusBadge(statut)}</td>`;
      tb.appendChild(tr);
    });
  } catch(e) {
    $('tb-satellites').innerHTML = `<tr><td colspan="8" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

// ── FO-02 : COMMUNICATIONS ───────────────────────────────────
async function loadCommunications() {
  try {
    const res  = await fetch('/api/communications');
    const json = await res.json();
    const data = json.data || [];
    const tb   = $('tb-communications');
    tb.innerHTML = '';

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">Aucune donnée de communication</td></tr>`;
      return;
    }

    // Find max volume for highlight
    const maxVol = Math.max(...data.map(r => parseFloat(r.volume_total)||0));

    data.forEach(row => {
      const tr = el('tr');
      const isTop = (parseFloat(row.volume_total)||0) === maxVol && maxVol > 0;
      if (isTop) tr.classList.add('top-active');

      const nom     = row.nom_satellite || '—';
      const nb_fen  = row.nb_fenetres ?? '0';
      const vol_tot = row.volume_total != null ? Number(row.volume_total).toLocaleString('fr-FR',{maximumFractionDigits:2}) : '—';
      const vol_moy = row.volume_moyen != null ? Number(row.volume_moyen).toLocaleString('fr-FR',{maximumFractionDigits:2}) : '—';
      const der_com = row.derniere_comm ? String(row.derniere_comm).slice(0,16).replace('T',' ') : '—';
      const nb_sta  = row.nb_stations ?? '—';

      tr.innerHTML = `
        <td><strong>${nom}</strong>${isTop ? ' <span style="color:var(--atmo-400);font-size:0.75rem">★ Top</span>' : ''}</td>
        <td class="num">${nb_fen}</td>
        <td class="num">${vol_tot}</td>
        <td class="num">${vol_moy}</td>
        <td>${der_com}</td>
        <td class="num">${nb_sta}</td>`;
      tb.appendChild(tr);
    });
  } catch(e) {
    $('tb-communications').innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

// ── FO-03 : MISSIONS ─────────────────────────────────────────
async function loadMissions() {
  try {
    const res  = await fetch('/api/missions');
    const json = await res.json();
    const data = json.data || [];
    const tb   = $('tb-missions');
    const chips = $('chips-missions');
    tb.innerHTML = '';
    chips.innerHTML = '';

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px">Aucune mission active</td></tr>`;
      return;
    }

    const sousDotees = data.filter(m => (parseInt(m.nb_operationnels)||0) < (parseInt(m.nb_participants)||0)).length;
    chips.innerHTML = `
      <div class="chip chip-blue"><span class="chip-value">${data.length}</span> missions actives</div>
      ${sousDotees > 0 ? `<div class="chip chip-red"><span class="chip-value">${sousDotees}</span> sous-dotée(s)</div>` : ''}`;

    data.forEach(m => {
      const tr = el('tr');
      const nb_op  = parseInt(m.nb_operationnels) || 0;
      const nb_par = parseInt(m.nb_participants)  || 0;
      const sousDotee = nb_op < nb_par;
      if (sousDotee) tr.classList.add('mission-understaffed');

      const etatHTML = sousDotee
        ? `<span style="color:#f87171;font-size:0.8rem;font-weight:600">⚠ Sous-dotée</span>`
        : `<span style="color:var(--green-sat);font-size:0.8rem">✓ OK</span>`;

      // zone_geo_cible est le vrai nom de colonne dans la BDD
      const zone = m.zone_geo_cible || m.zone_geographique || '—';

      tr.innerHTML = `
        <td><code style="color:var(--atmo-300);font-size:0.85rem">${m.id_mission||'—'}</code></td>
        <td><strong>${m.nom_mission||'—'}</strong></td>
        <td>${zone}</td>
        <td>${m.date_debut||'—'}</td>
        <td class="num">${nb_par}</td>
        <td class="num">${nb_op}</td>
        <td>${etatHTML}</td>`;
      tb.appendChild(tr);
    });
  } catch(e) {
    $('tb-missions').innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

// ── FO-04 : ALERTES ──────────────────────────────────────────
async function loadAlertes() {
  try {
    const res  = await fetch('/api/alertes');
    const json = await res.json();
    const data = json.data || [];
    const tb   = $('tb-alertes');
    tb.innerHTML = '';

    const critiques = data.filter(a => (a.priorite||'').toUpperCase() === 'CRITIQUE').length;
    const counter   = $('alert-counter');
    const countEl   = $('alert-count');

    if (critiques > 0) {
      counter.classList.remove('hidden');
      countEl.textContent = critiques;
    } else {
      counter.classList.add('hidden');
    }

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--green-sat);padding:32px">✅ Aucune alerte active — tous les instruments sont nominaux</td></tr>`;
      return;
    }

    data.forEach(a => {
      const tr = el('tr');
      const prio = (a.priorite || '').toUpperCase();
      const pBadge = prio === 'CRITIQUE'
        ? `<span class="badge-critique">🔴 CRITIQUE</span>`
        : `<span class="badge-surveillance">🟡 SURVEILLANCE</span>`;

      // Colonnes réelles : ref_instrument, type_instrument, etat_fonctionnement, nom_satellite
      const instrument = a.ref_instrument || a.nom_instrument || '—';
      const type       = a.type_instrument || '—';
      const etat       = a.etat_fonctionnement || '—';
      const satellite  = a.nom_satellite || '—';

      tr.innerHTML = `
        <td>${pBadge}</td>
        <td><strong>${instrument}</strong></td>
        <td>${type}</td>
        <td><span style="color:${prio==='CRITIQUE'?'#f87171':'var(--amber-sat)'}">${etat}</span></td>
        <td>${satellite}</td>`;
      tb.appendChild(tr);
    });
  } catch(e) {
    $('tb-alertes').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

// ── BACK-OFFICE HELPERS ──────────────────────────────────────
function accessDenied(containerId) {
  $(containerId).innerHTML = `
    <div class="access-denied">
      <div class="icon">🔒</div>
      <p>Accès refusé — votre profil (<strong>${SESSION.role}</strong>) n'est pas autorisé à effectuer cette action.</p>
    </div>`;
}

function canDo(perm) {
  return (BO_PERMS[SESSION.role]||[]).includes(perm);
}

// ── BO-01 : STATUT SATELLITE ─────────────────────────────────
function buildBoStatut() {
  const div = $('bo-statut-content');
  if (!canDo('bo-statut')) { accessDenied('bo-statut-content'); return; }

  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass">
        <div class="bo-card-title">✏️ Modifier le statut</div>
        <div class="bo-card-desc">Sélectionnez un satellite et son nouveau statut. La modification est immédiate en base.</div>
        <div class="form-group">
          <label>Satellite</label>
          <select id="bo-sat-select"><option value="">Chargement…</option></select>
        </div>
        <div class="form-group">
          <label>Nouveau statut</label>
          <select id="bo-sat-statut">
            <option value="Opérationnel">Opérationnel</option>
            <option value="En veille">En veille</option>
            <option value="Désorbité">Désorbité</option>
          </select>
        </div>
        <button class="btn-action btn-blue" onclick="submitStatut()">Mettre à jour</button>
        <div class="msg" id="msg-statut"></div>
      </div>
    </div>`;
  loadSatListInto('bo-sat-select');
}

async function loadSatListInto(selectId) {
  try {
    const res  = await fetch('/api/satellites/all');
    const json = await res.json();
    const sel  = $(selectId);
    if (!sel) return;
    // PK réelle : ref_satellite (ex: 'SAT-001')
    sel.innerHTML = (json.data||[]).map(s =>
      `<option value="${s.ref_satellite}">${s.nom_satellite} (${s.statut||'—'})</option>`
    ).join('');
  } catch {}
}

async function submitStatut() {
  const ref    = $('bo-sat-select')?.value;   // ref_satellite ex: 'SAT-001'
  const statut = $('bo-sat-statut')?.value;
  const msg    = $('msg-statut');
  if (!ref) return;
  try {
    const res  = await fetch(`/api/satellites/${ref}/statut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, role: SESSION.role }),
    });
    const json = await res.json();
    json.status === 'success'
      ? showMsg(msg, 'success', `✅ Statut mis à jour : ${statut}`)
      : showMsg(msg, 'error', `❌ ${json.message}`);
    if (json.status === 'success') loadSatellites();
  } catch(e) {
    showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`);
  }
}

// ── BO-02 : FENÊTRE DE COMMUNICATION ────────────────────────
function buildBoFenetre() {
  const div = $('bo-fenetre-content');
  if (!canDo('bo-fenetre')) { accessDenied('bo-fenetre-content'); return; }

  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass">
        <div class="bo-card-title">📅 Planifier une fenêtre</div>
        <div class="bo-card-desc">La durée doit être entre 1 et 900 secondes. La station doit être active.</div>
        <div class="form-group">
          <label>Satellite opérationnel</label>
          <select id="fen-sat"><option value="">Chargement…</option></select>
        </div>
        <div class="form-group">
          <label>Station au sol (active)</label>
          <select id="fen-station"><option value="">Chargement…</option></select>
        </div>
        <div class="form-group">
          <label>Date / heure de début</label>
          <input type="datetime-local" id="fen-debut">
        </div>
        <div class="form-group">
          <label>Durée (secondes, 1–900)</label>
          <input type="number" id="fen-duree" min="1" max="900" placeholder="ex : 300">
        </div>
        <div class="form-group">
          <label>Élévation maximale (°) <span style="color:var(--text-dim)">obligatoire</span></label>
          <input type="number" id="fen-elev" min="0" max="90" step="0.1" placeholder="ex : 45">
        </div>
        <button class="btn-action btn-amber" onclick="submitFenetre()">Planifier</button>
        <div class="msg" id="msg-fenetre"></div>
      </div>
    </div>`;
  loadSatListInto('fen-sat');
  loadStationListInto('fen-station');
}

async function loadStationListInto(selectId) {
  try {
    const res  = await fetch('/api/stations');
    const json = await res.json();
    const sel  = $(selectId);
    if (!sel) return;
    // PK réelle : code_station (ex: 'GS-TLS-01')
    sel.innerHTML = (json.data||[]).map(st =>
      `<option value="${st.code_station}">${st.nom_station} (${st.bande_frequence||''})</option>`
    ).join('');
  } catch {}
}

async function submitFenetre() {
  const ref_sat      = $('fen-sat')?.value;
  const code_station = $('fen-station')?.value;
  const debut        = $('fen-debut')?.value;
  const duree        = $('fen-duree')?.value;
  const elev         = $('fen-elev')?.value;
  const msg          = $('msg-fenetre');

  if (!ref_sat || !code_station || !debut || !duree || !elev) {
    showMsg(msg, 'warn', '⚠️ Veuillez remplir tous les champs.');
    return;
  }
  if (parseInt(duree) < 1 || parseInt(duree) > 900) {
    showMsg(msg, 'error', '❌ La durée doit être entre 1 et 900 secondes.');
    return;
  }
  try {
    // Convertit datetime-local 'YYYY-MM-DDTHH:MM' → 'YYYY-MM-DD HH:MM:SS'
    const datetime_debut = debut.replace('T', ' ') + ':00';
    const res  = await fetch('/api/fenetres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_satellite:  ref_sat,
        code_station:   code_station,
        datetime_debut: datetime_debut,
        duree:          parseInt(duree),
        elevation_max:  parseFloat(elev),
        role:           SESSION.role,
      }),
    });
    const json = await res.json();
    json.status === 'success'
      ? showMsg(msg, 'success', '✅ Fenêtre planifiée avec succès.')
      : showMsg(msg, 'error', `❌ ${json.message}`);
  } catch(e) {
    showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`);
  }
}

// ── BO-03 : ASSIGNATION MISSION ──────────────────────────────
function buildBoMission() {
  const div = $('bo-mission-content');
  if (!canDo('bo-mission')) { accessDenied('bo-mission-content'); return; }

  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass">
        <div class="bo-card-title">🔗 Assigner à une mission</div>
        <div class="bo-card-desc">Choisissez un satellite opérationnel et une mission active. Les doublons sont refusés.</div>
        <div class="form-group">
          <label>Satellite opérationnel</label>
          <select id="mis-sat"><option value="">Chargement…</option></select>
        </div>
        <div class="form-group">
          <label>Mission active</label>
          <select id="mis-mission"><option value="">Chargement…</option></select>
        </div>
        <div class="form-group">
          <label>Rôle du satellite dans la mission</label>
          <input type="text" id="mis-role" placeholder="ex : Imagerie principale">
        </div>
        <button class="btn-action btn-green" onclick="submitMission()">Assigner</button>
        <div class="msg" id="msg-mission"></div>
      </div>
    </div>`;
  loadSatListInto('mis-sat');
  loadMissionListInto('mis-mission');
}

async function loadMissionListInto(selectId) {
  try {
    const res  = await fetch('/api/missions/actives');
    const json = await res.json();
    const sel  = $(selectId);
    if (!sel) return;
    // PK : id_mission (char(12) ex: 'MSN-AMA-2023')
    sel.innerHTML = (json.data||[]).map(m =>
      `<option value="${m.id_mission}">${m.nom_mission}</option>`
    ).join('');
  } catch {}
}

async function submitMission() {
  const ref_sat    = $('mis-sat')?.value;      // ref_satellite
  const id_mission = $('mis-mission')?.value;  // id_mission
  const role_sat   = $('mis-role')?.value;
  const msg        = $('msg-mission');

  if (!ref_sat || !id_mission) {
    showMsg(msg, 'warn', '⚠️ Veuillez sélectionner un satellite et une mission.');
    return;
  }
  if (!role_sat.trim()) {
    showMsg(msg, 'warn', '⚠️ Le rôle du satellite est obligatoire.');
    return;
  }
  try {
    const res  = await fetch('/api/participations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_satellite:  ref_sat,
        id_mission:     id_mission,
        role_satellite: role_sat,
        role:           SESSION.role,
      }),
    });
    const json = await res.json();
    json.status === 'success'
      ? showMsg(msg, 'success', '✅ Satellite assigné à la mission.')
      : showMsg(msg, 'error', `❌ ${json.message}`);
  } catch(e) {
    showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`);
  }
}

// ── BO-04 : DÉSORBITER ───────────────────────────────────────
function buildBoDesorbiter() {
  const div = $('bo-desorbiter-content');
  if (!canDo('bo-desorbiter')) { accessDenied('bo-desorbiter-content'); return; }

  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass" style="border-color:rgba(239,68,68,0.25)">
        <div class="bo-card-title" style="color:#f87171">💥 Désorbiter un satellite</div>
        <div class="bo-card-desc">
          <span style="color:#f87171;font-weight:600">Action destructive.</span>
          Le satellite passe à l'état "Désorbité". Les fenêtres de communication planifiées seront annulées.
          Une confirmation est demandée avant exécution.
        </div>
        <div class="form-group">
          <label>Satellite à désorbiter</label>
          <select id="des-sat"><option value="">Chargement…</option></select>
        </div>
        <button class="btn-action btn-red" onclick="confirmDesorbiter()">Désorbiter…</button>
        <div class="msg" id="msg-desorbiter"></div>
      </div>
    </div>`;
  loadSatListInto('des-sat');
}

function confirmDesorbiter() {
  const sel  = $('des-sat');
  const name = sel?.options[sel.selectedIndex]?.text || 'ce satellite';
  openModal(
    '⚠️ Confirmation requise',
    `Vous êtes sur le point de désorbiter <strong>${name}</strong>. Cette action est irréversible et annulera toutes les fenêtres planifiées.`,
    executeDesorbiter
  );
}

async function executeDesorbiter() {
  const ref = $('des-sat')?.value;   // ref_satellite
  const msg = $('msg-desorbiter');
  closeModal();
  if (!ref) return;
  try {
    const res  = await fetch(`/api/satellites/${ref}/desorbiter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: SESSION.role }),
    });
    const json = await res.json();
    if (json.status === 'success') {
      const info = json.fenetres_annulees !== undefined ? ` (${json.fenetres_annulees} fenêtre(s) annulée(s))` : '';
      showMsg(msg, 'success', `✅ Satellite désorbité avec succès.${info}`);
      loadSatellites();
      loadSatListInto('des-sat');
    } else {
      showMsg(msg, 'error', `❌ ${json.message}`);
    }
  } catch(e) {
    showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`);
  }
}

// ── MODAL ────────────────────────────────────────────────────
function openModal(title, body, onConfirm) {
  $('modal-title').innerHTML = title;
  $('modal-body').innerHTML  = body;
  $('modal-confirm').onclick = onConfirm;
  $('confirm-modal').classList.remove('hidden');
}
function closeModal() {
  $('confirm-modal').classList.add('hidden');
}

// ── MSG HELPER ───────────────────────────────────────────────
function showMsg(el, type, text) {
  el.textContent = text;
  el.className   = `msg msg-${type} show`;
  setTimeout(() => { el.classList.remove('show'); }, 5000);
}
