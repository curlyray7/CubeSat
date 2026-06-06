/* ============================================================
   front-office.js — Écrans de consultation (FO-01 à FO-04)
   Lecture seule depuis les vues Phase 3
   ============================================================ */

/* ── Helpers d'affichage ─────────────────────────────────── */
function formatBadge(fmt) {
  if (!fmt) return '—';
  const map = { '1U': 'badge-1u', '3U': 'badge-3u', '6U': 'badge-6u', '12U': 'badge-12u' };
  const key = fmt.replace(/[^0-9U]/g, '');
  return `<span class="badge-format ${map[key] || 'badge-1u'}">${fmt}</span>`;
}

function statusBadge(statut) {
  if (!statut) return '—';
  if (statut.includes('Opérationnel')) return `<span class="badge-status badge-op">Opérationnel</span>`;
  if (statut.includes('veille'))       return `<span class="badge-status badge-veille">En veille</span>`;
  return `<span class="badge-status badge-des">${statut}</span>`;
}

/* ── FO-01 : Satellites opérationnels ────────────────────── */
async function loadSatellites() {
  try {
    const { data = [] } = await fetch('/api/satellites').then(r => r.json());
    const tb    = $('tb-satellites');
    const chips = $('chips-satellites');
    tb.innerHTML = chips.innerHTML = '';

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">Aucun satellite opérationnel</td></tr>`;
      return;
    }

    // Chips par format
    const formats = {};
    data.forEach(s => { const f = s.format_cubesat || '?'; formats[f] = (formats[f] || 0) + 1; });
    chips.innerHTML = `<div class="chip chip-green"><span class="chip-value">${data.length}</span> satellites</div>`
      + Object.entries(formats).map(([f, n]) => `<div class="chip chip-blue"><span class="chip-value">${n}</span> ${f}</div>`).join('');

    data.forEach(s => {
      const tr = el('tr');
      tr.innerHTML = `
        <td><code style="color:var(--atmo-300);font-size:0.85rem">${s.ref_satellite || '—'}</code></td>
        <td><strong>${s.nom_satellite || '—'}</strong></td>
        <td>${formatBadge(s.format_cubesat || '—')}</td>
        <td>${s.date_lancement || '—'}</td>
        <td style="color:var(--text-muted)">${s.type_orbite || '—'}</td>
        <td class="num">${s.altitude != null ? Number(s.altitude).toLocaleString('fr-FR') : '—'}</td>
        <td class="num">${s.capacite_batterie != null ? Number(s.capacite_batterie).toFixed(1) : '—'}</td>
        <td>${statusBadge(s.statut || 'Opérationnel')}</td>`;
      tb.appendChild(tr);
    });
  } catch (e) {
    $('tb-satellites').innerHTML = `<tr><td colspan="8" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

/* ── FO-02 : Bilan des communications ────────────────────── */
// Colonnes réelles de VUE_BILAN_COMMUNICATIONS :
//   fk_id_satellite, nb_fenetres_realisees, volume_total_mo,
//   volume_moyen_mo, date_derniere_communication, nb_stations_contactees
async function loadCommunications() {
  try {
    const { data = [] } = await fetch('/api/communications').then(r => r.json());
    const tb = $('tb-communications');
    tb.innerHTML = '';

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">Aucune donnée</td></tr>`;
      return;
    }

    const maxVol = Math.max(...data.map(r => parseFloat(r.volume_total_mo) || 0));

    data.forEach(row => {
      const tr    = el('tr');
      const vol   = parseFloat(row.volume_total_mo) || 0;
      const isTop = vol === maxVol && maxVol > 0;
      if (isTop) tr.classList.add('top-active');

      const sat      = row.nom_satellite || row.fk_id_satellite || '—';
      const nbFen    = row.nb_fenetres_realisees ?? 0;
      const volTot   = row.volume_total_mo   != null ? Number(row.volume_total_mo).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—';
      const volMoy   = row.volume_moyen_mo   != null ? Number(row.volume_moyen_mo).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—';
      const derComm  = row.date_derniere_communication ? String(row.date_derniere_communication).slice(0, 16).replace('T', ' ') : '—';
      const nbSta    = row.nb_stations_contactees ?? '—';

      tr.innerHTML = `
        <td><strong>${sat}</strong>${isTop ? ' <span style="color:var(--atmo-400);font-size:0.75rem"><i class="fa-solid fa-star"></i> Top</span>' : ''}</td>
        <td class="num">${nbFen}</td>
        <td class="num">${volTot}</td>
        <td class="num">${volMoy}</td>
        <td>${derComm}</td>
        <td class="num">${nbSta}</td>`;
      tb.appendChild(tr);
    });
  } catch (e) {
    $('tb-communications').innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

/* ── FO-03 : Tableau de bord missions ────────────────────── */
async function loadMissions() {
  try {
    const { data = [] } = await fetch('/api/missions').then(r => r.json());
    const tb    = $('tb-missions');
    const chips = $('chips-missions');
    tb.innerHTML = chips.innerHTML = '';

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px">Aucune mission active</td></tr>`;
      return;
    }

    // Colonnes réelles : nb_satellites_participants, nb_satellites_operationnels
    const sousDotees = data.filter(m =>
      (parseInt(m.nb_satellites_operationnels) || 0) < (parseInt(m.nb_satellites_participants) || 0)
    ).length;
    chips.innerHTML = `<div class="chip chip-blue"><span class="chip-value">${data.length}</span> missions actives</div>`
      + (sousDotees > 0 ? `<div class="chip chip-red"><span class="chip-value">${sousDotees}</span> sous-dotée(s)</div>` : '');

    data.forEach(m => {
      const tr     = el('tr');
      const nb_op  = parseInt(m.nb_satellites_operationnels) || 0;
      const nb_par = parseInt(m.nb_satellites_participants)  || 0;
      if (nb_op < nb_par) tr.classList.add('mission-understaffed');
      tr.innerHTML = `
        <td><code style="color:var(--atmo-300);font-size:0.85rem">${m.id_mission || '—'}</code></td>
        <td><strong>${m.nom_mission || '—'}</strong></td>
        <td>${m.zone_geo_cible || m.zone_geographique || '—'}</td>
        <td>${m.date_debut || '—'}</td>
        <td class="num">${nb_par}</td>
        <td class="num">${nb_op}</td>
        <td>${nb_op < nb_par
          ? '<span style="color:#f87171;font-size:0.8rem;font-weight:600">⚠ Sous-dotée</span>'
          : '<span style="color:var(--green-sat);font-size:0.8rem">✓ OK</span>'}</td>`;
      tb.appendChild(tr);
    });
  } catch (e) {
    $('tb-missions').innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}

/* ── FO-04 : Alertes instruments ─────────────────────────── */
async function loadAlertes() {
  try {
    const { data = [] } = await fetch('/api/alertes').then(r => r.json());
    const tb = $('tb-alertes');
    tb.innerHTML = '';

    const critiques = data.filter(a => (a.priorite || '').toUpperCase() === 'CRITIQUE').length;
    const counter   = $('alert-counter');
    if (critiques > 0) { counter.classList.remove('hidden'); $('alert-count').textContent = critiques; }
    else                 counter.classList.add('hidden');

    if (!data.length) {
      tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--green-sat);padding:32px"><i class="fa-solid fa-circle-check"></i> Aucune alerte — tous les instruments nominaux</td></tr>`;
      return;
    }

    data.forEach(a => {
      const tr   = el('tr');
      const prio = (a.priorite || '').toUpperCase();
      tr.innerHTML = `
        <td>${prio === 'CRITIQUE'
          ? '<span class="badge-critique"><i class="fa-solid fa-circle"></i> CRITIQUE</span>'
          : '<span class="badge-surveillance"><i class="fa-solid fa-circle"></i> SURVEILLANCE</span>'}</td>
        <td><strong>${a.ref_instrument || a.nom_instrument || '—'}</strong></td>
        <td>${a.type_instrument || '—'}</td>
        <td style="color:${prio === 'CRITIQUE' ? '#f87171' : 'var(--amber-sat)'}">${a.etat_fonctionnement || '—'}</td>
        <td>${a.nom_satellite || a.id_satellite || '—'}</td>`;
      tb.appendChild(tr);
    });
  } catch (e) {
    $('tb-alertes').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#f87171;padding:24px">Erreur : ${e.message}</td></tr>`;
  }
}
