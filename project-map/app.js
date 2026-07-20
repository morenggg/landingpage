/* ===========================================================================
   Projekt-Map – interaktive Repository-Visualisierung
   Eigenständiger Renderer (SVG + Vanilla JS, keine externen Bibliotheken).
   Daten: repository-data.js (erzeugt von generate-project-map.js)

   Aufbau dieser Datei (modular, von oben nach unten):
     1. PIN-Schutz (SHA-256, Sperrlogik)
     2. Konstanten & Datenindizes
     3. Kamera (weiches Zoomen/Pannen, Trägheit, Kameraflüge)
     4. View-Graph-Builder (Mindmap/Cluster, Deps, Ordner, Datenfluss, System)
     5. Rendering & Sichtbarkeits-Pipeline (Filter → Cluster → LOD → Culling)
     6. Interaktion (Pointer-Gesten, Suche, Detailpanel, Panels)
   =========================================================================== */

'use strict';

(function () {

// ===========================================================================
// 1. PIN-SCHUTZ
// ===========================================================================
// Der PIN wird NICHT im Klartext gespeichert, sondern nur als SHA-256-Hash
// verglichen. Neuen PIN setzen: Hash erzeugen und PIN_HASH ersetzen, z. B.
//   Terminal:        echo -n '1234' | sha256sum
//   Browser-Konsole: crypto.subtle.digest('SHA-256', new TextEncoder()
//                      .encode('1234')).then(b => console.log([...new Uint8Array(b)]
//                      .map(x => x.toString(16).padStart(2, '0')).join('')))
// Hinweis: Das ist ein Sichtschutz für eine statische Seite, kein echter
// Server-Login – die Daten liegen weiterhin im Repository.
const PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // "1234"

const PIN_LOCK = [
  { fails: 10, ms: 5 * 60 * 1000 },  // ab 10 Fehlversuchen: 5 Minuten
  { fails: 3, ms: 30 * 1000 },       // ab 3 Fehlversuchen: 30 Sekunden
];
const LS_FAILS = 'pm_pin_fails';
const LS_LOCK = 'pm_pin_lock_until';
const SS_OK = 'pm_pin_ok';

/** SHA-256 (hex). Nutzt crypto.subtle; Fallback für Kontexte ohne SubtleCrypto. */
async function sha256Hex(str) {
  if (window.crypto && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { /* Fallback unten */ }
  }
  return sha256Fallback(str);
}

/** Kompakte, reine JS-Implementierung von SHA-256 (nur ASCII-Eingaben). */
function sha256Fallback(ascii) {
  function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;
  let hash = sha256Fallback.h = sha256Fallback.h || [];
  const k = sha256Fallback.k = sha256Fallback.k || [];
  let primeCounter = k.length;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0, 8);
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
        (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] +
          (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

function initPinGate() {
  const gate = document.getElementById('pin-gate');
  const card = document.getElementById('pin-card');
  const form = document.getElementById('pin-form');
  const input = document.getElementById('pin-input');
  const submit = document.getElementById('pin-submit');
  const msg = document.getElementById('pin-msg');

  if (sessionStorage.getItem(SS_OK) === '1') { gate.classList.add('hidden'); return; }

  let lockTimer = null;

  function lockedUntil() { return +(localStorage.getItem(LS_LOCK) || 0); }
  function fails() { return +(localStorage.getItem(LS_FAILS) || 0); }

  function refreshLockUI() {
    const until = lockedUntil();
    const left = until - Date.now();
    if (left > 0) {
      input.disabled = submit.disabled = true;
      msg.classList.remove('info');
      msg.textContent = 'Gesperrt – bitte ' + Math.ceil(left / 1000) + ' s warten.';
      if (!lockTimer) lockTimer = setInterval(refreshLockUI, 500);
    } else {
      input.disabled = submit.disabled = false;
      if (lockTimer) { clearInterval(lockTimer); lockTimer = null; msg.textContent = ''; }
    }
  }
  refreshLockUI();

  function fail() {
    const f = fails() + 1;
    localStorage.setItem(LS_FAILS, String(f));
    for (const rule of PIN_LOCK) {
      if (f >= rule.fails) {
        localStorage.setItem(LS_LOCK, String(Date.now() + rule.ms));
        break;
      }
    }
    card.classList.remove('shake');
    void card.offsetWidth; // Animation neu starten
    card.classList.add('shake');
    msg.classList.remove('info');
    msg.textContent = 'Falscher PIN.';
    input.value = '';
    refreshLockUI();
  }

  function unlock() {
    localStorage.removeItem(LS_FAILS);
    localStorage.removeItem(LS_LOCK);
    sessionStorage.setItem(SS_OK, '1');
    gate.classList.add('leaving');
    document.getElementById('stage-wrap').classList.add('reveal');
    setTimeout(() => gate.classList.add('hidden'), 500);
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (lockedUntil() > Date.now()) { refreshLockUI(); return; }
    const pin = input.value.trim();
    if (!pin) return;
    submit.disabled = true;
    const h = await sha256Hex(pin);
    submit.disabled = false;
    if (h === PIN_HASH) unlock();
    else fail();
  });
  setTimeout(() => input.focus(), 300);
}

// ===========================================================================
// 2. KONSTANTEN & DATENINDIZES
// ===========================================================================

const D = window.REPO_DATA;
if (!D) {
  document.body.innerHTML = '<p style="padding:2rem;font-family:monospace">repository-data.js fehlt – bitte zuerst <b>node project-map/generate-project-map.js</b> ausführen.</p>';
  return;
}

const CAT_COLORS = {
  'Seite': '#e8734a',
  'Skript': '#f2c94c',
  'Skript (TS)': '#5aa9e6',
  'Komponente': '#5aa9e6',
  'View-Modul': '#9b8cff',
  'Daten-Modul': '#56c8a8',
  'Styles': '#e26ec9',
  'Asset: Bild': '#7fd17f',
  'Asset: Video': '#64d2c3',
  'Asset: Audio': '#ff9fbe',
  'Asset: Schrift': '#c9b48a',
  'Asset: Kalender': '#a8b0bd',
  'Konfiguration': '#a8b0bd',
  'Dokumentation': '#d7ccc0',
  'PWA': '#7ee0e6',
  'Deployment/SEO': '#8fd460',
  'Deployment': '#8fd460',
  'Externer Dienst': '#ff8f5e',
  'Datenbank': '#4fc3f7',
  'Authentifizierung': '#ffd166',
  'Abhängigkeiten': '#b0a4e3',
  'Platzhalter': '#6b7280',
  'Sonstiges': '#6b7280',
  'Gruppe': '#8a94a6',
};

const KIND_STYLE = {
  import:   { color: '#5aa9e6', label: 'importiert' },
  script:   { color: '#f2c94c', label: 'bindet Skript ein' },
  style:    { color: '#e26ec9', label: 'nutzt Styles' },
  asset:    { color: '#56c8a8', label: 'lädt Asset' },
  nav:      { color: '#9aa4b2', label: 'navigiert zu', dashed: true },
  api:      { color: '#ff8f5e', label: 'ruft API auf' },
  auth:     { color: '#ffd166', label: 'authentifiziert über' },
  'db-read':  { color: '#4fc3f7', label: 'liest Daten aus' },
  'db-write': { color: '#f0719b', label: 'schreibt Daten in' },
  sw:       { color: '#7ee0e6', label: 'registriert Service Worker' },
  config:   { color: '#a8b0bd', label: 'konfiguriert', dashed: true },
  deploy:   { color: '#8fd460', label: 'deployed über' },
  generates:{ color: '#b0a4e3', label: 'erzeugt' },
  tree:     { color: '#66707e', label: 'enthält' },
  flow:     { color: '#6ea8fe', label: 'Datenfluss' },
};

const EXT_BADGE = {
  html: 'HTML', css: 'CSS', js: 'JS', mjs: 'JS', ts: 'TS', tsx: 'TSX', jsx: 'JSX',
  json: 'JSON', md: 'MD', xml: 'XML', ics: 'ICS', txt: 'TXT', webmanifest: 'PWA',
  png: 'IMG', jpg: 'IMG', jpeg: 'IMG', gif: 'IMG', webp: 'IMG', ico: 'ICO', svg: 'SVG',
  mp4: 'VID', webm: 'VID', mp3: 'AUD', wav: 'AUD',
  woff: 'FONT', woff2: 'FONT', ttf: 'FONT', dienst: 'EXT', gitignore: 'CFG', ohne: '·',
};

function catColor(cat) { return CAT_COLORS[cat] || '#8a94a6'; }
function kindStyle(kind) { return KIND_STYLE[kind] || { color: '#8a94a6', label: kind }; }

const nodeById = new Map(D.nodes.map(n => [n.id, n]));
const outEdges = new Map();
const inEdges = new Map();
for (const e of D.edges) {
  if (!outEdges.has(e.source)) outEdges.set(e.source, []);
  if (!inEdges.has(e.target)) inEdges.set(e.target, []);
  outEdges.get(e.source).push(e);
  inEdges.get(e.target).push(e);
}
const degree = id => ((outEdges.get(id) || []).length + (inEdges.get(id) || []).length);
const HUB_MIN = 8;

// ---------------------------------------------------------------------------
// DOM-Referenzen & Helfer
// ---------------------------------------------------------------------------

const $ = s => document.querySelector(s);
const svg = $('#stage');
const viewportG = $('#viewport');
const layerHulls = $('#layer-hulls');
const layerEdges = $('#layer-edges');
const layerEdgeHits = $('#layer-edgehits');
const layerNodes = $('#layer-nodes');
const tooltip = $('#tooltip');
const minimap = $('#minimap');
const mmCtx = minimap.getContext('2d');

const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
  return el;
}

const measureCtx = document.createElement('canvas').getContext('2d');
measureCtx.font = '600 12px "Segoe UI", system-ui, sans-serif';
function textW(t) { return measureCtx.measureText(t).width; }

const isMobile = () => window.innerWidth <= 640;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtSize(b) {
  if (!b) return '–';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

const state = {
  view: 'mindmap',
  selected: null,
  depth: 1,
  filters: {
    areas: new Set(D.meta.areas),
    cats: new Set(D.meta.categories.concat(['Gruppe'])),
    onlyConnected: false,
    onlyUnconnected: false,
    onlyFindings: false,
    onlyHubs: false,
  },
  multiHl: null,
  // Cluster-System (Mindmap): welche Gruppen sind aufgeklappt?
  expanded: new Set(['root']),
};

let VG = null;
let vgNodeById = new Map();
let lodLevel = 2; // 0 = nur Hauptbereiche, 1 = + Ordner/Hubs, 2 = alles

// ===========================================================================
// 3. KAMERA – weiches Zoomen, Pannen, Trägheit, Kameraflüge (Google-Maps-Gefühl)
// ===========================================================================

const cam = { x: 0, y: 0, k: 1 };
let camAnim = null;     // laufender Kameraflug
let inertiaAnim = null; // laufende Trägheit nach dem Loslassen

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function stopCamAnim() {
  if (camAnim) { cancelAnimationFrame(camAnim); camAnim = null; }
  wheelZoom = null; // smoothZoomAt setzt sein Ziel nach flyTo() selbst neu
}
function stopInertia() { if (inertiaAnim) { cancelAnimationFrame(inertiaAnim); inertiaAnim = null; } }

/** Kamera sofort setzen (ohne Animation). */
function setCam(x, y, k) {
  cam.x = x; cam.y = y; cam.k = Math.max(0.04, Math.min(4, k));
  applyTransform();
}

/** Weicher Kameraflug zu Ziel-Transformation. Zoom wird in Log-Raum interpoliert. */
function flyTo(tx, ty, tk, dur, ease, opts) {
  stopCamAnim(); stopInertia();
  if (!opts || !opts.isWheel) wheelZoom = null; // Radzoom-Akkumulation beenden
  tk = Math.max(0.04, Math.min(4, tk));
  const s = { x: cam.x, y: cam.y, k: cam.k };
  const lk0 = Math.log(s.k), lk1 = Math.log(tk);
  const t0 = performance.now();
  dur = dur || 600;
  const fn = ease || easeInOut;
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const e = fn(p);
    const k = Math.exp(lk0 + (lk1 - lk0) * e);
    // Translation so interpolieren, dass der Weltmittelpunkt gleichmäßig wandert
    const cx0 = (svg.clientWidth / 2 - s.x) / s.k, cy0 = (svg.clientHeight / 2 - s.y) / s.k;
    const cx1 = (svg.clientWidth / 2 - tx) / tk, cy1 = (svg.clientHeight / 2 - ty) / tk;
    const cx = cx0 + (cx1 - cx0) * e, cy = cy0 + (cy1 - cy0) * e;
    cam.k = k;
    cam.x = svg.clientWidth / 2 - cx * k;
    cam.y = svg.clientHeight / 2 - cy * k;
    applyTransform();
    if (p < 1) camAnim = requestAnimationFrame(step);
    else { camAnim = null; if (opts && opts.isWheel) wheelZoom = null; }
  }
  camAnim = requestAnimationFrame(step);
}

/** Flug zu einem Weltpunkt mit Ziel-Zoom; offset berücksichtigt offene Panels. */
function flyToWorld(wx, wy, k, dur) {
  const off = panelOffset();
  flyTo(svg.clientWidth / 2 - wx * k + off.x, svg.clientHeight / 2 - wy * k + off.y, k, dur);
}

/** Flug, sodass eine Welt-Bounding-Box eingepasst ist. */
function flyToBounds(bb, dur, maxK) {
  const W = svg.clientWidth, H = svg.clientHeight;
  const k = Math.min(maxK || 1.4, Math.max(0.05,
    Math.min(W / (bb.x1 - bb.x0 + 240), H / (bb.y1 - bb.y0 + 240))));
  const off = panelOffset();
  flyTo(W / 2 - (bb.x0 + bb.x1) / 2 * k + off.x,
        H / 2 - (bb.y0 + bb.y1) / 2 * k + off.y, k, dur);
}

/** Versatz des Kamerazentrums, wenn Detail-Panel/Bottom-Sheet offen ist. */
function panelOffset() {
  if (!$('#detail').classList.contains('open')) return { x: 0, y: 0 };
  if (isMobile()) return { x: 0, y: -svg.clientHeight * 0.16 };
  return { x: -170, y: 0 };
}

/** Weiches Zoomen um einen Bildschirmpunkt (Mausrad, Buttons, Doppeltipp).
    Schnell aufeinanderfolgende Aufrufe (Radbewegungen) akkumulieren ihr Ziel,
    damit zügiges Scrollen auch zügig zoomt. */
let wheelZoom = null; // { k: aktuelles Zoom-Ziel der laufenden Rad-Animation }
function smoothZoomAt(cx, cy, factor, dur) {
  const base = wheelZoom ? wheelZoom.k : cam.k;
  const k = Math.max(0.04, Math.min(4, base * factor));
  const f = k / cam.k;
  const tx = cx - (cx - cam.x) * f;
  const ty = cy - (cy - cam.y) * f;
  flyTo(tx, ty, k, dur || 220, easeOutCubic, { isWheel: true });
  wheelZoom = { k };
}

/** Trägheit nach dem Loslassen (Geschwindigkeit in px/ms). */
function startInertia(vx, vy) {
  stopInertia();
  let last = performance.now();
  function step(now) {
    const dt = Math.min(40, now - last);
    last = now;
    cam.x += vx * dt;
    cam.y += vy * dt;
    const decay = Math.pow(0.94, dt / 16);
    vx *= decay; vy *= decay;
    applyTransform();
    if (Math.hypot(vx, vy) > 0.02) inertiaAnim = requestAnimationFrame(step);
    else inertiaAnim = null;
  }
  inertiaAnim = requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Transformation anwenden: Viewport, Raster, LOD, Culling, Minimap-Viewport
// ---------------------------------------------------------------------------

let cullScheduled = false;

function applyTransform() {
  viewportG.style.transform = 'translate(' + cam.x + 'px,' + cam.y + 'px) scale(' + cam.k + ')';
  const grid = $('#grid-bg');
  const cell = 28 * cam.k;
  grid.setAttribute('transform', 'translate(' + (cam.x % cell) + ',' + (cam.y % cell) + ') scale(' + cam.k + ')');
  updateLOD();
  if (!cullScheduled) {
    cullScheduled = true;
    requestAnimationFrame(() => { cullScheduled = false; refreshCulling(); });
  }
  drawMinimapViewport();
}

// ===========================================================================
// 4. VIEW-GRAPH-BUILDER
// ===========================================================================

function makeVNode(dataNode, opts) {
  opts = opts || {};
  const label = opts.label || dataNode.label;
  const scale = opts.scale || 1;
  const w = Math.max(74, Math.min(230, textW(label) + 44)) * scale;
  return {
    id: opts.id || dataNode.id,
    ref: dataNode || null,
    label,
    sub: opts.sub !== undefined ? opts.sub :
      (dataNode ? (EXT_BADGE[dataNode.ext] || dataNode.ext.toUpperCase()) + ' · ↓' + dataNode.inDeg + ' ↑' + dataNode.outDeg : ''),
    color: opts.color || (dataNode ? catColor(dataNode.category) : '#8a94a6'),
    x: opts.x || 0, y: opts.y || 0,
    w, h: (opts.h || 36) * scale,
    group: !!opts.group,
    actor: !!opts.actor,
    virtual: dataNode ? dataNode.virtual : false,
    flag: dataNode && (dataNode.findings.length || dataNode.unused),
    parentId: opts.parentId || null,
  };
}

function makeGroupNode(id, label, sub, color, scale) {
  const w = Math.max(120, textW(label) * 1.25 + 72) * (scale || 1.2);
  return {
    id, ref: null, label, sub: sub || '', color: color || '#8a94a6',
    x: 0, y: 0, w, h: 46 * (scale || 1.2), group: true, actor: false, virtual: false,
    flag: false, parentId: null,
  };
}

// --- Mindmap (mit Cluster-System) ------------------------------------------

function buildMindmap() {
  const nodes = [];
  const edges = [];
  const root = makeGroupNode('root', 'landingpage', D.meta.domain || 'Repository', '#6ea8fe', 1.5);
  nodes.push(root);

  const areas = D.meta.areas.filter(a => D.nodes.some(n => n.area === a));
  const tree = new Map();
  for (const a of areas) tree.set(a, new Map());
  for (const n of D.nodes) {
    const dirs = tree.get(n.area);
    if (!dirs.has(n.dir)) dirs.set(n.dir, []);
    dirs.get(n.dir).push(n);
  }

  const leafCount = a => [...tree.get(a).values()].reduce((s, f) => s + f.length, 0);
  const totalLeaves = areas.reduce((s, a) => s + leafCount(a), 0);
  let ang = -Math.PI / 2;
  const R_AREA = 330, R_GROUP = 640, R_FILE = 950;

  for (const a of areas) {
    const span = (leafCount(a) / totalLeaves) * Math.PI * 2;
    const aMid = ang + span / 2;
    const areaNode = makeGroupNode('area:' + a, a, leafCount(a) + ' Dateien', '#8a94a6', 1.25);
    areaNode.parentId = 'root';
    areaNode.x = Math.cos(aMid) * R_AREA;
    areaNode.y = Math.sin(aMid) * R_AREA;
    nodes.push(areaNode);
    edges.push({ source: 'root', target: areaNode.id, kind: 'tree', label: 'enthält' });

    const dirs = [...tree.get(a).entries()].sort((x, y) => x[0].localeCompare(y[0]));
    let ang2 = ang;
    for (const [dir, filesInDir] of dirs) {
      const span2 = (filesInDir.length / totalLeaves) * Math.PI * 2;
      const gMid = ang2 + span2 / 2;
      let parentId = areaNode.id;
      const isRootDir = dir === '/' || !dir.includes('/');
      if (!isRootDir || (dir !== '/' && dirs.length > 1)) {
        const gid = 'dir:' + dir;
        if (!nodes.some(n => n.id === gid)) {
          const g = makeGroupNode(gid, dir.split('/').pop() + '/', dir, '#7d8798', 1);
          g.parentId = areaNode.id;
          g.x = Math.cos(gMid) * R_GROUP;
          g.y = Math.sin(gMid) * R_GROUP;
          nodes.push(g);
          edges.push({ source: parentId, target: gid, kind: 'tree', label: 'enthält' });
        }
        parentId = gid;
      }
      filesInDir.sort((x, y) => x.label.localeCompare(y.label));
      filesInDir.forEach((f, i) => {
        const fa = ang2 + ((i + 0.5) / filesInDir.length) * span2;
        const r = R_FILE + (i % 2) * 85 + (parentId === areaNode.id ? -160 : 0);
        const vn = makeVNode(f, {
          x: Math.cos(fa) * r, y: Math.sin(fa) * r, scale: 0.92, parentId,
        });
        nodes.push(vn);
        edges.push({ source: parentId, target: f.id, kind: 'tree', label: 'enthält' });
      });
      ang2 += span2;
    }
    ang += span;
  }

  for (const e of D.edges) edges.push(Object.assign({ faint: true }, e));
  // Layout-Zielpositionen merken (für Cluster-Animationen)
  for (const n of nodes) { n.homeX = n.x; n.homeY = n.y; }
  return { nodes, edges, hulls: [], texts: [] };
}

// --- Force-Simulation (Abhängigkeitsgraph & Systemübersicht) ----------------

function forceSim(nodes, edges, opts) {
  opts = opts || {};
  const n = nodes.length;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const springs = edges
    .filter(e => idx.has(e.source) && idx.has(e.target) && !e.faint)
    .map(e => ({ a: idx.get(e.source), b: idx.get(e.target) }));

  const areas = [...new Set(nodes.map(nd => nd.ref ? nd.ref.area : 'x'))];
  const anchor = new Map();
  areas.forEach((a, i) => {
    const t = (i / areas.length) * Math.PI * 2 - Math.PI / 2;
    anchor.set(a, { x: Math.cos(t) * (opts.anchorR || 620), y: Math.sin(t) * (opts.anchorR || 620) });
  });
  nodes.forEach(nd => {
    const a = anchor.get(nd.ref ? nd.ref.area : 'x') || { x: 0, y: 0 };
    if (nd.x === 0 && nd.y === 0) {
      nd.x = a.x + (Math.random() - 0.5) * 500;
      nd.y = a.y + (Math.random() - 0.5) * 500;
    }
    nd.vx = 0; nd.vy = 0;
  });

  const REP = opts.repulsion || 26000;
  const SPRING_L = opts.springLen || 190;
  const SPRING_K = 0.045;
  const ticks = opts.ticks || 320;

  for (let t = 0; t < ticks; t++) {
    const alpha = 1 - t / ticks;
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        if (d2 > 640000) continue;
        const f = REP / d2 * alpha;
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        a.vx += dx * f; a.vy += dy * f;
        b.vx -= dx * f; b.vy -= dy * f;
      }
    }
    for (const s of springs) {
      const a = nodes[s.a], b = nodes[s.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (d - SPRING_L) * SPRING_K * alpha;
      const ux = dx / d, uy = dy / d;
      a.vx += ux * f; a.vy += uy * f;
      b.vx -= ux * f; b.vy -= uy * f;
    }
    for (const nd of nodes) {
      const a = anchor.get(nd.ref ? nd.ref.area : 'x') || { x: 0, y: 0 };
      nd.vx += (a.x - nd.x) * 0.012 * alpha;
      nd.vy += (a.y - nd.y) * 0.012 * alpha;
      nd.vx += -nd.x * 0.002 * alpha;
      nd.vy += -nd.y * 0.002 * alpha;
      nd.x += nd.vx = nd.vx * 0.5;
      nd.y += nd.vy = nd.vy * 0.5;
    }
  }
}

function buildDeps() {
  const nodes = D.nodes.map(n => makeVNode(n, { scale: 1 + Math.min(0.5, degree(n.id) / 40) }));
  const edges = D.edges.map(e => Object.assign({}, e));
  forceSim(nodes, edges, {});
  return { nodes, edges, hulls: [], texts: [] };
}

// --- Ordnerstruktur ---------------------------------------------------------

function buildFolders() {
  const byDir = new Map();
  for (const n of D.nodes) {
    const d = n.virtual ? '(Dienste & Datenbank)' : n.dir;
    if (!byDir.has(d)) byDir.set(d, []);
    byDir.get(d).push(n);
  }
  const dirs = [...byDir.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const nodes = [], hulls = [], texts = [];
  const CELL_W = 200, CELL_H = 52, PAD = 26, HEAD = 46, GAP = 46;
  const MAX_ROW_W = 2500;
  let cx = 0, cy = 0, rowH = 0;

  for (const [dir, filesInDir] of dirs) {
    filesInDir.sort((a, b) => a.label.localeCompare(b.label));
    const cols = Math.max(1, Math.ceil(Math.sqrt(filesInDir.length * 1.7)));
    const rows = Math.ceil(filesInDir.length / cols);
    const w = cols * CELL_W + PAD * 2;
    const h = rows * CELL_H + PAD + HEAD;
    if (cx + w > MAX_ROW_W && cx > 0) { cx = 0; cy += rowH + GAP; rowH = 0; }
    hulls.push({ x: cx, y: cy, w, h, label: dir === '/' ? '/ (Root)' : dir });
    filesInDir.forEach((f, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const vn = makeVNode(f, { scale: 0.9 });
      vn.x = cx + PAD + col * CELL_W + CELL_W / 2;
      vn.y = cy + HEAD + row * CELL_H + CELL_H / 2;
      nodes.push(vn);
    });
    cx += w + GAP;
    rowH = Math.max(rowH, h);
  }
  const edges = D.edges.map(e => Object.assign({ faint: true }, e));
  return { nodes, edges, hulls, texts };
}

// --- Datenfluss -------------------------------------------------------------

function buildFlow() {
  const nodes = [], edges = [], texts = [];
  const LANE_H = 240, STEP_W = 330;
  D.flows.forEach((flow, fi) => {
    const y = fi * LANE_H;
    texts.push({ x: 0, y: y - 46, text: flow.title, cls: 'flow-title' });
    texts.push({ x: 0, y: y - 26, text: flow.desc, cls: 'flow-desc' });
    let prevId = null;
    flow.steps.forEach((step, si) => {
      const id = 'flow:' + fi + ':' + si;
      const dataNode = step.node ? nodeById.get(step.node) : null;
      const vn = dataNode
        ? makeVNode(dataNode, { id, label: step.label, x: si * STEP_W, y })
        : Object.assign(makeGroupNode(id, step.label, '', '#6ea8fe', 1), { actor: true, x: si * STEP_W, y });
      nodes.push(vn);
      if (prevId) edges.push({ source: prevId, target: id, kind: 'flow', label: flow.title });
      prevId = id;
    });
  });
  return { nodes, edges, hulls: [], texts };
}

// --- Systemübersicht --------------------------------------------------------

function buildSystem() {
  const nodes = [];
  const mapTo = new Map();

  const areas = D.meta.areas.filter(a => a !== 'Externe Dienste & Daten');
  for (const a of areas) {
    const count = D.nodes.filter(n => n.area === a && !n.virtual).length;
    const g = makeGroupNode('sys:' + a, a, count + ' Dateien', '#6ea8fe', 1.5);
    nodes.push(g);
    for (const n of D.nodes) if (n.area === a && !n.virtual) mapTo.set(n.id, g.id);
  }
  for (const n of D.nodes) {
    if (n.virtual) {
      nodes.push(makeVNode(n, { scale: 1.15 }));
      mapTo.set(n.id, n.id);
    }
  }
  const hubs = D.nodes.filter(n => !n.virtual && degree(n.id) >= 12).slice(0, 8);
  for (const h of hubs) {
    nodes.push(makeVNode(h, { scale: 1.05 }));
    mapTo.set(h.id, h.id);
  }

  const agg = new Map();
  for (const e of D.edges) {
    const s = mapTo.get(e.source), t = mapTo.get(e.target);
    if (!s || !t || s === t) continue;
    const key = s + '→' + t + '|' + e.kind;
    if (!agg.has(key)) agg.set(key, { source: s, target: t, kind: e.kind, label: kindStyle(e.kind).label, n: 0 });
    agg.get(key).n++;
  }
  const edges = [...agg.values()].map(e => {
    e.label = e.label + (e.n > 1 ? ' (' + e.n + '×)' : '');
    return e;
  });
  forceSim(nodes, edges, { repulsion: 90000, springLen: 330, anchorR: 100, ticks: 400 });
  return { nodes, edges, hulls: [], texts: [] };
}

// ===========================================================================
// 5. RENDERING & SICHTBARKEITS-PIPELINE
// ===========================================================================
// Sichtbarkeit einer Karte = Filter ∧ Cluster-Zustand ∧ LOD ∧ Viewport-Culling.
// Die ersten drei sind "logisch" (_show/_lod), Culling passiert pro Frame und
// schreibt nur bei Änderungen ins DOM (virtuelles Rendering).

function edgePath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / d, uy = dy / d;
  const cutT = Math.min(
    Math.abs(ux) > 1e-4 ? (b.w / 2 + 6) / Math.abs(ux) : 1e9,
    Math.abs(uy) > 1e-4 ? (b.h / 2 + 6) / Math.abs(uy) : 1e9, d);
  const ex = b.x - ux * cutT, ey = b.y - uy * cutT;
  const cutS = Math.min(
    Math.abs(ux) > 1e-4 ? (a.w / 2 + 4) / Math.abs(ux) : 1e9,
    Math.abs(uy) > 1e-4 ? (a.h / 2 + 4) / Math.abs(uy) : 1e9, d);
  const sx = a.x + ux * cutS, sy = a.y + uy * cutS;
  const mx = (sx + ex) / 2 - dy / d * Math.min(40, d * 0.08);
  const my = (sy + ey) / 2 + dx / d * Math.min(40, d * 0.08);
  return 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) +
         ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) +
         ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
}

