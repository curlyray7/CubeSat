/* ============================================================
   globe.js — Globe.gl interactif
   Terre 3D · Stations au sol · Satellites en orbite · Fly-to
   ============================================================ */

/* ── Données chargées depuis la BDD ───────────────────────── */
// Initialisées vides, peuplées par loadGlobeData() avant initGlobe()
let SAT_ORBITS    = {};
let STATIONS_DATA = [];

// Phase distribuée automatiquement pour éviter les superpositions
function assignPhases(orbits) {
  const refs = Object.keys(orbits);
  refs.forEach((ref, i) => { orbits[ref].phase = (i / refs.length) * 360; });
  return orbits;
}

async function loadGlobeData() {
  try {
    const json = await fetch('/api/globe-data').then(r => r.json());
    if (json.status !== 'success') return;

    // Satellites → SAT_ORBITS
    const orbits = {};
    json.satellites.forEach(s => {
      orbits[s.ref_satellite] = {
        inc:    parseFloat(s.inclinaison)      || 0,
        alt:    parseFloat(s.altitude)         || 550,
        period: parseFloat(s.periode_orbitale) || 95,
        phase:  0,   // sera réparti par assignPhases
        color:  s.statut === 'Opérationnel' ? '#38bdf8' : '#94a3b8',
        nom:    s.nom_satellite,
        statut: s.statut,
      };
    });
    SAT_ORBITS = assignPhases(orbits);

    // Stations → STATIONS_DATA
    STATIONS_DATA = json.stations.map(st => ({
      id:     st.code_station,
      name:   st.nom_station,
      lat:    parseFloat(st.latitude),
      lng:    parseFloat(st.longitude),
      statut: st.statut,          // 'active' ou 'maintenance'
      bande:  st.bande_frequence,
      debit:  parseFloat(st.debit_max),
    }));
  } catch (e) {
    console.warn('loadGlobeData failed, globe will be empty:', e);
  }
}

/* ── État interne ─────────────────────────────────────────── */
let globeInstance = null;
let satAnimFrame  = null;
let globeReady    = false;

/* ── Mécanique orbitale simplifiée ───────────────────────── */
/**
 * Retourne la position {lat, lng, alt} d'un satellite à l'instant tMs.
 * Formule : orbite circulaire inclinée.
 */
function satPosition(orbit, tMs) {
  const T   = orbit.period * 60 * 1000;
  const ang = ((tMs / T) * 360 + orbit.phase) % 360;
  const a   = ang * Math.PI / 180;
  const inc = orbit.inc * Math.PI / 180;
  return {
    lat: Math.asin(Math.sin(inc) * Math.sin(a)) * 180 / Math.PI,
    lng: Math.atan2(Math.cos(inc) * Math.sin(a), Math.cos(a)) * 180 / Math.PI,
    alt: orbit.alt / 6371,   // fraction du rayon terrestre
  };
}

/* ── Initialisation ───────────────────────────────────────── */
function initGlobe() {
  if (globeInstance) return;
  requestAnimationFrame(() => {
    const container = $('globe-container');
    if (!container || container.clientWidth === 0) {
      setTimeout(initGlobe, 100);
      return;
    }
    _buildGlobe(container);
  });
}

