/* ===========================================================================
   Projekt-Map – interaktive Repository-Visualisierung
   Eigenständiger Renderer (SVG + Vanilla JS, keine externen Bibliotheken).
   Daten: repository-data.js (erzeugt von generate-project-map.js)
   =========================================================================== */

'use strict';

(function () {

const D = window.REPO_DATA;
if (!D) {
  document.body.innerHTML = '<p style="padding:2rem;font-family:monospace">repository-data.js fehlt – bitte zuerst <b>node project-map/generate-project-map.js</b> ausführen.</p>';
  return;
}

// ---------------------------------------------------------------------------
// Konstanten: Farben & Stile
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Datenindizes
// ---------------------------------------------------------------------------

const nodeById = new Map(D.nodes.map(n => [n.id, n]));
const outEdges = new Map(); // id -> edges[]
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
// DOM-Referenzen
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

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

const state = {
  view: 'mindmap',
  transform: { x: 0, y: 0, k: 1 },
  selected: null,          // node-id (Daten-Knoten)
  depth: 1,                // 1|2|3|Infinity
  hoverEdge: null,
  filters: {
    areas: new Set(D.meta.areas),
    cats: new Set(D.meta.categories.concat(['Gruppe'])),
    onlyConnected: false,
    onlyUnconnected: false,
    onlyFindings: false,
    onlyHubs: false,
  },
  multiHl: null,           // Set von ids (Findings-Hervorhebung)
};

let VG = null; // aktueller View-Graph { nodes, edges, hulls, texts }
let vgNodeById = new Map();

// ---------------------------------------------------------------------------
// View-Graph-Knoten bauen
// ---------------------------------------------------------------------------

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
  };
}

function makeGroupNode(id, label, sub, color, scale) {
  const w = Math.max(120, textW(label) * 1.25 + 60) * (scale || 1.2);
  return {
    id, ref: null, label, sub: sub || '', color: color || '#8a94a6',
    x: 0, y: 0, w, h: 46 * (scale || 1.2), group: true, actor: false, virtual: false, flag: false,
  };
}

// ---------------------------------------------------------------------------
// Layout 1: Mindmap (radial)
// ---------------------------------------------------------------------------

function buildMindmap() {
  const nodes = [];
  const edges = [];
  const root = makeGroupNode('root', 'landingpage', D.meta.domain || 'Repository', '#6ea8fe', 1.5);
  nodes.push(root);

  const areas = D.meta.areas.filter(a => D.nodes.some(n => n.area === a));
  const tree = new Map(); // areaId -> Map(dir -> files[])
  for (const a of areas) tree.set(a, new Map());
  for (const n of D.nodes) {
    const dirs = tree.get(n.area);
    const key = n.dir;
    if (!dirs.has(key)) dirs.set(key, []);
    dirs.get(key).push(n);
  }

  // Blattzahl je Bereich → Winkelanteile
  const leafCount = a => [...tree.get(a).values()].reduce((s, f) => s + f.length, 0);
  const totalLeaves = areas.reduce((s, a) => s + leafCount(a), 0);
  let ang = -Math.PI / 2;
  const R_AREA = 330, R_GROUP = 640, R_FILE = 950;

  for (const a of areas) {
    const span = (leafCount(a) / totalLeaves) * Math.PI * 2;
    const aMid = ang + span / 2;
    const areaNode = makeGroupNode('area:' + a, a, leafCount(a) + ' Dateien', '#8a94a6', 1.25);
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
      // Eigener Ordner-Zwischenknoten nur bei Unterordnern
      const isRootDir = dir === '/' || !dir.includes('/');
      if (!isRootDir || (dir !== '/' && dirs.length > 1)) {
        const gid = 'dir:' + dir;
        if (!nodes.some(n => n.id === gid)) {
          const g = makeGroupNode(gid, dir.split('/').pop() + '/', dir, '#7d8798', 1);
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
        const vn = makeVNode(f, { x: Math.cos(fa) * r, y: Math.sin(fa) * r, scale: 0.92 });
        nodes.push(vn);
        edges.push({ source: parentId, target: f.id, kind: 'tree', label: 'enthält' });
      });
      ang2 += span2;
    }
    ang += span;
  }

  // Echte Beziehungen sehr dezent mit einblenden (leuchten bei Auswahl auf)
  for (const e of D.edges) edges.push(Object.assign({ faint: true }, e));
  return { nodes, edges, hulls: [], texts: [] };
}