function render(opts) {
  opts = opts || {};
  layerHulls.innerHTML = '';
  layerEdges.innerHTML = '';
  layerEdgeHits.innerHTML = '';
  layerNodes.innerHTML = '';
  vgNodeById = new Map(VG.nodes.map(n => [n.id, n]));

  for (const h of VG.hulls) {
    layerHulls.appendChild(svgEl('rect', { class: 'hull', x: h.x, y: h.y, width: h.w, height: h.h, rx: 16 }));
    const t = svgEl('text', { class: 'hull-label', x: h.x + 18, y: h.y + 30 });
    t.textContent = h.label;
    layerHulls.appendChild(t);
  }
  for (const tx of VG.texts) {
    const t = svgEl('text', { class: tx.cls, x: tx.x, y: tx.y });
    t.textContent = tx.text;
    layerHulls.appendChild(t);
  }

  VG.edges.forEach((e, i) => {
    const a = vgNodeById.get(e.source), b = vgNodeById.get(e.target);
    if (!a || !b) { e._el = null; return; }
    const ks = kindStyle(e.kind);
    const p = svgEl('path', {
      class: 'edge' + (ks.dashed ? ' dashed' : ''),
      stroke: ks.color,
      d: edgePath(a, b),
      'marker-end': e.kind === 'tree' ? '' : 'url(#arrow)',
    });
    if (e.faint) p.style.opacity = 0.07;
    if (e.kind === 'tree') p.style.opacity = 0.28;
    // Einzeichnen-Animation (pathLength=1 macht die Dash-Werte längenunabhängig)
    if (opts.animate && !ks.dashed && !e.faint) {
      p.setAttribute('pathLength', '1');
      p.classList.add('draw');
      p.style.animationDelay = Math.min(300, i * 3) + 'ms';
    } else if (opts.animate) {
      p.classList.add('fadein');
    }
    layerEdges.appendChild(p);
    e._el = p;
    const hit = svgEl('path', { class: 'edge hit', d: p.getAttribute('d'), stroke: '#fff' });
    hit.style.pointerEvents = 'stroke';
    hit.dataset.ei = i;
    layerEdgeHits.appendChild(hit);
    e._hit = hit;
    e._disp = true;
  });

  for (const n of VG.nodes) {
    const g = svgEl('g', { class: 'node' + (n.virtual ? ' virtual' : '') + (n.group ? ' group' : '') + (n.actor ? ' actor' : '') });
    g.dataset.id = n.id;
    // Großzügige unsichtbare Klickfläche (Touch), Karte selbst bleibt klein
    const pad = isMobile() ? 16 : 8;
    g.appendChild(svgEl('rect', {
      class: 'hitarea',
      x: -n.w / 2 - pad, y: -n.h / 2 - pad,
      width: n.w + pad * 2, height: n.h + pad * 2,
    }));
    const rect = svgEl('rect', {
      class: 'card', x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h,
      rx: n.group ? 14 : 9,
    });
    g.appendChild(rect);
    g.appendChild(svgEl('circle', { class: 'dot', cx: -n.w / 2 + 13, cy: n.sub ? -4 : 0, r: 4.5, fill: n.color }));
    const lbl = svgEl('text', { class: 'lbl', x: -n.w / 2 + 24, y: n.sub ? 0 : 4 });
    lbl.textContent = n.label;
    if (n.group) { lbl.setAttribute('font-weight', '700'); lbl.setAttribute('font-size', '13px'); }
    g.appendChild(lbl);
    if (n.sub) {
      const sub = svgEl('text', { class: 'sub', x: -n.w / 2 + 24, y: 13 });
      sub.textContent = n.sub;
      g.appendChild(sub);
    }
    // Cluster-Indikator (Mindmap-Gruppen)
    if (n.group && state.view === 'mindmap' && n.id !== 'root') {
      const chev = svgEl('text', { class: 'chev', x: n.w / 2 - 18, y: 5 });
      chev.textContent = state.expanded.has(n.id) ? '▾' : '▸';
      g.appendChild(chev);
      n._chev = chev;
    }
    if (n.flag) {
      const f = svgEl('text', { class: 'badge-flag', x: n.w / 2 - 16, y: -n.h / 2 + 13, fill: '#ffd166' });
      f.textContent = '⚠';
      g.appendChild(f);
    }
    g.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
    layerNodes.appendChild(g);
    n._el = g;
    n._disp = true;
  }

  updateVisibility();
  applyHighlight();
  drawMinimap();
}