function _buildGlobe(container) {
  globeInstance = Globe({ animateIn: true, rendererConfig: { antialias: true, alpha: false } })(container)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.18)
    .pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0)
    .width(container.clientWidth)
    .height(container.clientHeight);

  // Anneaux de pulsation sur les stations actives
  globeInstance
    .ringsData(STATIONS_DATA.filter(s => s.statut === 'active'))
    .ringLat('lat').ringLng('lng')
    .ringMaxRadius(4).ringPropagationSpeed(1.2).ringRepeatPeriod(1500)
    .ringColor(() => t => `rgba(34,197,94,${(1 - t) * 0.8})`);

  // Labels des stations (noms + tooltip)
  globeInstance
    .labelsData(STATIONS_DATA)
    .labelLat('lat').labelLng('lng')
    .labelAltitude(0.012)
    .labelText('name')
    .labelSize(1.2)
    .labelDotRadius(0.6)
    .labelColor(d => d.statut === 'active' ? '#22c55e' : '#f59e0b')
    .labelResolution(3)
    .labelLabel(d => `
      <div style="background:rgba(6,13,26,0.92);border:1px solid rgba(56,189,248,0.35);
        border-radius:8px;padding:8px 12px;font-family:Inter,sans-serif;font-size:12px;color:#f8fafc">
        <strong>${d.name}</strong><br>
        <span style="color:#94a3b8">${d.bande} · ${d.debit} Mbps</span><br>
        <span style="color:${d.statut === 'active' ? '#22c55e' : '#f59e0b'}">
          ${d.statut === 'active' ? '● Active' : '⚠ Maintenance'}
        </span>
      </div>`)
    .onLabelClick(s => showGlobePanelStation(s));

  // Satellites — éléments HTML animés
  globeInstance
    .htmlElementsData([])
    .htmlLat('lat').htmlLng('lng').htmlAltitude('alt')
    .htmlElement(d => {
      const wrapper = document.createElement('div');
      wrapper.className = 'sat-marker';
      wrapper.innerHTML = `
        <div class="sat-marker-icon" style="color:${d.color}">🛰️</div>
        <div class="sat-marker-label">${d.ref}</div>`;
      wrapper.style.cursor = 'pointer';
      wrapper.addEventListener('click', () => showGlobePanelSat(d));
      return wrapper;
    });

  // Arcs de communication
  _buildComLinks();

  // Compteurs stats
  $('gs-sats').textContent     = Object.keys(SAT_ORBITS).length;
  $('gs-stations').textContent = STATIONS_DATA.length;
  fetch('/api/missions').then(r => r.json())
    .then(j => { $('gs-missions').textContent = (j.data || []).length; })
    .catch(() => { $('gs-missions').textContent = '—'; });

  globeReady = true;
  _animateSatellites();
  _buildSidebar();

  // Ouvrir le panneau par défaut
  const sb = $('globe-sidebar');
  const ob = $('sidebar-open-btn');
  if (sb) sb.classList.add('open');
  if (ob) ob.style.display = 'none';

  // Resize responsive
  window.addEventListener('resize', () => {
    if (!globeInstance) return;
    const c = $('globe-container');
    if (c) globeInstance.width(c.clientWidth).height(c.clientHeight);
  });
}

/* ── Boucle d'animation (RAF) ─────────────────────────────── */
function _animateSatellites() {
  if (!globeInstance || !globeReady) return;
  const now  = Date.now();
  const sats = Object.entries(SAT_ORBITS).map(([ref, orbit]) => {
    const pos = satPosition(orbit, now);
    return { ref, lat: pos.lat, lng: pos.lng, alt: pos.alt, orbit, color: orbit.color };
  });
  globeInstance.htmlElementsData(sats);
  satAnimFrame = requestAnimationFrame(_animateSatellites);
}

function resumeGlobe() {
  if (globeReady && !satAnimFrame) _animateSatellites();
}

function pauseGlobe() {
  if (satAnimFrame) { cancelAnimationFrame(satAnimFrame); satAnimFrame = null; }
}

function destroyGlobe() {
  pauseGlobe();
  globeInstance = null;
  globeReady    = false;
  const c = $('globe-container');
  if (c) c.innerHTML = '';
}

/* ── Arcs de communication ────────────────────────────────── */
function _buildComLinks() {
  const t = Date.now();
  const links = [
    { startLat: 43.605, startLng:  1.444, ...satPosition(SAT_ORBITS['SAT-001'], t), sat: 'SAT-001' },
    { startLat: 67.856, startLng: 20.228, ...satPosition(SAT_ORBITS['SAT-002'], t), sat: 'SAT-002' },
  ].map(l => ({ ...l, endLat: l.lat, endLng: l.lng }));

  globeInstance
    .arcsData(links)
    .arcStartLat('startLat').arcStartLng('startLng')
    .arcEndLat('endLat').arcEndLng('endLng')
    .arcAltitudeAutoScale(0.3)
    .arcColor(() => ['rgba(56,189,248,0.0)', 'rgba(56,189,248,0.7)', 'rgba(56,189,248,0.0)'])
    .arcStroke(0.4).arcDashLength(0.4).arcDashGap(0.6).arcDashAnimateTime(3000);
}

/* ── Fly-to ───────────────────────────────────────────────── */
function flyTo(lat, lng, altitude = 0.8, duration = 1800) {
  if (!globeInstance) return;
  globeInstance.pointOfView({ lat, lng, altitude }, duration);
}

function flyToSat(ref) {
  const orbit = SAT_ORBITS[ref];
  if (!orbit) return;
  const pos = satPosition(orbit, Date.now());
  flyTo(pos.lat, pos.lng, 0.5);
  setTimeout(() => showGlobePanelSat({ ref, ...pos, orbit, color: orbit.color }), 1900);
}

function flyToStation(id) {
  const s = STATIONS_DATA.find(x => x.id === id);
  if (!s) return;
  flyTo(s.lat, s.lng, 0.4);
  setTimeout(() => showGlobePanelStation(s), 1900);
}