// ---------------------------------------------------------------------------
// Layout 2: Abhängigkeitsgraph (Force-Simulation)
// ---------------------------------------------------------------------------

function forceSim(nodes, edges, opts) {
  opts = opts || {};
  const n = nodes.length;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const springs = edges
    .filter(e => idx.has(e.source) && idx.has(e.target) && !e.faint)
    .map(e => ({ a: idx.get(e.source), b: idx.get(e.target) }));

  // Startpositionen: nach Bereich gruppiert auf einem Ring
  const areas = [...new Set(nodes.map(nd => nd.ref ? nd.ref.area : 'x'))];
  const anchor = new Map();
  areas.forEach((a, i) => {
    const t = (i / areas.length) * Math.PI * 2 - Math.PI / 2;
    anchor.set(a, { x: Math.cos(t) * (opts.anchorR || 620), y: Math.sin(t) * (opts.anchorR || 620) });
  });
  nodes.forEach((nd, i) => {
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
    // Abstoßung
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
    // Federn
    for (const s of springs) {
      const a = nodes[s.a], b = nodes[s.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = (d - SPRING_L) * SPRING_K * alpha;
      const ux = dx / d, uy = dy / d;
      a.vx += ux * f; a.vy += uy * f;
      b.vx -= ux * f; b.vy -= uy * f;
    }
    // Anker & Zentrum
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
  const nodes = D.nodes.map(n => makeVNode(n, {
    scale: 1 + Math.min(0.5, degree(n.id) / 40),
  }));
  const edges = D.edges.map(e => Object.assign({}, e));
  forceSim(nodes, edges, {});
  return { nodes, edges, hulls: [], texts: [] };
}

// ---------------------------------------------------------------------------
// Layout 3: Ordnerstruktur (Cluster)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Layout 4: Datenfluss (Lanes)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Layout 5: Systemübersicht (aggregiert)
// ---------------------------------------------------------------------------

function buildSystem() {
  const nodes = [];
  const mapTo = new Map(); // data-node-id -> system-node-id

  const areas = D.meta.areas.filter(a => a !== 'Externe Dienste & Daten');
  for (const a of areas) {
    const count = D.nodes.filter(n => n.area === a && !n.virtual).length;
    const g = makeGroupNode('sys:' + a, a, count + ' Dateien', '#6ea8fe', 1.5);
    nodes.push(g);
    for (const n of D.nodes) if (n.area === a && !n.virtual) mapTo.set(n.id, g.id);
  }
  // Dienste, Datenbank, Auth als echte Knoten
  for (const n of D.nodes) {
    if (n.virtual) {
      nodes.push(makeVNode(n, { scale: 1.15 }));
      mapTo.set(n.id, n.id);
    }
  }
  // Zentrale Dateien (Hubs) einzeln zeigen
  const hubs = D.nodes.filter(n => !n.virtual && degree(n.id) >= 12).slice(0, 8);
  for (const h of hubs) {
    nodes.push(makeVNode(h, { scale: 1.05 }));
    mapTo.set(h.id, h.id);
  }

  // Kanten aggregieren
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

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function edgePath(a, b) {
  // Leichte Krümmung; Endpunkt am Kartenrand des Ziels
  const dx = b.x - a.x, dy = b.y - a.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / d, uy = dy / d;
  // Schnitt mit Ziel-Rechteck (angenähert)
  const tx = Math.abs(ux) > 0.0001 ? (b.w / 2 + 6) / Math.abs(ux) : 1e9;
  const ty = Math.abs(uy) > 0.0001 ? (b.h / 2 + 6) / Math.abs(uy) : 1e9;
  const cut = Math.min(tx, ty, d);
  const ex = b.x - ux * cut, ey = b.y - uy * cut;
  const sx = a.x + ux * Math.min(Math.abs(ux) > 0.0001 ? (a.w / 2 + 4) / Math.abs(ux) : 1e9,
                                 Math.abs(uy) > 0.0001 ? (a.h / 2 + 4) / Math.abs(uy) : 1e9, d);
  const sy = a.y + uy * Math.min(Math.abs(ux) > 0.0001 ? (a.w / 2 + 4) / Math.abs(ux) : 1e9,
                                 Math.abs(uy) > 0.0001 ? (a.h / 2 + 4) / Math.abs(uy) : 1e9, d);
  const mx = (sx + ex) / 2 - dy / d * Math.min(40, d * 0.08);
  const my = (sy + ey) / 2 + dx / d * Math.min(40, d * 0.08);
  return 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) +
         ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) +
         ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
}

function render() {
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
    layerEdges.appendChild(p);
    e._el = p;
    // unsichtbare Hover-Fläche
    const hit = svgEl('path', { class: 'edge hit', d: p.getAttribute('d'), stroke: '#fff' });
    hit.style.pointerEvents = 'stroke';
    hit.dataset.ei = i;
    layerEdgeHits.appendChild(hit);
    e._hit = hit;
  });

  for (const n of VG.nodes) {
    const g = svgEl('g', { class: 'node' + (n.virtual ? ' virtual' : '') + (n.group ? ' group' : '') + (n.actor ? ' actor' : '') });
    g.dataset.id = n.id;
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
    if (n.flag) {
      const f = svgEl('text', { class: 'badge-flag', x: n.w / 2 - 16, y: -n.h / 2 + 13, fill: '#ffd166' });
      f.textContent = '⚠';
      g.appendChild(f);
    }
    g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
    layerNodes.appendChild(g);
    n._el = g;
  }

  applyFilters();
  applyHighlight();
  drawMinimap();
}