function updateNodePos(n) {
  n._el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
  for (const e of VG.edges) {
    if (!e._el) continue;
    if (e.source === n.id || e.target === n.id) {
      const d = edgePath(vgNodeById.get(e.source), vgNodeById.get(e.target));
      e._el.setAttribute('d', d);
      if (e._hit) e._hit.setAttribute('d', d);
    }
  }
}

// --- Logische Sichtbarkeit: Filter + Cluster --------------------------------

function nodePassesFilters(vn) {
  const n = vn.ref;
  if (!n) return true;
  const f = state.filters;
  if (!f.areas.has(n.area)) return false;
  if (!f.cats.has(n.category)) return false;
  const deg = degree(n.id);
  if (f.onlyConnected && deg === 0) return false;
  if (f.onlyUnconnected && deg > 0) return false;
  if (f.onlyFindings && !n.findings.length && !n.unused) return false;
  if (f.onlyHubs && deg < HUB_MIN) return false;
  return true;
}

/** Mindmap: sichtbar nur, wenn alle Eltern-Cluster aufgeklappt sind. */
function clusterVisible(vn) {
  if (state.view !== 'mindmap') return true;
  let p = vn.parentId;
  while (p) {
    if (!state.expanded.has(p)) return false;
    const pn = vgNodeById.get(p);
    p = pn ? pn.parentId : null;
  }
  return true;
}