/* ── Panneau d'info ───────────────────────────────────────── */
function showGlobePanelSat(d) {
  const o      = d.orbit || SAT_ORBITS[d.ref];
  const statut = o?.statut || (d.color === '#94a3b8' ? 'En veille' : 'Opérationnel');
  $('globe-panel-content').innerHTML = `
    <div class="panel-type sat">Satellite</div>
    <div class="panel-name">🛰️ ${d.ref}</div>
    <div class="panel-rows">
      <div class="panel-row"><span class="lbl">Statut</span>   <span class="val" style="color:${d.color}">${statut}</span></div>
      <div class="panel-row"><span class="lbl">Altitude</span> <span class="val">${o.alt} km</span></div>
      <div class="panel-row"><span class="lbl">Inclinaison</span><span class="val">${o.inc}°</span></div>
      <div class="panel-row"><span class="lbl">Période</span>  <span class="val">${o.period} min</span></div>
      <div class="panel-row"><span class="lbl">Lat / Lng</span><span class="val">${d.lat.toFixed(2)}° / ${d.lng.toFixed(2)}°</span></div>
    </div>
    <div class="panel-divider"></div>
    <button class="panel-action" onclick="showScreen('fo-satellites', document.querySelectorAll('.nav-tab')[1]); closeGlobePanel()">
      → Voir tableau satellites
    </button>`;
  $('globe-panel').classList.remove('hidden');
}

function showGlobePanelStation(s) {
  $('globe-panel-content').innerHTML = `
    <div class="panel-type station">Station au sol</div>
    <div class="panel-name">📡 ${s.name}</div>
    <div class="panel-rows">
      <div class="panel-row"><span class="lbl">Code</span>     <span class="val">${s.id}</span></div>
      <div class="panel-row"><span class="lbl">Statut</span>   <span class="val" style="color:${s.statut === 'active' ? '#22c55e' : '#f59e0b'}">${s.statut === 'active' ? 'Active' : 'Maintenance'}</span></div>
      <div class="panel-row"><span class="lbl">Bande</span>    <span class="val">${s.bande}</span></div>
      <div class="panel-row"><span class="lbl">Débit max</span><span class="val">${s.debit} Mbps</span></div>
      <div class="panel-row"><span class="lbl">Position</span> <span class="val">${s.lat.toFixed(3)}° / ${s.lng.toFixed(3)}°</span></div>
    </div>
    <div class="panel-divider"></div>
    <button class="panel-action" onclick="showScreen('fo-communications', document.querySelectorAll('.nav-tab')[2]); closeGlobePanel()">
      → Voir bilan communications
    </button>`;
  $('globe-panel').classList.remove('hidden');
}

function closeGlobePanel() {
  $('globe-panel').classList.add('hidden');
}

/* ── Sidebar ──────────────────────────────────────────────── */
function _buildSidebar() {
  const body = $('globe-sidebar')?.querySelector('.sidebar-body');
  if (!body) return;

  const satItems = Object.entries(SAT_ORBITS).map(([ref, o]) => `
    <div class="sidebar-item" onclick="flyToSat('${ref}')">
      <span class="sidebar-dot" style="background:${o.color}"></span>
      <div class="sidebar-item-info">
        <span class="sidebar-item-name">${o.nom || ref}</span>
        <span class="sidebar-item-sub">${o.statut || 'Opérationnel'} · ${o.alt} km</span>
      </div>
      <span class="sidebar-item-arrow">→</span>
    </div>`).join('');

  const staItems = STATIONS_DATA.map(s => `
    <div class="sidebar-item" onclick="flyToStation('${s.id}')">
      <span class="sidebar-dot" style="background:${s.statut === 'active' ? '#22c55e' : '#f59e0b'}"></span>
      <div class="sidebar-item-info">
        <span class="sidebar-item-name">${s.name}</span>
        <span class="sidebar-item-sub">${s.statut === 'active' ? 'Active' : 'Maintenance'} · ${s.bande}</span>
      </div>
      <span class="sidebar-item-arrow">→</span>
    </div>`).join('');

  body.innerHTML = `
    <div class="sidebar-section-title">🛰️ Satellites</div>${satItems}
    <div class="sidebar-section-title" style="margin-top:10px">📡 Stations au sol</div>${staItems}`;
}

function toggleGlobeSidebar() {
  const sb = $('globe-sidebar');
  const ob = $('sidebar-open-btn');
  if (!sb) return;
  const isOpen = sb.classList.toggle('open');
  if (ob) ob.style.display = isOpen ? 'none' : 'flex';
}