function updateNodePos(n) {
  n._el.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
  for (const e of VG.edges) {
    if (!e._el) continue;
    if (e.source === n.id || e.target === n.id) {
      const d = edgePath(vgNodeById.get(e.source), vgNodeById.get(e.target));
      e._el.setAttribute('d', d);
      if (e._hit) e._hit.setAttribute('d', d);
    }
  }
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

function nodeVisible(vn) {
  const n = vn.ref;
  if (!n) return true; // Gruppen-/Actor-Knoten immer sichtbar
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

function applyFilters() {
  const hidden = new Set();
  for (const vn of VG.nodes) {
    const vis = nodeVisible(vn);
    vn._el.style.display = vis ? '' : 'none';
    if (!vis) hidden.add(vn.id);
  }
  for (const e of VG.edges) {
    if (!e._el) continue;
    const off = hidden.has(e.source) || hidden.has(e.target);
    e._el.style.display = off ? 'none' : '';
    if (e._hit) e._hit.style.display = off ? 'none' : '';
  }
  updateStats();
  drawMinimap();
}

// ---------------------------------------------------------------------------
// Auswahl & Hervorhebung
// ---------------------------------------------------------------------------

function reachSet(startIds, depth, dir) {
  // BFS über sichtbare Kanten; dir: 'out' | 'in'
  const lvl = new Map();
  let frontier = startIds.filter(id => vgNodeById.has(id));
  frontier.forEach(id => lvl.set(id, 0));
  for (let d = 0; d < depth && frontier.length; d++) {
    const next = [];
    for (const e of VG.edges) {
      if (!e._el || e._el.style.display === 'none' || e.kind === 'tree') continue;
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

/** Daten-Knoten-ID → im aktuellen View vorhandene VG-Knoten-IDs. */
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

// ---------------------------------------------------------------------------
// Detailpanel
// ---------------------------------------------------------------------------

function fmtSize(b) {
  if (!b) return '–';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

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

  // Verbindungstiefe + Weiterverfolgen
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

  // Interaktionen im Panel
  $('#d-body').querySelectorAll('.dep-item').forEach(el => {
    el.addEventListener('click', () => { selectNode(el.dataset.id); focusNode(el.dataset.id); });
  });
  $('#d-body').querySelectorAll('.depth-btn').forEach(el => {
    el.addEventListener('click', () => {
      state.depth = el.dataset.depth === 'inf' ? Infinity : +el.dataset.depth;
      selectNode(dataId, { noFocus: true });
    });
  });
  const fb = $('#btn-follow');
  if (fb) fb.addEventListener('click', () => {
    state.depth = state.depth === Infinity ? Infinity : Math.min(3, state.depth + 1) === state.depth ? Infinity : state.depth + 1;
    selectNode(dataId, { noFocus: true });
  });

  $('#detail').classList.add('open');
  $('#minimap-wrap').classList.add('shifted');
  $('#legend').classList.remove('open');
  $('#findings-panel').classList.remove('open');
  applyHighlight();
  if (!opts || !opts.noFocus) focusNode(dataId, true);
}

// ---------------------------------------------------------------------------
// Transformation (Pan/Zoom)
// ---------------------------------------------------------------------------

function applyTransform() {
  const t = state.transform;
  viewportG.setAttribute('transform', 'translate(' + t.x + ',' + t.y + ') scale(' + t.k + ')');
  // Rasterhintergrund mitbewegen
  const grid = $('#grid-bg');
  grid.setAttribute('transform', 'translate(' + (t.x % (28 * t.k)) + ',' + (t.y % (28 * t.k)) + ') scale(' + t.k + ')');
  drawMinimapViewport();
}

function zoomAt(cx, cy, factor) {
  const t = state.transform;
  const k = Math.max(0.04, Math.min(4, t.k * factor));
  const f = k / t.k;
  t.x = cx - (cx - t.x) * f;
  t.y = cy - (cy - t.y) * f;
  t.k = k;
  applyTransform();
}

function contentBBox(visibleOnly) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const n of VG.nodes) {
    if (visibleOnly && n._el && n._el.style.display === 'none') continue;
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

function fitView() {
  const bb = contentBBox(true);
  const W = svg.clientWidth, H = svg.clientHeight;
  const k = Math.min(3, Math.min(W / (bb.x1 - bb.x0 + 200), H / (bb.y1 - bb.y0 + 200)));
  state.transform.k = Math.max(0.05, k);
  state.transform.x = W / 2 - (bb.x0 + bb.x1) / 2 * state.transform.k;
  state.transform.y = H / 2 - (bb.y0 + bb.y1) / 2 * state.transform.k;
  applyTransform();
}

function focusNode(dataId, zoom) {
  const ids = viewIdsForDataId(dataId);
  if (!ids.length) return;
  const vn = vgNodeById.get(ids[0]);
  const W = svg.clientWidth, H = svg.clientHeight;
  const k = zoom ? Math.max(state.transform.k, 0.85) : state.transform.k;
  state.transform.k = k;
  state.transform.x = W / 2 - vn.x * k - (window.innerWidth > 900 ? 170 : 0) * ($('#detail').classList.contains('open') ? 1 : 0);
  state.transform.y = H / 2 - vn.y * k;
  applyTransform();
}

// ---------------------------------------------------------------------------
// Minimap
// ---------------------------------------------------------------------------

let mmScale = 1, mmOff = { x: 0, y: 0 };

function drawMinimap() {
  const W = minimap.width, H = minimap.height;
  mmCtx.clearRect(0, 0, W, H);
  const bb = contentBBox(false);
  const pad = 12;
  mmScale = Math.min((W - pad * 2) / (bb.x1 - bb.x0 + 1), (H - pad * 2) / (bb.y1 - bb.y0 + 1));
  mmOff.x = pad - bb.x0 * mmScale + (W - pad * 2 - (bb.x1 - bb.x0) * mmScale) / 2;
  mmOff.y = pad - bb.y0 * mmScale + (H - pad * 2 - (bb.y1 - bb.y0) * mmScale) / 2;
  for (const n of VG.nodes) {
    if (n._el && n._el.style.display === 'none') continue;
    mmCtx.fillStyle = n.color;
    mmCtx.globalAlpha = 0.85;
    mmCtx.fillRect(n.x * mmScale + mmOff.x - 1.5, n.y * mmScale + mmOff.y - 1.5, 3, 3);
  }
  mmCtx.globalAlpha = 1;
  drawMinimapViewport(true);
}

let mmViewportOnly = null;
function drawMinimapViewport(skipRedraw) {
  if (!skipRedraw) {
    // Viewport-Rechteck neu zeichnen ohne alles zu rastern: einfach neu zeichnen
    const W = minimap.width, H = minimap.height;
    mmCtx.clearRect(0, 0, W, H);
    const bbDummy = null;
    // komplettes Neuzeichnen ist billig genug (≤ 150 Punkte)
    drawMinimap();
    return;
  }
  const t = state.transform;
  const x0 = (-t.x / t.k) * mmScale + mmOff.x;
  const y0 = (-t.y / t.k) * mmScale + mmOff.y;
  const w = (svg.clientWidth / t.k) * mmScale;
  const h = (svg.clientHeight / t.k) * mmScale;
  mmCtx.strokeStyle = 'rgba(110,168,254,0.9)';
  mmCtx.lineWidth = 1.2;
  mmCtx.strokeRect(x0, y0, w, h);
  mmCtx.fillStyle = 'rgba(110,168,254,0.08)';
  mmCtx.fillRect(x0, y0, w, h);
}

minimap.addEventListener('pointerdown', ev => {
  minimap.setPointerCapture(ev.pointerId);
  const move = e => {
    const r = minimap.getBoundingClientRect();
    const wx = (e.clientX - r.left - mmOff.x) / mmScale;
    const wy = (e.clientY - r.top - mmOff.y) / mmScale;
    state.transform.x = svg.clientWidth / 2 - wx * state.transform.k;
    state.transform.y = svg.clientHeight / 2 - wy * state.transform.k;
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

// ---------------------------------------------------------------------------
// Maus-/Touch-Interaktion auf der Bühne
// ---------------------------------------------------------------------------

const pointers = new Map();
let panStart = null, dragNode = null, pinchStart = null;

svg.addEventListener('wheel', ev => {
  ev.preventDefault();
  zoomAt(ev.clientX, ev.clientY, Math.pow(1.0016, -ev.deltaY));
}, { passive: false });

svg.addEventListener('pointerdown', ev => {
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), k: state.transform.k };
    panStart = null; dragNode = null;
    return;
  }
  const nodeG = ev.target.closest('.node');
  if (nodeG) {
    const vn = vgNodeById.get(nodeG.dataset.id);
    dragNode = { vn, sx: ev.clientX, sy: ev.clientY, ox: vn.x, oy: vn.y, moved: false };
    svg.setPointerCapture(ev.pointerId);
  } else {
    panStart = { sx: ev.clientX, sy: ev.clientY, tx: state.transform.x, ty: state.transform.y };
    svg.classList.add('panning');
    svg.setPointerCapture(ev.pointerId);
  }
});

svg.addEventListener('pointermove', ev => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinchStart && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const target = pinchStart.k * d / pinchStart.d;
    zoomAt(cx, cy, target / state.transform.k);
    return;
  }
  if (dragNode) {
    const dx = (ev.clientX - dragNode.sx) / state.transform.k;
    const dy = (ev.clientY - dragNode.sy) / state.transform.k;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragNode.moved = true;
    dragNode.vn.x = dragNode.ox + dx;
    dragNode.vn.y = dragNode.oy + dy;
    updateNodePos(dragNode.vn);
    drawMinimap();
    return;
  }
  if (panStart) {
    state.transform.x = panStart.tx + (ev.clientX - panStart.sx);
    state.transform.y = panStart.ty + (ev.clientY - panStart.sy);
    applyTransform();
    return;
  }
  // Hover-Effekte
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
  pinchStart = null;
  if (dragNode) {
    if (!dragNode.moved) {
      const vn = dragNode.vn;
      if (vn.ref) selectNode(vn.ref.id, { noFocus: true });
      else if (vn.group) focusNode(vn.id);
    }
    dragNode = null;
  }
  if (panStart) { panStart = null; svg.classList.remove('panning'); }
});

svg.addEventListener('pointercancel', ev => {
  pointers.delete(ev.pointerId);
  pinchStart = null; dragNode = null; panStart = null;
  svg.classList.remove('panning');
});

svg.addEventListener('dblclick', ev => {
  if (!ev.target.closest('.node')) clearSelection();
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    clearSelection();
    $('#legend').classList.remove('open');
    $('#findings-panel').classList.remove('open');
    $('#search-results').classList.remove('open');
  }
});

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Suche
// ---------------------------------------------------------------------------

const searchIndex = D.nodes.map(n => ({
  id: n.id,
  hay: (n.label + ' ' + n.path + ' ' + n.category + ' ' + n.desc + ' ' +
        n.symbols.join(' ') + ' ' + n.envVars.join(' ') + ' ' + n.ext).toLowerCase(),
}));

const searchInput = $('#search');
const searchResults = $('#search-results');
let searchSel = 0;

function runSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.classList.remove('open'); return; }
  const terms = q.split(/\s+/);
  const hits = [];
  for (const it of searchIndex) {
    if (terms.every(t => it.hay.includes(t))) {
      hits.push(it.id);
      if (hits.length >= 14) break;
    }
  }
  searchSel = 0;
  if (!hits.length) {
    searchResults.innerHTML = '<div class="res"><span class="n" style="color:var(--text-faint)">Keine Treffer</span></div>';
  } else {
    searchResults.innerHTML = hits.map((id, i) => {
      const n = nodeById.get(id);
      return '<div class="res' + (i === 0 ? ' sel' : '') + '" data-id="' + esc(id) + '">' +
        '<span class="dot" style="background:' + catColor(n.category) + '"></span>' +
        '<span class="n">' + esc(n.label) + '</span>' +
        '<span class="p">' + esc(n.dir) + '</span></div>';
    }).join('');
    searchResults.querySelectorAll('.res[data-id]').forEach(el => {
      el.addEventListener('click', () => pickSearch(el.dataset.id));
    });
  }
  searchResults.classList.add('open');
}