/** LOD-Ausblendung je Zoomstufe (nur Abhängigkeits-/Ordner-Ansicht). */
function lodHidden(vn) {
  if (state.view !== 'deps' && state.view !== 'folders') return false;
  if (vn.group) return false;
  if (lodLevel === 0) return !vn.ref || (!vn.ref.virtual && degree(vn.id) < HUB_MIN);
  return false;
}

function updateVisibility() {
  for (const vn of VG.nodes) {
    vn._show = nodePassesFilters(vn) && clusterVisible(vn) && !lodHidden(vn);
  }
  for (const e of VG.edges) {
    if (!e._el) continue;
    const a = vgNodeById.get(e.source), b = vgNodeById.get(e.target);
    e._show = a && b && a._show && b._show &&
      !(lodLevel === 0 && e.kind !== 'tree' && (state.view === 'deps' || state.view === 'folders')) &&
      !(lodLevel <= 1 && e.faint && state.view === 'folders');
  }
  refreshCulling(true);
  updateStats();
  drawMinimap();
}

// --- LOD (Level of Detail, wie bei Google Maps) -----------------------------

function updateLOD() {
  svg.classList.toggle('lod-far', cam.k < 0.75); // Sub-Labels erst nah zeigen
  const lvl = cam.k < 0.17 ? 0 : cam.k < 0.42 ? 1 : 2;
  if (lvl !== lodLevel) {
    lodLevel = lvl;
    if (VG) updateVisibility();
  }
}

// --- Viewport-Culling (virtuelles Rendering) --------------------------------

function refreshCulling(force) {
  if (!VG) return;
  const W = svg.clientWidth, H = svg.clientHeight;
  const M = 260; // Rand, damit nichts sichtbar "aufploppt"
  const x0 = (-cam.x - M) / cam.k, y0 = (-cam.y - M) / cam.k;
  const x1 = (W - cam.x + M) / cam.k, y1 = (H - cam.y + M) / cam.k;

  for (const vn of VG.nodes) {
    const vis = vn._show &&
      vn.x + vn.w / 2 > x0 && vn.x - vn.w / 2 < x1 &&
      vn.y + vn.h / 2 > y0 && vn.y - vn.h / 2 < y1;
    if (vis !== vn._disp || force) {
      vn._disp = vis;
      vn._el.style.display = vis ? '' : 'none';
    }
  }
  for (const e of VG.edges) {
    if (!e._el) continue;
    const a = vgNodeById.get(e.source), b = vgNodeById.get(e.target);
    const bx0 = Math.min(a.x, b.x), bx1 = Math.max(a.x, b.x);
    const by0 = Math.min(a.y, b.y), by1 = Math.max(a.y, b.y);
    const vis = !!e._show && bx1 > x0 && bx0 < x1 && by1 > y0 && by0 < y1;
    if (vis !== e._disp || force) {
      e._disp = vis;
      e._el.style.display = vis ? '' : 'none';
      if (e._hit) e._hit.style.display = vis ? '' : 'none';
    }
  }
}

// --- Cluster auf-/zuklappen (animiert) --------------------------------------

let clusterAnim = null;

function directChildren(gid) {
  return VG.nodes.filter(n => n.parentId === gid);
}

function descendantGroups(gid) {
  const out = [];
  const stack = [gid];
  while (stack.length) {
    const cur = stack.pop();
    for (const n of VG.nodes) {
      if (n.parentId === cur && n.group) { out.push(n.id); stack.push(n.id); }
    }
  }
  return out;
}

