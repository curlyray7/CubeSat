/* ============================================================
   back-office.js — Actions d'administration (BO-01 à BO-04)
   Droits vérifiés côté client + serveur
   ============================================================ */

/* ── Helpers ─────────────────────────────────────────────── */
function canDo(perm) {
  return (BO_PERMS[SESSION.role] || []).includes(perm);
}

function accessDenied(containerId) {
  $(containerId).innerHTML = `
    <div class="access-denied">
      <div class="icon">🔒</div>
      <p>Accès refusé — votre profil (<strong>${SESSION.role}</strong>) n'est pas autorisé pour cette action.</p>
    </div>`;
}

/* Charge la liste de tous les satellites dans un <select> */
async function loadSatListInto(selectId) {
  try {
    const { data = [] } = await fetch('/api/satellites/all').then(r => r.json());
    const sel = $(selectId);
    if (!sel) return;
    sel.innerHTML = data.map(s =>
      `<option value="${s.ref_satellite}">${s.nom_satellite} (${s.statut || '—'})</option>`
    ).join('');
  } catch {}
}

/* Charge les stations actives dans un <select> */
async function loadStationListInto(selectId) {
  try {
    const { data = [] } = await fetch('/api/stations').then(r => r.json());
    const sel = $(selectId);
    if (!sel) return;
    sel.innerHTML = data.map(st =>
      `<option value="${st.code_station}">${st.nom_station} (${st.bande_frequence || ''})</option>`
    ).join('');
  } catch {}
}

/* Charge les missions actives dans un <select> */
async function loadMissionListInto(selectId) {
  try {
    const { data = [] } = await fetch('/api/missions/actives').then(r => r.json());
    const sel = $(selectId);
    if (!sel) return;
    sel.innerHTML = data.map(m =>
      `<option value="${m.id_mission}">${m.nom_mission}</option>`
    ).join('');
  } catch {}
}

/* ── BO-01 : Modifier le statut d'un satellite ───────────── */
function buildBoStatut() {
  const div = $('bo-statut-content');
  if (!canDo('bo-statut')) { accessDenied('bo-statut-content'); return; }
  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass">
        <div class="bo-card-title">✏️ Modifier le statut</div>
        <div class="bo-card-desc">La modification est immédiate en base de données.</div>
        <div class="form-group">
          <label>Satellite</label>
          <select id="bo-sat-select"><option>Chargement…</option></select>
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

async function submitStatut() {
  const ref    = $('bo-sat-select')?.value;
  const statut = $('bo-sat-statut')?.value;
  const msg    = $('msg-statut');
  if (!ref) return;
  try {
    const json = await fetch(`/api/satellites/${ref}/statut`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, role: SESSION.role }),
    }).then(r => r.json());
    json.status === 'success'
      ? showMsg(msg, 'success', `✅ Statut mis à jour : ${statut}`)
      : showMsg(msg, 'error', `❌ ${json.message}`);
    if (json.status === 'success') loadSatellites();
  } catch (e) { showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`); }
}

/* ── BO-02 : Planifier une fenêtre de communication ─────── */
function buildBoFenetre() {
  const div = $('bo-fenetre-content');
  if (!canDo('bo-fenetre')) { accessDenied('bo-fenetre-content'); return; }
  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass">
        <div class="bo-card-title">📅 Planifier une fenêtre</div>
        <div class="bo-card-desc">Durée entre 1 et 900 secondes. La station doit être active.</div>
        <div class="form-group"><label>Satellite opérationnel</label><select id="fen-sat"><option>Chargement…</option></select></div>
        <div class="form-group"><label>Station au sol (active)</label><select id="fen-station"><option>Chargement…</option></select></div>
        <div class="form-group"><label>Date / heure de début</label><input type="datetime-local" id="fen-debut"></div>
        <div class="form-group"><label>Durée (s, 1–900)</label><input type="number" id="fen-duree" min="1" max="900" placeholder="ex : 300"></div>
        <div class="form-group"><label>Élévation max (°)</label><input type="number" id="fen-elev" min="0" max="90" step="0.1" placeholder="ex : 45"></div>
        <button class="btn-action btn-amber" onclick="submitFenetre()">Planifier</button>
        <div class="msg" id="msg-fenetre"></div>
      </div>
    </div>`;
  loadSatListInto('fen-sat');
  loadStationListInto('fen-station');
}