function pickSearch(id) {
  searchResults.classList.remove('open');
  // Falls Knoten im aktuellen View nicht vorhanden → Abhängigkeits-Ansicht
  if (!viewIdsForDataId(id).length) switchView('deps');
  selectNode(id);
}

searchInput.addEventListener('input', runSearch);
searchInput.addEventListener('keydown', ev => {
  const items = [...searchResults.querySelectorAll('.res[data-id]')];
  if (ev.key === 'ArrowDown') { searchSel = Math.min(items.length - 1, searchSel + 1); }
  else if (ev.key === 'ArrowUp') { searchSel = Math.max(0, searchSel - 1); }
  else if (ev.key === 'Enter') { if (items[searchSel]) pickSearch(items[searchSel].dataset.id); return; }
  else return;
  ev.preventDefault();
  items.forEach((el, i) => el.classList.toggle('sel', i === searchSel));
});
document.addEventListener('click', ev => {
  if (!ev.target.closest('#search-box')) searchResults.classList.remove('open');
});

// ---------------------------------------------------------------------------
// Filter-UI
// ---------------------------------------------------------------------------

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
      applyFilters();
      applyHighlight();
    });
  });

  $('#btn-filter-reset').addEventListener('click', () => {
    state.filters.areas = new Set(D.meta.areas);
    state.filters.cats = new Set(D.meta.categories.concat(['Gruppe']));
    state.filters.onlyConnected = state.filters.onlyUnconnected = state.filters.onlyFindings = state.filters.onlyHubs = false;
    buildFilterUI();
    applyFilters();
    applyHighlight();
  });
}