function toggleCluster(gid) {
  const gn = vgNodeById.get(gid);
  if (!gn) return;
  const willExpand = !state.expanded.has(gid);

  if (willExpand) {
    state.expanded.add(gid);
    updateVisibility();
    // Kinder fliegen animiert aus dem Cluster heraus
    const kids = directChildren(gid).filter(k => k._show);
    animateFrom(kids, gn.x, gn.y, 420);
    // Kamera passt Cluster + Kinder ein
    let bb = { x0: gn.x, y0: gn.y, x1: gn.x, y1: gn.y };
    for (const k of kids) {
      bb.x0 = Math.min(bb.x0, k.homeX - k.w); bb.x1 = Math.max(bb.x1, k.homeX + k.w);
      bb.y0 = Math.min(bb.y0, k.homeY - k.h); bb.y1 = Math.max(bb.y1, k.homeY + k.h);
    }
    flyToBounds(bb, 650, 1.1);
  } else {
    // Zuklappen: Kinder fliegen zurück in den Cluster, dann ausblenden
    state.expanded.delete(gid);
    for (const dg of descendantGroups(gid)) state.expanded.delete(dg);
    const kids = VG.nodes.filter(k => k._show && k.parentId && !clusterVisible(k));
    animateTo(kids, gn.x, gn.y, 320, () => updateVisibility());
  }
  if (gn._chev) gn._chev.textContent = willExpand ? '▾' : '▸';
}

/** Knoten von einem Punkt zu ihren Home-Positionen animieren (Aufklappen). */
function animateFrom(nodes, fx, fy, dur) {
  if (clusterAnim) cancelAnimationFrame(clusterAnim);
  const t0 = performance.now();
  for (const n of nodes) {
    n.x = fx; n.y = fy;
    n._el.classList.remove('enter');
    void n._el.getBBox; // reflow-frei; Klasse einfach neu setzen
    n._el.classList.add('enter');
  }
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const e = easeOutCubic(p);
    for (const n of nodes) {
      n.x = fx + (n.homeX - fx) * e;
      n.y = fy + (n.homeY - fy) * e;
      updateNodePos(n);
    }
    if (p < 1) clusterAnim = requestAnimationFrame(step);
    else { clusterAnim = null; drawMinimap(); }
  }
  clusterAnim = requestAnimationFrame(step);
}

/** Knoten zu einem Punkt hin animieren (Zuklappen), danach Callback. */
function animateTo(nodes, tx, ty, dur, done) {
  if (clusterAnim) cancelAnimationFrame(clusterAnim);
  const t0 = performance.now();
  const start = nodes.map(n => ({ n, x: n.x, y: n.y }));
  function step(now) {
    const p = Math.min(1, (now - t0) / dur);
    const e = easeOutCubic(p);
    for (const s of start) {
      s.n.x = s.x + (tx - s.x) * e;
      s.n.y = s.y + (ty - s.y) * e;
      updateNodePos(s.n);
    }
    if (p < 1) clusterAnim = requestAnimationFrame(step);
    else {
      clusterAnim = null;
      for (const s of start) { s.n.x = s.n.homeX; s.n.y = s.n.homeY; updateNodePos(s.n); }
      if (done) done();
    }
  }
  clusterAnim = requestAnimationFrame(step);
}

/** Stellt sicher, dass ein Daten-Knoten im aktuellen View sichtbar sein kann
    (klappt in der Mindmap die nötigen Cluster auf). */
function ensureNodeVisible(dataId) {
  if (state.view !== 'mindmap') return;
  const ids = viewIdsForDataId(dataId);
  for (const id of ids) {
    let vn = vgNodeById.get(id);
    let p = vn && vn.parentId;
    let changed = false;
    while (p) {
      if (!state.expanded.has(p)) { state.expanded.add(p); changed = true; }
      const pn = vgNodeById.get(p);
      if (pn && pn._chev) pn._chev.textContent = '▾';
      p = pn ? pn.parentId : null;
    }
    if (changed) updateVisibility();
  }
}

// --- Auswahl & Hervorhebung -------------------------------------------------

function reachSet(startIds, depth, dir) {
  const lvl = new Map();
  let frontier = startIds.filter(id => vgNodeById.has(id));
  frontier.forEach(id => lvl.set(id, 0));
  for (let d = 0; d < depth && frontier.length; d++) {
    const next = [];
    for (const e of VG.edges) {
      if (!e._el || !e._show || e.kind === 'tree') continue;
      const from = dir === 'out' ? e.source : e.target;
      const to = dir === 'out' ? e.target : e.source;
      if (lvl.get(from) === d && !lvl.has(to)) { lvl.set(to, d + 1); next.push(to); }
    }
    frontier = next;
  }
  return lvl;
}

function applyHighlight() {
  const selIds = state.multiHl
    ? [...state.multiHl]
    : state.selected ? viewIdsForDataId(state.selected) : null;

  if (!selIds || !selIds.length) {
    for (const n of VG.nodes) n._el.classList.remove('dim', 'selected', 'hl');
    for (const e of VG.edges) if (e._el) e._el.classList.remove('dim', 'hl-in', 'hl-out');
    return;
  }
  const depth = state.depth === Infinity ? 99 : state.depth;
  const fw = reachSet(selIds, depth, 'out');
  const bw = reachSet(selIds, depth, 'in');
  const inCone = id => fw.has(id) || bw.has(id);
  const selSet = new Set(selIds);

  for (const n of VG.nodes) {
    n._el.classList.toggle('selected', selSet.has(n.id));
    n._el.classList.toggle('hl', inCone(n.id) && !selSet.has(n.id));
    n._el.classList.toggle('dim', !inCone(n.id));
  }
  for (const e of VG.edges) {
    if (!e._el) continue;
    const inFw = fw.has(e.source) && fw.has(e.target) && fw.get(e.source) < depth && e.kind !== 'tree';
    const inBw = bw.has(e.target) && bw.has(e.source) && bw.get(e.target) < depth && e.kind !== 'tree';
    e._el.classList.toggle('hl-out', inFw);
    e._el.classList.toggle('hl-in', inBw && !inFw);
    e._el.classList.toggle('dim', !inFw && !inBw);
  }
}

function viewIdsForDataId(dataId) {
  const ids = [];
  for (const vn of VG.nodes) if (vn.ref && vn.ref.id === dataId) ids.push(vn.id);
  if (!ids.length && vgNodeById.has(dataId)) ids.push(dataId);
  return ids;
}

function clearSelection() {
  state.selected = null;
  state.multiHl = null;
  $('#detail').classList.remove('open');
  $('#minimap-wrap').classList.remove('shifted');
  applyHighlight();
}

// ===========================================================================
// 6. INTERAKTION
// ===========================================================================

// --- Detailpanel ------------------------------------------------------------

function depItemHtml(otherId, relLabel, dirCls) {
  const o = nodeById.get(otherId);
  const name = o ? o.label : otherId;
  const color = o ? catColor(o.category) : '#8a94a6';
  return '<div class="dep-item ' + dirCls + '" data-id="' + esc(otherId) + '">' +
    '<span class="dot" style="background:' + color + '"></span>' +
    '<span>' + esc(name) + '</span>' +
    '<span class="rel">' + esc(relLabel) + '</span></div>';
}

function selectNode(dataId, opts) {
  const n = nodeById.get(dataId);
  if (!n) return;
  state.multiHl = null;
  state.selected = dataId;
  ensureNodeVisible(dataId);

  $('#d-dot').style.background = catColor(n.category);
  $('#d-title').textContent = n.label;
  $('#d-path').textContent = n.path + (n.virtual ? '' : '  ·  ' + n.dir);

  const tags = [
    n.category,
    (EXT_BADGE[n.ext] || n.ext).toUpperCase(),
    n.virtual ? null : fmtSize(n.size),
    n.lines ? n.lines + ' Zeilen' : null,
    '↓ ' + n.inDeg + ' eingehend', '↑ ' + n.outDeg + ' ausgehend',
    degree(n.id) >= HUB_MIN ? '★ zentral' : null,
  ].filter(Boolean).map(t => '<span class="tag">' + esc(t) + '</span>');
  if (n.unused) tags.push('<span class="tag warn">möglicherweise ungenutzt</span>');
  $('#d-tags').innerHTML = tags.join('');

  let html = '';
  html += '<section><h4>Beschreibung</h4><div class="desc">' + esc(n.desc) + '</div></section>';

  html += '<section><h4>Hervorhebung</h4><div class="depth-row"><span class="lab">Tiefe:</span>';
  for (const d of [1, 2, 3, 'Alle']) {
    const val = d === 'Alle' ? 'inf' : d;
    const act = (d === 'Alle' ? state.depth === Infinity : state.depth === d) ? ' active' : '';
    html += '<button class="depth-btn' + act + '" data-depth="' + val + '">' + d + '</button>';
  }
  html += '</div><button class="action-btn" id="btn-follow">Abhängigkeiten weiterverfolgen (Tiefe +1)</button></section>';

  const outs = outEdges.get(dataId) || [];
  const ins = inEdges.get(dataId) || [];
  if (outs.length) {
    html += '<section><h4>Ausgehend (' + outs.length + ') – diese Datei nutzt</h4>' +
      outs.map(e => depItemHtml(e.target, e.label, 'out')).join('') + '</section>';
  }
  if (ins.length) {
    html += '<section><h4>Eingehend (' + ins.length + ') – wird verwendet von</h4>' +
      ins.map(e => depItemHtml(e.source, e.label, 'in')).join('') + '</section>';
  }
  if (n.symbols.length) {
    html += '<section><h4>Zentrale Funktionen & Exporte</h4>' +
      n.symbols.map(s => '<span class="sym">' + esc(s) + '</span>').join('') + '</section>';
  }
  if (n.envVars.length) {
    html += '<section><h4>Environment-Variablen (nur Namen)</h4>' +
      n.envVars.map(s => '<span class="envv">' + esc(s) + '</span>').join('') + '</section>';
  }
  if (n.findings.length) {
    html += '<section><h4>Mögliche Auffälligkeiten</h4>' +
      n.findings.map(i => {
        const f = D.findings[i];
        return '<div class="finding"><b>' + esc(f.type) + '</b><br>' + esc(f.text) + '</div>';
      }).join('') + '</section>';
  }
  $('#d-body').innerHTML = html;
  $('#d-body').scrollTop = 0;

  // Sprung zu verbundenen Dateien
  $('#d-body').querySelectorAll('.dep-item').forEach(el => {
    el.addEventListener('click', () => selectNode(el.dataset.id));
  });
  $('#d-body').querySelectorAll('.depth-btn').forEach(el => {
    el.addEventListener('click', () => {
      state.depth = el.dataset.depth === 'inf' ? Infinity : +el.dataset.depth;
      selectNode(dataId, { noFocus: true });
    });
  });
  const fb = $('#btn-follow');
  if (fb) fb.addEventListener('click', () => {
    state.depth = state.depth >= 3 ? Infinity : state.depth + 1;
    selectNode(dataId, { noFocus: true });
  });

  $('#detail').classList.add('open');
  $('#detail').style.transform = '';
  $('#minimap-wrap').classList.add('shifted');
  $('#legend').classList.remove('open');
  $('#findings-panel').classList.remove('open');
  applyHighlight();
  if (!opts || !opts.noFocus) focusNode(dataId, true);
}