async function submitFenetre() {
  const ref_sat      = $('fen-sat')?.value;
  const code_station = $('fen-station')?.value;
  const debut        = $('fen-debut')?.value;
  const duree        = $('fen-duree')?.value;
  const elev         = $('fen-elev')?.value;
  const msg          = $('msg-fenetre');

  if (!ref_sat || !code_station || !debut || !duree || !elev) {
    showMsg(msg, 'warn', '⚠️ Veuillez remplir tous les champs.'); return;
  }
  if (parseInt(duree) < 1 || parseInt(duree) > 900) {
    showMsg(msg, 'error', '❌ Durée invalide (1–900 s).'); return;
  }
  try {
    const json = await fetch('/api/fenetres', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_satellite: ref_sat, code_station,
        datetime_debut: debut.replace('T', ' ') + ':00',
        duree: parseInt(duree), elevation_max: parseFloat(elev),
        role: SESSION.role,
      }),
    }).then(r => r.json());
    json.status === 'success'
      ? showMsg(msg, 'success', '✅ Fenêtre planifiée avec succès.')
      : showMsg(msg, 'error', `❌ ${json.message}`);
  } catch (e) { showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`); }
}

/* ── BO-03 : Assigner un satellite à une mission ─────────── */
function buildBoMission() {
  const div = $('bo-mission-content');
  if (!canDo('bo-mission')) { accessDenied('bo-mission-content'); return; }
  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass">
        <div class="bo-card-title">🔗 Assigner à une mission</div>
        <div class="bo-card-desc">Les doublons et missions terminées sont refusés.</div>
        <div class="form-group"><label>Satellite opérationnel</label><select id="mis-sat"><option>Chargement…</option></select></div>
        <div class="form-group"><label>Mission active</label><select id="mis-mission"><option>Chargement…</option></select></div>
        <div class="form-group"><label>Rôle du satellite</label><input type="text" id="mis-role" placeholder="ex : Imagerie principale"></div>
        <button class="btn-action btn-green" onclick="submitMission()">Assigner</button>
        <div class="msg" id="msg-mission"></div>
      </div>
    </div>`;
  loadSatListInto('mis-sat');
  loadMissionListInto('mis-mission');
}

async function submitMission() {
  const ref_sat    = $('mis-sat')?.value;
  const id_mission = $('mis-mission')?.value;
  const role_sat   = $('mis-role')?.value?.trim();
  const msg        = $('msg-mission');

  if (!ref_sat || !id_mission) { showMsg(msg, 'warn', '⚠️ Sélectionnez un satellite et une mission.'); return; }
  if (!role_sat)               { showMsg(msg, 'warn', '⚠️ Le rôle du satellite est obligatoire.');     return; }
  try {
    const json = await fetch('/api/participations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_satellite: ref_sat, id_mission, role_satellite: role_sat, role: SESSION.role }),
    }).then(r => r.json());
    json.status === 'success'
      ? showMsg(msg, 'success', '✅ Satellite assigné à la mission.')
      : showMsg(msg, 'error', `❌ ${json.message}`);
  } catch (e) { showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`); }
}

/* ── BO-04 : Désorbiter un satellite ─────────────────────── */
function buildBoDesorbiter() {
  const div = $('bo-desorbiter-content');
  if (!canDo('bo-desorbiter')) { accessDenied('bo-desorbiter-content'); return; }
  div.innerHTML = `
    <div class="bo-grid">
      <div class="bo-card glass" style="border-color:rgba(239,68,68,0.25)">
        <div class="bo-card-title" style="color:#f87171">💥 Désorbiter un satellite</div>
        <div class="bo-card-desc"><span style="color:#f87171;font-weight:600">Action destructive.</span>
          Les fenêtres planifiées seront annulées. Confirmation requise.</div>
        <div class="form-group"><label>Satellite à désorbiter</label><select id="des-sat"><option>Chargement…</option></select></div>
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
    `Désorbiter <strong>${name}</strong> ? Cette action est irréversible et annulera toutes les fenêtres planifiées.`,
    executeDesorbiter
  );
}

async function executeDesorbiter() {
  const ref = $('des-sat')?.value;
  const msg = $('msg-desorbiter');
  closeModal();
  if (!ref) return;
  try {
    const json = await fetch(`/api/satellites/${ref}/desorbiter`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: SESSION.role }),
    }).then(r => r.json());
    if (json.status === 'success') {
      const info = json.fenetres_annulees != null ? ` (${json.fenetres_annulees} fenêtre(s) annulée(s))` : '';
      showMsg(msg, 'success', `✅ Satellite désorbité.${info}`);
      loadSatellites();
      loadSatListInto('des-sat');
    } else {
      showMsg(msg, 'error', `❌ ${json.message}`);
    }
  } catch (e) { showMsg(msg, 'error', `❌ Erreur réseau : ${e.message}`); }
}

/* ── Modal de confirmation ───────────────────────────────── */
function openModal(title, body, onConfirm) {
  $('modal-title').innerHTML = title;
  $('modal-body').innerHTML  = body;
  $('modal-confirm').onclick = onConfirm;
  $('confirm-modal').classList.remove('hidden');
}

function closeModal() {
  $('confirm-modal').classList.add('hidden');
}