// ---------------------------------------------------------------------------
// Legende
// ---------------------------------------------------------------------------

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
    '<div class="lrow">Gestrichelter Rahmen = Dienst/Datenbank (virtuell)</div>';
  el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Auffälligkeiten-Panel
// ---------------------------------------------------------------------------

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
      state.selected = null;
      state.multiHl = new Set(ids.flatMap(id => viewIdsForDataId(id)));
      applyHighlight();
      focusNode(ids[0], true);
    });
  });
}

// ---------------------------------------------------------------------------
// Statuszeile
// ---------------------------------------------------------------------------

const VIEW_NAMES = { mindmap: 'Mindmap', deps: 'Abhängigkeitsgraph', folders: 'Ordnerstruktur', flow: 'Datenfluss', system: 'Systemübersicht' };

function updateStats() {
  const visible = VG.nodes.filter(n => n.ref && n._el && n._el.style.display !== 'none').length;
  $('#stats').innerHTML =
    '<span><b>' + VIEW_NAMES[state.view] + '</b></span>' +
    '<span>Dateien: <b>' + D.meta.fileCount + '</b></span>' +
    '<span>Sichtbar: <b>' + visible + '</b></span>' +
    '<span>Beziehungen: <b>' + D.meta.edgeCount + '</b></span>' +
    '<span>Auffälligkeiten: <b>' + D.findings.length + '</b></span>' +
    '<span>Stand: <b>' + new Date(D.meta.generatedAt).toLocaleDateString('de-DE') + '</b></span>';
}

// ---------------------------------------------------------------------------
// Ansichten umschalten
// ---------------------------------------------------------------------------

const BUILDERS = { mindmap: buildMindmap, deps: buildDeps, folders: buildFolders, flow: buildFlow, system: buildSystem };
const layoutCache = {};

function switchView(v, forceRebuild) {
  state.view = v;
  document.querySelectorAll('#views button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  if (forceRebuild) delete layoutCache[v];
  if (!layoutCache[v]) layoutCache[v] = BUILDERS[v]();
  VG = layoutCache[v];
  render();
  fitView();
  applyHighlight();
}

document.querySelectorAll('#views button').forEach(b => {
  b.addEventListener('click', () => switchView(b.dataset.view));
});

// ---------------------------------------------------------------------------
// Kopf-/Werkzeugleisten-Buttons
// ---------------------------------------------------------------------------

$('#btn-zoom-in').addEventListener('click', () => zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1.35));
$('#btn-zoom-out').addEventListener('click', () => zoomAt(svg.clientWidth / 2, svg.clientHeight / 2, 1 / 1.35));
$('#btn-center').addEventListener('click', fitView);
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
buildFilterUI();
buildLegend();
buildFindings();
switchView('mindmap');

})();