/** Kameraflug zu einem Daten-Knoten. */
function focusNode(dataId, zoom) {
  const ids = viewIdsForDataId(dataId);
  if (!ids.length) return;
  const vn = vgNodeById.get(ids[0]);
  const k = zoom ? Math.max(cam.k, 0.9) : cam.k;
  flyToWorld(vn.x, vn.y, k, 650);
}

// --- Bottom Sheet (mobil): am Griff nach unten ziehen schließt ---------------

(function initSheetDrag() {
  const handle = $('#d-handle');
  const detail = $('#detail');
  let startY = null;
  handle.addEventListener('pointerdown', ev => {
    startY = ev.clientY;
    handle.setPointerCapture(ev.pointerId);
  });
  handle.addEventListener('pointermove', ev => {
    if (startY === null) return;
    const dy = Math.max(0, ev.clientY - startY);
    detail.style.transition = 'none';
    detail.style.transform = 'translateY(' + dy + 'px)';
  });
  handle.addEventListener('pointerup', ev => {
    if (startY === null) return;
    const dy = ev.clientY - startY;
    detail.style.transition = '';
    startY = null;
    if (dy > 90) { detail.style.transform = ''; clearSelection(); }
    else detail.style.transform = '';
  });
})();

// --- Pointer-Gesten auf der Bühne -------------------------------------------
// 1 Finger / linke Maustaste: Pannen (mit Trägheit beim Loslassen)
// 2 Finger: Pinch-Zoom; kurzer 2-Finger-Tipp: herauszoomen
// Doppeltipp/Doppelklick: Node fokussieren bzw. hineinzoomen

const pointers = new Map();
let panStart = null, dragNode = null, pinchStart = null;
let panSamples = [];   // für Trägheit: letzte Bewegungsproben
let lastTap = null;    // für Doppeltipp-Erkennung

svg.addEventListener('wheel', ev => {
  ev.preventDefault();
  smoothZoomAt(ev.clientX, ev.clientY, Math.pow(1.0016, -ev.deltaY), 140);
}, { passive: false });

svg.addEventListener('pointerdown', ev => {
  stopInertia(); stopCamAnim();
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = {
      d: Math.hypot(a.x - b.x, a.y - b.y), k: cam.k,
      t0: performance.now(), moved: false,
    };
    panStart = null; dragNode = null;
    return;
  }
  const nodeG = ev.target.closest('.node');
  if (nodeG) {
    const vn = vgNodeById.get(nodeG.dataset.id);
    dragNode = { vn, sx: ev.clientX, sy: ev.clientY, ox: vn.x, oy: vn.y, moved: false };
    svg.setPointerCapture(ev.pointerId);
  } else {
    panStart = { sx: ev.clientX, sy: ev.clientY, tx: cam.x, ty: cam.y };
    panSamples = [{ t: performance.now(), x: ev.clientX, y: ev.clientY }];
    svg.classList.add('panning');
    svg.setPointerCapture(ev.pointerId);
  }
});

svg.addEventListener('pointermove', ev => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

  if (pinchStart && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (Math.abs(d - pinchStart.d) > 12) pinchStart.moved = true;
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const target = pinchStart.k * d / pinchStart.d;
    const f = Math.max(0.04, Math.min(4, target)) / cam.k;
    cam.x = cx - (cx - cam.x) * f;
    cam.y = cy - (cy - cam.y) * f;
    cam.k = cam.k * f;
    applyTransform();
    return;
  }
  if (dragNode) {
    const dx = (ev.clientX - dragNode.sx) / cam.k;
    const dy = (ev.clientY - dragNode.sy) / cam.k;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragNode.moved = true;
    dragNode.vn.x = dragNode.ox + dx;
    dragNode.vn.y = dragNode.oy + dy;
    updateNodePos(dragNode.vn);
    return;
  }
  if (panStart) {
    cam.x = panStart.tx + (ev.clientX - panStart.sx);
    cam.y = panStart.ty + (ev.clientY - panStart.sy);
    panSamples.push({ t: performance.now(), x: ev.clientX, y: ev.clientY });
    if (panSamples.length > 6) panSamples.shift();
    applyTransform();
    return;
  }
  // Hover-Effekte (nur Desktop relevant)
  const nodeG = ev.target.closest('.node');
  svg.classList.toggle('node-hover', !!nodeG);
  if (nodeG) {
    const vn = vgNodeById.get(nodeG.dataset.id);
    if (vn && vn.ref) showNodeTooltip(vn.ref, ev.clientX, ev.clientY);
    else if (vn) showTooltip('<div class="tt-title">' + esc(vn.label) + '</div><div class="tt-sub">' + esc(vn.sub || 'Gruppe') + '</div>', ev.clientX, ev.clientY);
  } else if (ev.target.classList && ev.target.classList.contains('hit')) {
    const e = VG.edges[+ev.target.dataset.ei];
    if (e) showEdgeTooltip(e, ev.clientX, ev.clientY);
  } else hideTooltip();
});

svg.addEventListener('pointerup', ev => {
  pointers.delete(ev.pointerId);

  // Kurzer 2-Finger-Tipp ohne Bewegung → herauszoomen (Google-Maps-Geste)
  if (pinchStart) {
    if (!pinchStart.moved && performance.now() - pinchStart.t0 < 260) {
      smoothZoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1 / 1.7, 260);
    }
    pinchStart = null;
    return;
  }

  if (dragNode) {
    const vn = dragNode.vn;
    if (!dragNode.moved) handleTap(vn, ev);
    else drawMinimap();
    dragNode = null;
    return;
  }
  if (panStart) {
    const moved = Math.hypot(ev.clientX - panStart.sx, ev.clientY - panStart.sy);
    panStart = null;
    svg.classList.remove('panning');
    if (moved < 4) {
      handleTap(null, ev); // Tipp auf freie Fläche
    } else if (panSamples.length >= 2) {
      // Trägheit aus den letzten Bewegungsproben
      const a = panSamples[0], b = panSamples[panSamples.length - 1];
      const dt = Math.max(1, b.t - a.t);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      if (Math.hypot(vx, vy) > 0.18) startInertia(vx, vy);
    }
  }
});

/** Einfacher Tipp / Doppeltipp auf Node oder freie Fläche. */
function handleTap(vn, ev) {
  const now = performance.now();
  const isDouble = lastTap && now - lastTap.t < 320 &&
    Math.hypot(ev.clientX - lastTap.x, ev.clientY - lastTap.y) < 36;
  lastTap = isDouble ? null : { t: now, x: ev.clientX, y: ev.clientY };

  if (vn) {
    // Tap-Animation
    vn._el.classList.remove('tapped');
    void vn._el.getBoundingClientRect();
    vn._el.classList.add('tapped');
    if (vn.group && state.view === 'mindmap' && vn.id !== 'root') {
      toggleCluster(vn.id);
    } else if (vn.ref) {
      if (isDouble) { selectNode(vn.ref.id, { noFocus: true }); flyToWorld(vn.x, vn.y, Math.max(cam.k * 1.5, 1.2), 550); }
      else selectNode(vn.ref.id, { noFocus: !isMobile() ? true : false });
      if (!isDouble && !isMobile()) focusNode(vn.ref.id, false); // sanft hinschwenken ohne Zoomsprung
    } else if (vn.group) {
      flyToWorld(vn.x, vn.y, Math.max(cam.k, 0.5), 550);
    }
  } else {
    if (isDouble) smoothZoomAt(ev.clientX, ev.clientY, 1.7, 260);
    else clearSelection();
  }
}

svg.addEventListener('pointercancel', ev => {
  pointers.delete(ev.pointerId);
  pinchStart = null; dragNode = null; panStart = null;
  svg.classList.remove('panning');
});

svg.addEventListener('dblclick', ev => ev.preventDefault());

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    clearSelection();
    $('#legend').classList.remove('open');
    $('#findings-panel').classList.remove('open');
    $('#search-results').classList.remove('open');
    $('#search-box').classList.remove('expanded');
  }
});

// --- Tooltips ---------------------------------------------------------------

function showTooltip(html, x, y) {
  tooltip.innerHTML = html;
  tooltip.classList.add('show');
  const r = tooltip.getBoundingClientRect();
  tooltip.style.left = Math.min(x + 14, window.innerWidth - r.width - 10) + 'px';
  tooltip.style.top = Math.min(y + 14, window.innerHeight - r.height - 10) + 'px';
}
function hideTooltip() { tooltip.classList.remove('show'); }

function showNodeTooltip(n, x, y) {
  showTooltip(
    '<div class="tt-title">' + esc(n.label) + '</div>' +
    '<div class="tt-sub">' + esc(n.path) + '</div>' +
    '<div class="tt-meta">' + esc(n.category) + ' · ' + fmtSize(n.size) +
    ' · ↓' + n.inDeg + ' ↑' + n.outDeg +
    (n.unused ? ' · <span style="color:var(--warn)">evtl. ungenutzt</span>' : '') + '</div>', x, y);
}

function showEdgeTooltip(e, x, y) {
  const a = nodeById.get(e.source) || vgNodeById.get(e.source);
  const b = nodeById.get(e.target) || vgNodeById.get(e.target);
  showTooltip(
    '<div class="tt-rel">' + esc(e.label || kindStyle(e.kind).label) + '</div>' +
    '<div class="tt-sub">' + esc((a ? a.label : e.source) + '  →  ' + (b ? b.label : e.target)) + '</div>', x, y);
}

// --- Suche: gruppierte Vorschläge (Dateien, Ordner, Funktionen, APIs) -------

const searchInput = $('#search');
const searchResults = $('#search-results');
let searchSel = 0;

const allDirs = [...new Set(D.nodes.filter(n => !n.virtual).map(n => n.dir))].sort();

/** Treffer suchen und nach Typ gruppieren. */
function collectHits(q) {
  const groups = { 'Dateien': [], 'Ordner': [], 'Funktionen': [], 'APIs & Dienste': [] };
  const seen = new Set();
  for (const dir of allDirs) {
    if (dir.toLowerCase().includes(q) && groups['Ordner'].length < 4) {
      groups['Ordner'].push({ type: 'dir', dir, label: dir === '/' ? '/ (Root)' : dir });
    }
  }
  for (const n of D.nodes) {
    if (seen.has(n.id)) continue;
    const apiish = n.virtual || ['Datenbank', 'Externer Dienst', 'Authentifizierung'].includes(n.category);
    if ((n.label + ' ' + n.path).toLowerCase().includes(q)) {
      const g = apiish ? 'APIs & Dienste' : 'Dateien';
      if (groups[g].length < 6) { groups[g].push({ type: 'node', id: n.id, label: n.label, dir: n.dir, cat: n.category }); seen.add(n.id); }
      continue;
    }
    const sym = n.symbols.find(s => s.toLowerCase().includes(q));
    if (sym && groups['Funktionen'].length < 6) {
      groups['Funktionen'].push({ type: 'node', id: n.id, label: sym + '()', dir: n.label, cat: n.category });
      seen.add(n.id);
      continue;
    }
    if ((n.desc + ' ' + n.envVars.join(' ')).toLowerCase().includes(q)) {
      const g = apiish ? 'APIs & Dienste' : 'Dateien';
      if (groups[g].length < 6) { groups[g].push({ type: 'node', id: n.id, label: n.label, dir: n.dir, cat: n.category }); seen.add(n.id); }
    }
  }
  return groups;
}

function hlMatch(label, q) {
  const i = label.toLowerCase().indexOf(q);
  if (i < 0) return esc(label);
  return esc(label.slice(0, i)) + '<b>' + esc(label.slice(i, i + q.length)) + '</b>' + esc(label.slice(i + q.length));
}

function runSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.classList.remove('open'); return; }
  const groups = collectHits(q);
  let html = '';
  let count = 0;
  for (const [gname, items] of Object.entries(groups)) {
    if (!items.length) continue;
    html += '<div class="rhead">' + gname + '</div>';
    for (const it of items) {
      const color = it.type === 'dir' ? '#8a94a6' : catColor(it.cat);
      html += '<div class="res" data-idx="' + count + '" data-type="' + it.type + '" data-ref="' +
        esc(it.type === 'dir' ? it.dir : it.id) + '">' +
        '<span class="dot" style="background:' + color + '"></span>' +
        '<span class="n">' + hlMatch(it.label, q) + '</span>' +
        '<span class="p">' + esc(it.dir || '') + '</span></div>';
      count++;
    }
  }
  searchSel = 0;
  searchResults.innerHTML = html || '<div class="res"><span class="n" style="color:var(--text-faint)">Keine Treffer</span></div>';
  searchResults.querySelectorAll('.res[data-ref]').forEach(el => {
    el.addEventListener('click', () => pickSearch(el.dataset.type, el.dataset.ref));
  });
  markSearchSel();
  searchResults.classList.add('open');
}

function markSearchSel() {
  searchResults.querySelectorAll('.res[data-ref]').forEach((el, i) =>
    el.classList.toggle('sel', i === searchSel));
}

function pickSearch(type, ref) {
  searchResults.classList.remove('open');
  $('#search-box').classList.remove('expanded');
  searchInput.blur();
  if (type === 'dir') {
    // Zu allen Dateien des Ordners fliegen
    if (state.view === 'mindmap') {
      const gid = 'dir:' + ref;
      if (vgNodeById.has(gid) && !state.expanded.has(gid)) toggleCluster(gid);
    }
    const members = VG.nodes.filter(vn => vn.ref && !vn.ref.virtual && vn.ref.dir === ref);
    if (members.length) {
      const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
      for (const m of members) {
        bb.x0 = Math.min(bb.x0, m.x - m.w); bb.x1 = Math.max(bb.x1, m.x + m.w);
        bb.y0 = Math.min(bb.y0, m.y - m.h); bb.y1 = Math.max(bb.y1, m.y + m.h);
      }
      flyToBounds(bb, 700, 1.1);
    }
    return;
  }
  if (!viewIdsForDataId(ref).length) switchView('deps');
  selectNode(ref); // fliegt automatisch hin und hebt hervor
}

searchInput.addEventListener('input', runSearch);
searchInput.addEventListener('keydown', ev => {
  const items = [...searchResults.querySelectorAll('.res[data-ref]')];
  if (ev.key === 'ArrowDown') searchSel = Math.min(items.length - 1, searchSel + 1);
  else if (ev.key === 'ArrowUp') searchSel = Math.max(0, searchSel - 1);
  else if (ev.key === 'Enter') {
    if (items[searchSel]) pickSearch(items[searchSel].dataset.type, items[searchSel].dataset.ref);
    return;
  } else return;
  ev.preventDefault();
  markSearchSel();
});
document.addEventListener('click', ev => {
  if (!ev.target.closest('#search-box') && !ev.target.closest('#btn-search-toggle')) {
    searchResults.classList.remove('open');
    if (isMobile()) $('#search-box').classList.remove('expanded');
  }
});
$('#btn-search-toggle').addEventListener('click', () => {
  const box = $('#search-box');
  box.classList.toggle('expanded');
  if (box.classList.contains('expanded')) setTimeout(() => searchInput.focus(), 60);
});

// --- Filter-UI --------------------------------------------------------------

function buildFilterUI() {
  const body = $('#filter-body');
  let html = '';

  html += '<div class="fgroup"><h4>Bereiche</h4>';
  for (const a of D.meta.areas) {
    const count = D.nodes.filter(n => n.area === a).length;
    html += '<label class="chk"><input type="checkbox" data-kind="area" value="' + esc(a) + '" checked>' +
      '<span>' + esc(a) + '</span><span class="count">' + count + '</span></label>';
  }
  html += '</div>';

  html += '<div class="fgroup"><h4>Kategorien</h4>';
  for (const c of D.meta.categories) {
    const count = D.nodes.filter(n => n.category === c).length;
    html += '<label class="chk"><input type="checkbox" data-kind="cat" value="' + esc(c) + '" checked>' +
      '<span class="dot" style="background:' + catColor(c) + '"></span>' +
      '<span>' + esc(c) + '</span><span class="count">' + count + '</span></label>';
  }
  html += '</div>';

  html += '<div class="fgroup"><h4>Spezialfilter</h4>' +
    '<label class="chk"><input type="checkbox" data-kind="onlyConnected"><span>Nur verbundene Dateien</span></label>' +
    '<label class="chk"><input type="checkbox" data-kind="onlyUnconnected"><span>Nur unverbundene Dateien</span></label>' +
    '<label class="chk"><input type="checkbox" data-kind="onlyFindings"><span>Nur Auffälligkeiten</span></label>' +
    '<label class="chk"><input type="checkbox" data-kind="onlyHubs"><span>Nur stark verknüpfte (≥ ' + HUB_MIN + ')</span></label>' +
    '</div>';

  body.innerHTML = html;
  body.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', () => {
      const k = inp.dataset.kind;
      if (k === 'area') { inp.checked ? state.filters.areas.add(inp.value) : state.filters.areas.delete(inp.value); }
      else if (k === 'cat') { inp.checked ? state.filters.cats.add(inp.value) : state.filters.cats.delete(inp.value); }
      else {
        state.filters[k] = inp.checked;
        if (k === 'onlyConnected' && inp.checked) { state.filters.onlyUnconnected = false; body.querySelector('[data-kind=onlyUnconnected]').checked = false; }
        if (k === 'onlyUnconnected' && inp.checked) { state.filters.onlyConnected = false; body.querySelector('[data-kind=onlyConnected]').checked = false; }
      }
      updateVisibility();
      applyHighlight();
    });
  });

  $('#btn-filter-reset').addEventListener('click', () => {
    state.filters.areas = new Set(D.meta.areas);
    state.filters.cats = new Set(D.meta.categories.concat(['Gruppe']));
    state.filters.onlyConnected = state.filters.onlyUnconnected = state.filters.onlyFindings = state.filters.onlyHubs = false;
    buildFilterUI();
    updateVisibility();
    applyHighlight();
  });
}

// --- Legende ----------------------------------------------------------------

function buildLegend() {
  const el = $('#legend');
  let html = '<h4>Dateitypen / Kategorien</h4>';
  for (const c of D.meta.categories) {
    html += '<div class="lrow"><span class="dot" style="background:' + catColor(c) + '"></span>' + esc(c) + '</div>';
  }
  html += '<hr><h4>Verbindungstypen</h4>';
  for (const k of ['import', 'script', 'style', 'asset', 'nav', 'api', 'auth', 'db-read', 'db-write', 'sw', 'config', 'deploy', 'generates']) {
    const s = kindStyle(k);
    html += '<div class="lrow"><span class="line' + (s.dashed ? ' dashed' : '') + '" style="border-color:' + s.color + '"></span>' + esc(s.label) + '</div>';
  }
  html += '<hr><div class="lrow">⚠ &nbsp;Mögliche Auffälligkeit am Knoten</div>' +
    '<div class="lrow">Gestrichelter Rahmen = Dienst/Datenbank (virtuell)</div>' +
    '<div class="lrow">▸/▾ = Cluster zu-/aufgeklappt (Mindmap)</div>';
  el.innerHTML = html;
}

// --- Auffälligkeiten-Panel --------------------------------------------------

function buildFindings() {
  const list = $('#findings-list');
  list.innerHTML = D.findings.map((f, i) =>
    '<div class="finding" data-i="' + i + '"><b>' + esc(f.type) + '</b><br>' + esc(f.text) + '</div>'
  ).join('') || '<div class="sub">Keine Auffälligkeiten erkannt.</div>';
  list.querySelectorAll('.finding').forEach(el => {
    el.addEventListener('click', () => {
      const f = D.findings[+el.dataset.i];
      const ids = f.nodes.filter(id => nodeById.has(id));
      if (!ids.length) return;
      for (const id of ids) ensureNodeVisible(id);
      state.selected = null;
      state.multiHl = new Set(ids.flatMap(id => viewIdsForDataId(id)));
      applyHighlight();
      const vns = [...state.multiHl].map(id => vgNodeById.get(id)).filter(Boolean);
      if (vns.length) {
        const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
        for (const m of vns) {
          bb.x0 = Math.min(bb.x0, m.x - m.w); bb.x1 = Math.max(bb.x1, m.x + m.w);
          bb.y0 = Math.min(bb.y0, m.y - m.h); bb.y1 = Math.max(bb.y1, m.y + m.h);
        }
        flyToBounds(bb, 700, 1.0);
      }
    });
  });
}

// --- Minimap ----------------------------------------------------------------

let mmScale = 1, mmOff = { x: 0, y: 0 };
let mmDirty = false;

function drawMinimap() {
  if (mmDirty) return;
  mmDirty = true;
  requestAnimationFrame(() => {
    mmDirty = false;
    const W = minimap.width, H = minimap.height;
    mmCtx.clearRect(0, 0, W, H);
    if (!VG) return;
    const bb = contentBBox(false);
    const pad = 12;
    mmScale = Math.min((W - pad * 2) / (bb.x1 - bb.x0 + 1), (H - pad * 2) / (bb.y1 - bb.y0 + 1));
    mmOff.x = pad - bb.x0 * mmScale + (W - pad * 2 - (bb.x1 - bb.x0) * mmScale) / 2;
    mmOff.y = pad - bb.y0 * mmScale + (H - pad * 2 - (bb.y1 - bb.y0) * mmScale) / 2;
    for (const n of VG.nodes) {
      if (!n._show) continue;
      mmCtx.fillStyle = n.color;
      mmCtx.globalAlpha = 0.85;
      mmCtx.fillRect(n.x * mmScale + mmOff.x - 1.5, n.y * mmScale + mmOff.y - 1.5, 3, 3);
    }
    mmCtx.globalAlpha = 1;
    strokeMinimapViewport();
  });
}

function strokeMinimapViewport() {
  const x0 = (-cam.x / cam.k) * mmScale + mmOff.x;
  const y0 = (-cam.y / cam.k) * mmScale + mmOff.y;
  const w = (svg.clientWidth / cam.k) * mmScale;
  const h = (svg.clientHeight / cam.k) * mmScale;
  mmCtx.strokeStyle = 'rgba(110,168,254,0.9)';
  mmCtx.lineWidth = 1.2;
  mmCtx.strokeRect(x0, y0, w, h);
  mmCtx.fillStyle = 'rgba(110,168,254,0.08)';
  mmCtx.fillRect(x0, y0, w, h);
}

function drawMinimapViewport() { drawMinimap(); }

minimap.addEventListener('pointerdown', ev => {
  minimap.setPointerCapture(ev.pointerId);
  const move = e => {
    const r = minimap.getBoundingClientRect();
    // Canvas kann per CSS skaliert sein (mobil) → in Canvas-Pixel umrechnen
    const px = (e.clientX - r.left) * (minimap.width / r.width);
    const py = (e.clientY - r.top) * (minimap.height / r.height);
    const wx = (px - mmOff.x) / mmScale;
    const wy = (py - mmOff.y) / mmScale;
    stopCamAnim(); stopInertia();
    cam.x = svg.clientWidth / 2 - wx * cam.k;
    cam.y = svg.clientHeight / 2 - wy * cam.k;
    applyTransform();
  };
  move(ev);
  const up = () => {
    minimap.removeEventListener('pointermove', move);
    minimap.removeEventListener('pointerup', up);
  };
  minimap.addEventListener('pointermove', move);
  minimap.addEventListener('pointerup', up);
});

// --- Statuszeile ------------------------------------------------------------

const VIEW_NAMES = { mindmap: 'Mindmap', deps: 'Abhängigkeitsgraph', folders: 'Ordnerstruktur', flow: 'Datenfluss', system: 'Systemübersicht' };

function updateStats() {
  const visible = VG.nodes.filter(n => n.ref && n._show).length;
  $('#stats').innerHTML =
    '<span><b>' + VIEW_NAMES[state.view] + '</b></span>' +
    '<span>Dateien: <b>' + D.meta.fileCount + '</b></span>' +
    '<span>Sichtbar: <b>' + visible + '</b></span>' +
    '<span>Beziehungen: <b>' + D.meta.edgeCount + '</b></span>' +
    '<span>Auffälligkeiten: <b>' + D.findings.length + '</b></span>' +
    '<span>Stand: <b>' + new Date(D.meta.generatedAt).toLocaleDateString('de-DE') + '</b></span>';
}

// --- Ansichten umschalten ---------------------------------------------------

function contentBBox(visibleOnly) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const n of VG.nodes) {
    if (visibleOnly && !n._show) continue;
    x0 = Math.min(x0, n.x - n.w); x1 = Math.max(x1, n.x + n.w);
    y0 = Math.min(y0, n.y - n.h); y1 = Math.max(y1, n.y + n.h);
  }
  for (const h of VG.hulls) {
    x0 = Math.min(x0, h.x); x1 = Math.max(x1, h.x + h.w);
    y0 = Math.min(y0, h.y); y1 = Math.max(y1, h.y + h.h);
  }
  if (x0 > x1) { x0 = -500; y0 = -500; x1 = 500; y1 = 500; }
  return { x0, y0, x1, y1 };
}

function fitView(animate) {
  const bb = contentBBox(true);
  if (animate) { flyToBounds(bb, 700); return; }
  const W = svg.clientWidth, H = svg.clientHeight;
  const k = Math.max(0.05, Math.min(3, Math.min(W / (bb.x1 - bb.x0 + 200), H / (bb.y1 - bb.y0 + 200))));
  setCam(W / 2 - (bb.x0 + bb.x1) / 2 * k, H / 2 - (bb.y0 + bb.y1) / 2 * k, k);
}

const BUILDERS = { mindmap: buildMindmap, deps: buildDeps, folders: buildFolders, flow: buildFlow, system: buildSystem };
const layoutCache = {};

function switchView(v, forceRebuild) {
  state.view = v;
  document.querySelectorAll('#views button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  if (forceRebuild) { delete layoutCache[v]; if (v === 'mindmap') state.expanded = new Set(['root']); }
  if (!layoutCache[v]) layoutCache[v] = BUILDERS[v]();
  VG = layoutCache[v];
  render({ animate: true });
  fitView(false);
  applyHighlight();
}

document.querySelectorAll('#views button').forEach(b => {
  b.addEventListener('click', () => switchView(b.dataset.view));
});

// --- Kopf-/Werkzeugleisten-Buttons ------------------------------------------

$('#btn-zoom-in').addEventListener('click', () => smoothZoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1.45, 260));
$('#btn-zoom-out').addEventListener('click', () => smoothZoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1 / 1.45, 260));
$('#btn-center').addEventListener('click', () => fitView(true));
$('#btn-reset').addEventListener('click', () => switchView(state.view, true));
$('#btn-fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});
$('#btn-filters').addEventListener('click', () => {
  $('#left').classList.toggle('hidden');
  $('#btn-filters').classList.toggle('active');
});
$('#btn-legend').addEventListener('click', () => {
  $('#legend').classList.toggle('open');
  $('#findings-panel').classList.remove('open');
  $('#detail').classList.remove('open');
  $('#minimap-wrap').classList.remove('shifted');
});
$('#btn-findings').addEventListener('click', () => {
  $('#findings-panel').classList.toggle('open');
  $('#legend').classList.remove('open');
  $('#detail').classList.remove('open');
  $('#minimap-wrap').classList.remove('shifted');
});
$('#d-close').addEventListener('click', clearSelection);

window.addEventListener('resize', () => { applyTransform(); drawMinimap(); });

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

$('#brand-repo').textContent = D.meta.repo + (D.meta.domain ? ' · ' + D.meta.domain : '');
initPinGate();
buildFilterUI();
buildLegend();
buildFindings();
// Mobil: Filterpanel initial zu, damit die Karte im Fokus ist
if (isMobile()) { $('#left').classList.add('hidden'); $('#btn-filters').classList.remove('active'); }
switchView('mindmap');

})();
