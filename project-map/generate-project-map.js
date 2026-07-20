#!/usr/bin/env node
/**
 * generate-project-map.js
 * ---------------------------------------------------------------------------
 * Analysiert das gesamte Repository (eine Ebene über diesem Ordner) und
 * erzeugt daraus `repository-data.js` für die interaktive Projekt-Map.
 *
 * Aufruf:   node project-map/generate-project-map.js
 *
 * Das Skript benötigt nur Node.js (keine Abhängigkeiten). Es liest Dateien
 * ausschließlich lesend und schreibt nur in den Ordner project-map/.
 *
 * Sicherheit: Es werden NIEMALS Werte von Schlüsseln/Tokens übernommen –
 * nur Namen von Environment-Variablen und Konfigurationskonstanten.
 * ---------------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(__dirname, 'repository-data.js');

/** Ordner, die nicht als einzelne Dateien visualisiert werden. */
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor',
  'project-map', // die Map selbst nicht mitvisualisieren
]);

const TEXT_EXTS = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.json', '.md', '.txt', '.xml', '.svg', '.webmanifest', '.ics', '.yml', '.yaml',
]);

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.avif']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const FONT_EXTS = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot']);

/** Muster, die auf Secrets hindeuten – Werte solcher Zeilen werden nie übernommen. */
const SECRET_VALUE_RE = /(eyJ[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN)/;

// ---------------------------------------------------------------------------
// Datei-Sammlung
// ---------------------------------------------------------------------------

/** @type {Map<string, {rel:string, abs:string, size:number, ext:string}>} */
const files = new Map();
let dirCount = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.gitignore' && e.isDirectory()) {
      if (e.name === '.github') { /* Workflows mitnehmen */ } else continue;
    }
    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.has(e.name)) continue;
      dirCount++;
      walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      const abs = path.join(dir, e.name);
      const rel = path.relative(REPO_ROOT, abs).split(path.sep).join('/');
      if (rel.startsWith('project-map/')) continue;
      const st = fs.statSync(abs);
      files.set(rel, { rel, abs, size: st.size, ext: path.extname(e.name).toLowerCase() });
    }
  }
}
walk(REPO_ROOT);

/** Case-insensitive Lookup-Tabelle (Referenzen wie logo.png vs logo.PNG). */
const lowerIndex = new Map();
for (const rel of files.keys()) lowerIndex.set(rel.toLowerCase(), rel);

function readText(rel) {
  const f = files.get(rel);
  if (!f || !TEXT_EXTS.has(f.ext)) return null;
  try { return fs.readFileSync(f.abs, 'utf8'); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Kategorisierung
// ---------------------------------------------------------------------------

function areaOf(rel) {
  if (rel.startsWith('fba-rechner-video/')) return 'FBA-Video (Remotion)';
  if (rel.startsWith('fba-rechner/')) return 'FBA-Rechner';
  if (rel.startsWith('mopedplaner/')) return 'Mopedplaner';
  return 'Website (Root)';
}

function categorize(rel, ext, content) {
  const base = path.basename(rel).toLowerCase();
  if (base === 'cname' || base === 'robot.txt' || base === 'robots.txt' || base === 'sitemap.xml') return 'Deployment/SEO';
  if (base === 'manifest.json' || base === 'manifest.webmanifest' || base.startsWith('sw.js') || base === 'sw.js') return 'PWA';
  if (base === 'package.json' || base === 'package-lock.json' || base === 'tsconfig.json' ||
      base === 'remotion.config.ts' || base === '.gitignore') return 'Konfiguration';
  if (ext === '.md') return 'Dokumentation';
  if (IMAGE_EXTS.has(ext)) return 'Asset: Bild';
  if (VIDEO_EXTS.has(ext)) return 'Asset: Video';
  if (AUDIO_EXTS.has(ext)) return 'Asset: Audio';
  if (FONT_EXTS.has(ext)) return 'Asset: Schrift';
  if (ext === '.ics') return 'Asset: Kalender';
  if (ext === '.css') return 'Styles';
  if (ext === '.html' || ext === '.htm') return 'Seite';
  if (ext === '.tsx' || ext === '.jsx') return 'Komponente';
  if (ext === '.ts') return 'Skript (TS)';
  if (rel.includes('/data/')) return 'Daten-Modul';
  if (rel.includes('/views/')) return 'View-Modul';
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'Skript';
  if (ext === '.json') return 'Konfiguration';
  if (base === '.keep') return 'Platzhalter';
  return 'Sonstiges';
}

/** Kurzbeschreibung aus <title>, erstem Kommentarblock oder Heuristik. */
function describe(rel, ext, content) {
  if (content) {
    if (ext === '.html' || ext === '.htm') {
      const t = content.match(/<title>([^<]+)<\/title>/i);
      if (t) return 'Seite: ' + t[1].trim();
    }
    const jsdoc = content.match(/\/\*\*?[\s\r\n*]*(?:=+[\s\S]*?\n\s*\*\s*)?([^\n*{@][^\n]{0,140})/);
    if (jsdoc && (ext === '.js' || ext === '.mjs' || ext === '.ts' || ext === '.tsx' || ext === '.css')) {
      const line = jsdoc[1].replace(/\*\/?\s*$/, '').trim();
      if (line && !SECRET_VALUE_RE.test(line)) return line;
    }
    if (ext === '.json') {
      try {
        const j = JSON.parse(content);
        if (j.description) return j.description;
        if (j.name) return 'JSON: ' + j.name;
      } catch { /* ignore */ }
    }
    if (ext === '.md') {
      const h = content.match(/^#\s+(.+)$/m);
      if (h) return 'Doku: ' + h[1].trim();
    }
  }
  const base = path.basename(rel);
  if (IMAGE_EXTS.has(ext)) return 'Bilddatei ' + base;
  if (VIDEO_EXTS.has(ext)) return 'Videodatei ' + base;
  if (AUDIO_EXTS.has(ext)) return 'Audiodatei ' + base;
  if (FONT_EXTS.has(ext)) return 'Webfont ' + base;
  return base;
}

/** Zentrale Funktions-/Klassen-/Exportnamen extrahieren (nur Namen, kein Code). */
function extractSymbols(content) {
  if (!content) return [];
  const out = new Set();
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /export\s+const\s+([A-Za-z_$][\w$]*)/g,
    /class\s+([A-Za-z_$][\w$]*)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) && out.size < 24) out.add(m[1]);
  }
  return [...out];
}

/** Environment-Variablen-NAMEN (niemals Werte). */
function extractEnvVars(content) {
  if (!content) return [];
  const out = new Set();
  let m;
  const re = /process\.env\.([A-Z][A-Z0-9_]+)/g;
  while ((m = re.exec(content))) out.add(m[1]);
  // Client-seitige Konfigurationskonstanten (nur Namen erfassen)
  if (/SUPABASE_URL\s*[:=]/.test(content)) out.add('SUPABASE_URL');
  if (/SUPABASE_(ANON_)?KEY\s*[:=]/.test(content)) out.add('SUPABASE_ANON_KEY');
  return [...out];
}

// ---------------------------------------------------------------------------
// Referenz-Extraktion
// ---------------------------------------------------------------------------

/** @type {Array<{source:string,target:string,kind:string,label:string}>} */
const edges = [];
const brokenRefs = [];
const externalHits = new Map(); // hostname -> Set(source rel)

function addEdge(source, target, kind, label) {
  if (source === target) return;
  if (!edges.some(e => e.source === source && e.target === target && e.kind === kind)) {
    edges.push({ source, target, kind, label });
  }
}

/** Relative/absolute Referenz auf eine Repo-Datei auflösen. */
function resolveRef(fromRel, ref) {
  let r = ref.split('#')[0].split('?')[0].trim();
  if (!r || r.startsWith('data:') || r.startsWith('javascript:') ||
      r.startsWith('mailto:') || r.startsWith('tel:')) return null;
  if (/^https?:\/\//i.test(r)) return { external: r };
  let cand;
  if (r.startsWith('/')) cand = r.slice(1);
  else cand = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), r));
  if (cand === '' || cand === '.') cand = 'index.html';
  const tries = [cand, cand + '.html', cand.replace(/\/$/, '') + '/index.html',
    cand + '.js', cand + '.ts', cand + '.tsx', cand + '.jsx', cand + '.mjs'];
  for (const t of tries) {
    const hit = lowerIndex.get(t.toLowerCase());
    if (hit) return { file: hit };
  }
  return { missing: cand };
}

const NS_URLS = /(w3\.org|schema\.org|dorfdulliracing\.de)/; // eigene Domain nicht als externer Dienst

function handleRef(fromRel, ref, kind, label) {
  const res = resolveRef(fromRel, ref);
  if (!res) return;
  if (res.external) {
    try {
      const host = new URL(res.external).hostname;
      if (NS_URLS.test(host)) return;
      if (!externalHits.has(host)) externalHits.set(host, new Map());
      const m = externalHits.get(host);
      if (!m.has(fromRel)) m.set(fromRel, kind);
    } catch { /* ignore */ }
    return;
  }
  if (res.missing) {
    // Nur wahrscheinliche lokale Dateien als „fehlend“ werten
    if (/\.[a-z0-9]{2,5}$/i.test(res.missing) || !res.missing.includes('.')) {
      brokenRefs.push({ source: fromRel, ref: res.missing, kind });
    }
    return;
  }
  addEdge(fromRel, res.file, kind, label);
}

// --- HTML-Analyse -----------------------------------------------------------

function analyzeHtml(rel, content) {
  const tagRe = /<(a|link|script|img|video|audio|source|iframe|form)\b([^>]*)>/gi;
  let m;
  while ((m = tagRe.exec(content))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const get = (name) => {
      const am = attrs.match(new RegExp(name + '\\s*=\\s*["\']([^"\']+)["\']', 'i'));
      return am ? am[1] : null;
    };
    const src = get('src');
    const href = get('href');
    const poster = get('poster');
    const relAttr = (get('rel') || '').toLowerCase();
    if (tag === 'script' && src) handleRef(rel, src, 'script', 'bindet Skript ein');
    else if (tag === 'link' && href) {
      if (relAttr.includes('stylesheet')) handleRef(rel, href, 'style', 'nutzt Styles');
      else if (relAttr.includes('manifest')) handleRef(rel, href, 'config', 'nutzt Manifest');
      else if (relAttr.includes('icon')) handleRef(rel, href, 'asset', 'lädt Icon');
      else handleRef(rel, href, 'asset', 'referenziert');
    } else if (tag === 'a' && href) handleRef(rel, href, 'nav', 'navigiert zu');
    else if ((tag === 'img' || tag === 'source' || tag === 'audio' || tag === 'video' || tag === 'iframe') && src)
      handleRef(rel, src, 'asset', 'lädt Asset');
    if (poster) handleRef(rel, poster, 'asset', 'lädt Poster');
  }
  // Meta-Bilder (og:image etc.)
  const metaRe = /<meta[^>]+content=["']([^"']+\.(?:png|jpe?g|webp|gif))["'][^>]*>/gi;
  while ((m = metaRe.exec(content))) {
    const u = m[1];
    if (/^https?:\/\/dorfdulliracing\.de\//.test(u)) handleRef(rel, u.replace(/^https?:\/\/dorfdulliracing\.de/, ''), 'asset', 'Social-Preview');
  }
  analyzeScriptText(rel, content);
}

// --- JS/TS-Analyse ----------------------------------------------------------

function analyzeScriptText(rel, content) {
  let m;
  const importRe = /import\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']/g;
  while ((m = importRe.exec(content))) {
    const spec = m[1];
    if (spec.startsWith('.') || spec.startsWith('/')) handleRef(rel, spec, 'import', 'importiert');
    // Bare specifiers (react, remotion, node:*) → Package-Abhängigkeit, unten aggregiert
  }
  const requireRe = /require\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = requireRe.exec(content))) {
    if (m[1].startsWith('.')) handleRef(rel, m[1], 'import', 'importiert (require)');
  }
  const dynRe = /import\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = dynRe.exec(content))) {
    if (m[1].startsWith('.')) handleRef(rel, m[1], 'import', 'importiert (dynamisch)');
  }
  // Service Worker: Pfad ist relativ zur einbindenden Seite, nicht zum Skript –
  // bei fehlgeschlagener Auflösung deshalb übergeordnete Ordner probieren.
  const swRe = /serviceWorker\.register\(\s*["']([^"']+)["']/g;
  while ((m = swRe.exec(content))) {
    let res = resolveRef(rel, m[1]);
    if (res && res.missing) {
      let dir = path.posix.dirname(rel);
      while (dir && dir !== '.' && res.missing) {
        dir = path.posix.dirname(dir);
        const t = (dir === '.' ? '' : dir + '/') + m[1].replace(/^\.\//, '').replace(/^\//, '');
        const hit = lowerIndex.get(t.toLowerCase());
        if (hit) { res = { file: hit }; break; }
      }
    }
    if (res && res.file) addEdge(rel, res.file, 'sw', 'registriert Service Worker');
    else handleRef(rel, m[1], 'sw', 'registriert Service Worker');
  }

  // JS-Navigation (location.href = '…', window.open('…'))
  const navRe = /(?:location\.href\s*=|window\.open\()\s*["']([^"']+)["']/g;
  while ((m = navRe.exec(content))) handleRef(rel, m[1], 'nav', 'navigiert zu (JS)');

  // Remotion staticFile('…') – Public-Dir ist per Konvention/Config ./assets
  const sfRe = /staticFile\(\s*[`"']([^`"']+)[`"']\s*\)/g;
  while ((m = sfRe.exec(content))) {
    const projDir = rel.split('/')[0];
    const raw = m[1];
    if (raw.includes('${')) {
      // Template-Literal: alle Dateien matchen, die auf Präfix/Suffix passen
      const prefix = raw.split('${')[0];
      const suffix = raw.split('}').pop();
      for (const cand of files.keys()) {
        if (cand.startsWith(projDir + '/assets/' + prefix) && cand.endsWith(suffix)) {
          addEdge(rel, cand, 'asset', 'lädt Asset (staticFile)');
        }
      }
    } else {
      handleRef(rel, '/' + projDir + '/assets/' + raw, 'asset', 'lädt Asset (staticFile)');
    }
  }

  // fetch()-Ziele
  const fetchRe = /fetch\(\s*["'`]([^"'`]+)["'`]/g;
  while ((m = fetchRe.exec(content))) {
    const u = m[1];
    if (/^https?:\/\//.test(u)) handleRef(rel, u, 'api', 'ruft API auf');
    else if (u.startsWith('.') || u.startsWith('/')) handleRef(rel, u, 'asset', 'lädt per fetch');
  }

  // Supabase-Nutzung
  const sb = detectSupabase(rel, content);
  if (sb) supabaseUsage.set(rel, sb);
}

/** @type {Map<string, {tables:Map<string,string>, auth:string[], storage:string[], rest:string[]}>} */
const supabaseUsage = new Map();

function detectSupabase(rel, content) {
  if (!/supabase/i.test(content)) return null;
  const tables = new Map(); // tabelle -> 'liest' | 'schreibt' | 'liest/schreibt'
  const auth = new Set();
  const storage = new Set();
  const rest = new Set();
  let m;
  const fromRe = /\.from\(\s*["']([a-z0-9_]+)["']\s*\)([\s\S]{0,120})/g;
  while ((m = fromRe.exec(content))) {
    const table = m[1];
    const tail = m[2];
    const writes = /\.(insert|upsert|update|delete)\s*\(/.test(tail);
    const reads = /\.select\s*\(/.test(tail);
    const mode = writes && reads ? 'liest/schreibt' : writes ? 'schreibt' : 'liest';
    const prev = tables.get(table);
    tables.set(table, prev && prev !== mode ? 'liest/schreibt' : mode);
  }
  // Konstanten wie TABLE_PAGE_VIEWS: 'page_views' zuerst einsammeln,
  // damit REST-URLs mit CONFIG.TABLE_X auf den echten Tabellennamen zeigen.
  const tconsts = new Map();
  const tconstRe = /(TABLE_[A-Z_]+)\s*:\s*["']([a-z0-9_]+)["']/g;
  while ((m = tconstRe.exec(content))) tconsts.set(m[1], m[2]);
  for (const v of tconsts.values()) rest.add(v);
  const restRe = /rest\/v1\/["'+\s]*(?:CONFIG\.)?(?:(TABLE_[A-Z_]+)|([a-z0-9_]+))/g;
  while ((m = restRe.exec(content))) {
    const name = m[2] || (m[1] ? tconsts.get(m[1]) : null);
    if (name) rest.add(name);
  }
  const authRe = /supabase\.auth\.(\w+)/g;
  while ((m = authRe.exec(content))) auth.add(m[1]);
  const storRe = /storage\s*[\s\S]{0,40}?\.from\(\s*["']([a-z0-9_-]+)["']\s*\)/g;
  while ((m = storRe.exec(content))) storage.add(m[1]);
  if (!tables.size && !auth.size && !storage.size && !rest.size && !/createClient|supabase\.co/.test(content)) return null;
  return { tables, auth: [...auth], storage: [...storage], rest: [...rest] };
}

// --- CSS-Analyse ------------------------------------------------------------

function analyzeCss(rel, content) {
  let m;
  const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  while ((m = urlRe.exec(content))) handleRef(rel, m[1], 'asset', 'lädt Asset');
  const impRe = /@import\s+["']([^"']+)["']/g;
  while ((m = impRe.exec(content))) handleRef(rel, m[1], 'style', 'importiert Styles');
}

// --- Manifest / JSON --------------------------------------------------------

function analyzeManifest(rel, content) {
  try {
    const j = JSON.parse(content);
    for (const icon of j.icons || []) if (icon.src) handleRef(rel, icon.src, 'asset', 'nutzt Icon');
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Analyse-Durchlauf
// ---------------------------------------------------------------------------

const fileMeta = new Map(); // rel -> {desc, symbols, envVars, lines, category, area}

for (const [rel, f] of files) {
  const content = readText(rel);
  const category = categorize(rel, f.ext, content);
  const meta = {
    desc: describe(rel, f.ext, content),
    symbols: [],
    envVars: [],
    lines: content ? content.split('\n').length : 0,
    category,
    area: areaOf(rel),
  };
  if (content) {
    if (f.ext === '.html' || f.ext === '.htm') analyzeHtml(rel, content);
    else if (f.ext === '.css') analyzeCss(rel, content);
    else if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'].includes(f.ext)) {
      analyzeScriptText(rel, content);
      meta.symbols = extractSymbols(content);
    }
    else if (rel.endsWith('manifest.json') || rel.endsWith('.webmanifest')) analyzeManifest(rel, content);
    meta.envVars = extractEnvVars(content);
  }
  fileMeta.set(rel, meta);
}

// ---------------------------------------------------------------------------
// Virtuelle Knoten: externe Dienste, Datenbank, Auth, Storage, Dependencies
// ---------------------------------------------------------------------------

const virtualNodes = []; // {id,label,category,desc,area}

function addVirtual(id, label, category, desc) {
  if (!virtualNodes.some(v => v.id === id)) virtualNodes.push({ id, label, category, desc, area: 'Externe Dienste & Daten' });
  return id;
}

const SERVICE_INFO = {
  'morrzzgbyowlauhkfmdg.supabase.co': { id: 'svc:supabase', label: 'Supabase', desc: 'Backend-as-a-Service: Auth, Postgres-Datenbank, Storage (REST-API)' },
  'cdn.jsdelivr.net': { id: 'svc:jsdelivr', label: 'jsDelivr CDN', desc: 'CDN – lädt @supabase/supabase-js im Browser' },
  'www.instagram.com': { id: 'svc:instagram', label: 'Instagram', desc: 'Externer Link zum Profil @dorfdulli.racing' },
  'www.jhandpizzaservice.de': { id: 'svc:jhand', label: 'J. Hand Pizzaservice', desc: 'Externer Partner-Link' },
  'www.msc-pflueckuff.de': { id: 'svc:msc', label: 'MSC Pflückuff', desc: 'Externer Link (3h-Blockenduro 2026)' },
  'api.elevenlabs.io': { id: 'svc:elevenlabs', label: 'ElevenLabs API', desc: 'Text-to-Speech für Voiceover (Build-Zeit, ELEVENLABS_API_KEY)' },
};

for (const [host, sources] of externalHits) {
  const info = SERVICE_INFO[host] || { id: 'svc:' + host, label: host, desc: 'Externer Dienst: ' + host };
  addVirtual(info.id, info.label, 'Externer Dienst', info.desc);
  for (const [src, kind] of sources) {
    const label = kind === 'script' ? 'lädt Bibliothek von' : kind === 'api' ? 'ruft API auf' : 'verlinkt auf';
    addEdge(src, info.id, kind === 'nav' || kind === 'asset' ? 'nav' : kind, label);
  }
}

// ElevenLabs wird über execFileSync/curl aufgerufen → per Inhaltssuche ergänzen
for (const [rel] of files) {
  const c = readText(rel);
  if (c && /elevenlabs\.io/.test(c)) {
    addVirtual('svc:elevenlabs', 'ElevenLabs API', 'Externer Dienst', SERVICE_INFO['api.elevenlabs.io'].desc);
    addEdge(rel, 'svc:elevenlabs', 'api', 'ruft API auf');
  }
}

// GitHub Pages Deployment (CNAME vorhanden)
if (files.has('CNAME')) {
  addVirtual('svc:ghpages', 'GitHub Pages', 'Deployment', 'Hosting über GitHub Pages mit Custom Domain dorfdulliracing.de');
  addEdge('CNAME', 'svc:ghpages', 'deploy', 'konfiguriert Domain');
}

// Supabase-Detailknoten (Auth, Tabellen, Storage)
let usesSupabaseAuth = false;
const allTables = new Map(); // tabelle -> Set(mode)
const allBuckets = new Set();
for (const [rel, sb] of supabaseUsage) {
  addVirtual('svc:supabase', 'Supabase', 'Externer Dienst', SERVICE_INFO['morrzzgbyowlauhkfmdg.supabase.co'].desc);
  if (sb.auth.length) {
    usesSupabaseAuth = true;
    addVirtual('db:auth', 'Supabase Auth', 'Authentifizierung', 'Login, Registrierung und Sessions (signInWithPassword, signUp, getSession, signOut)');
    addEdge(rel, 'db:auth', 'auth', 'authentifiziert über');
  }
  for (const [table, mode] of sb.tables) {
    addVirtual('db:' + table, 'Tabelle ' + table, 'Datenbank', 'Postgres-Tabelle „' + table + '“ in Supabase');
    addEdge(rel, 'db:' + table, mode.includes('schreibt') ? 'db-write' : 'db-read',
      mode === 'liest' ? 'liest Daten aus' : mode === 'schreibt' ? 'schreibt Daten in' : 'liest & schreibt Daten');
    if (!allTables.has(table)) allTables.set(table, new Set());
    allTables.get(table).add(mode);
  }
  for (const t of sb.rest) {
    addVirtual('db:' + t, 'Tabelle ' + t, 'Datenbank', 'Postgres-Tabelle „' + t + '“ in Supabase (REST-API)');
    addEdge(rel, 'db:' + t, 'db-write', 'schreibt Daten in (REST)');
    if (!allTables.has(t)) allTables.set(t, new Set(['schreibt']));
  }
  for (const b of sb.storage) {
    addVirtual('store:' + b, 'Storage-Bucket ' + b, 'Datenbank', 'Supabase Storage-Bucket „' + b + '“ (Datei-Uploads)');
    addEdge(rel, 'store:' + b, 'db-write', 'lädt Dateien hoch in');
    allBuckets.add(b);
  }
}
for (const id of ['db:auth']) {
  if (virtualNodes.some(v => v.id === id)) addEdge(id, 'svc:supabase', 'api', 'Teil von');
}
for (const [table] of allTables) addEdge('db:' + table, 'svc:supabase', 'api', 'Teil von');
for (const b of allBuckets) addEdge('store:' + b, 'svc:supabase', 'api', 'Teil von');

// Package-Abhängigkeiten (aggregiert, keine node_modules-Dateien)
for (const [rel] of files) {
  if (path.basename(rel) === 'package.json') {
    const c = readText(rel);
    try {
      const j = JSON.parse(c);
      const deps = Object.keys(Object.assign({}, j.dependencies, j.devDependencies));
      if (deps.length) {
        const id = 'deps:' + path.posix.dirname(rel);
        addVirtual(id, 'Dependencies (' + deps.length + ')', 'Abhängigkeiten', 'npm-Pakete: ' + deps.join(', '));
        addEdge(rel, id, 'config', 'deklariert Abhängigkeiten');
      }
      // Remotion-Render erzeugt Assets im fba-rechner
      for (const s of Object.values(j.scripts || {})) {
        const rm = String(s).match(/(?:render|still)\s+\S+\s+(\.\.\/[^\s]+)/);
        if (rm) handleRef(rel, rm[1], 'generates', 'erzeugt (npm-Script)');
      }
    } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Grad, Auffälligkeiten, zentrale Dateien
// ---------------------------------------------------------------------------

const inDeg = new Map();
const outDeg = new Map();
for (const e of edges) {
  outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
  inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
}

const ENTRY_POINTS = new Set(['index.html', '404.html', 'CNAME', 'robot.txt', 'robots.txt',
  'sitemap.xml', '.gitignore', 'favicon.ico']);

function isEntryLike(rel) {
  const base = path.basename(rel).toLowerCase();
  if (rel === 'fba-rechner-video/src/index.ts') return true; // Remotion-Entry (per Konvention)
  if (rel === 'fba-rechner-video/voiceover/generate-voice.mjs') return true; // manuell ausgeführtes Build-Skript
  return ENTRY_POINTS.has(rel) || base === 'index.html' || base === 'readme.md' ||
    base === 'package.json' || base === 'package-lock.json' || base === 'tsconfig.json' ||
    base === '.gitignore' || base === '.keep' || base === 'remotion.config.ts' ||
    base === 'sitemap.xml' || base === 'robots.txt' || base === 'robot.txt';
}

// Duplikate über Größe + Inhalt (nur kleine/mittlere Dateien hashen)
const crypto = require('crypto');
const hashBuckets = new Map();
for (const [rel, f] of files) {
  if (f.size === 0 || f.size > 8 * 1024 * 1024) continue;
  try {
    const h = crypto.createHash('sha1').update(fs.readFileSync(f.abs)).digest('hex');
    if (!hashBuckets.has(h)) hashBuckets.set(h, []);
    hashBuckets.get(h).push(rel);
  } catch { /* ignore */ }
}
const duplicates = [...hashBuckets.values()].filter(a => a.length > 1);

// Zirkuläre Import-Abhängigkeiten (nur import-Kanten)
function findCycles() {
  const adj = new Map();
  for (const e of edges) {
    if (e.kind !== 'import') continue;
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  }
  const cycles = [];
  const state = new Map();
  const stack = [];
  function dfs(n) {
    state.set(n, 1); stack.push(n);
    for (const t of adj.get(n) || []) {
      if (state.get(t) === 1) {
        const i = stack.indexOf(t);
        if (i >= 0) cycles.push(stack.slice(i).concat(t));
      } else if (!state.get(t)) dfs(t);
    }
    stack.pop(); state.set(n, 2);
  }
  for (const n of adj.keys()) if (!state.get(n)) dfs(n);
  return cycles.slice(0, 10);
}
const cycles = findCycles();

const findings = [];
function finding(type, text, nodes) { findings.push({ type, text, nodes: nodes || [] }); }

// Fehlende Referenzziele
const brokenByRef = new Map();
for (const b of brokenRefs) {
  if (!brokenByRef.has(b.ref)) brokenByRef.set(b.ref, []);
  brokenByRef.get(b.ref).push(b.source);
}
for (const [ref, sources] of brokenByRef) {
  finding('broken-ref', 'Referenz auf nicht vorhandene Datei „' + ref + '“ (referenziert von ' + sources.join(', ') + ')', sources);
}

// Ungenutzte Dateien
const unused = [];
for (const [rel] of files) {
  if (!inDeg.get(rel) && !isEntryLike(rel)) unused.push(rel);
}
if (unused.length) {
  finding('unused', 'Dateien ohne erkennbare eingehende Verwendung: ' + unused.join(', '), unused);
}

// Duplikate
for (const group of duplicates) {
  finding('duplicate', 'Identischer Dateiinhalt: ' + group.join(' ↔ '), group);
}

// robots.txt-Benennung
if (files.has('robot.txt') && !files.has('robots.txt')) {
  finding('config', 'Datei heißt „robot.txt“ – Suchmaschinen erwarten „robots.txt“. Die Datei wird von Crawlern vermutlich nicht gefunden.', ['robot.txt']);
}

// Supabase-Anon-Key im Client
if (supabaseUsage.size) {
  finding('security', 'Supabase-URL und Anon-Key sind im Client-Code eingebettet (bei Supabase üblich; Absicherung muss über Row Level Security erfolgen). Werte werden in dieser Map bewusst nicht angezeigt.', [...supabaseUsage.keys()]);
}

// Sehr umfangreiche Dateien
const complex = [...fileMeta.entries()].filter(([, m]) => m.lines > 500).map(([rel, m]) => rel + ' (' + m.lines + ' Zeilen)');
if (complex.length) finding('complexity', 'Besonders umfangreiche Dateien: ' + complex.join(', '),
  complex.map(s => s.split(' ')[0]));

// Zyklen
for (const c of cycles) finding('cycle', 'Mögliche zirkuläre Import-Abhängigkeit: ' + c.join(' → '), c);

// Leere/Platzhalter-Dateien
const emptyish = [...files.entries()].filter(([rel, f]) => f.size <= 1 && path.basename(rel) !== '.keep').map(([rel]) => rel);
if (emptyish.length) finding('empty', 'Nahezu leere Dateien: ' + emptyish.join(', '), emptyish);

// Doppelte Font-Bereitstellung
const fontDirs = new Set([...files.keys()].filter(r => FONT_EXTS.has(path.extname(r).toLowerCase())).map(r => path.posix.dirname(r)));
if (fontDirs.size > 1) {
  finding('duplicate-logic', 'Webfonts werden in mehreren Ordnern bereitgestellt (' + [...fontDirs].join(', ') + ') – teilweise identische Schnitte.', []);
}

// ---------------------------------------------------------------------------
// Datenflüsse (nur belegte Flüsse aufnehmen)
// ---------------------------------------------------------------------------

const nodeExists = (id) => files.has(id) || virtualNodes.some(v => v.id === id);
const flows = [];
function flow(title, desc, steps) {
  const resolved = steps.filter(s => !s.node || nodeExists(s.node));
  if (resolved.filter(s => s.node).length >= 2) flows.push({ title, desc, steps: resolved });
}

flow('Seitenaufruf & Tracking', 'Jede eingebundene Seite meldet Seitenaufrufe per REST an Supabase.', [
  { label: 'Besucher' },
  { label: 'index.html', node: 'index.html' },
  { label: 'tracking.js', node: 'tracking.js' },
  { label: 'Supabase REST', node: 'svc:supabase' },
  { label: 'Tabelle page_views', node: 'db:page_views' },
]);
flow('Newsletter-Anmeldung', 'Formular auf der Startseite schreibt in Supabase-Tabellen.', [
  { label: 'Besucher' },
  { label: 'index.html (Formular)', node: 'index.html' },
  { label: 'supabase-js (CDN)', node: 'svc:jsdelivr' },
  { label: 'newsletter_signups', node: 'db:newsletter_signups' },
  { label: 'newsletter_events', node: 'db:newsletter_events' },
]);
flow('Login & Registrierung', 'Login-Seite authentifiziert über Supabase Auth und liest Profil-Daten.', [
  { label: 'Besucher' },
  { label: 'login.html', node: 'login.html' },
  { label: 'Supabase Auth', node: 'db:auth' },
  { label: 'profiles', node: 'db:profiles' },
  { label: 'referral_codes', node: 'db:referral_codes' },
  { label: 'members.html', node: 'members.html' },
]);
flow('Datei-Upload (Mitglieder)', 'Upload-Seite speichert Dateien im Storage-Bucket und Metadaten in einer Tabelle.', [
  { label: 'Mitglied' },
  { label: 'members.html', node: 'members.html' },
  { label: 'upload.html', node: 'upload.html' },
  { label: 'Storage-Bucket uploads', node: 'store:uploads' },
  { label: 'Tabelle uploads', node: 'db:uploads' },
]);
flow('FBA-Rechner Berechnung', 'Eingaben werden rein clientseitig berechnet und als SVG-Charts dargestellt.', [
  { label: 'Nutzer-Eingabe' },
  { label: 'fba-rechner/index.html', node: 'fba-rechner/index.html' },
  { label: 'app.js', node: 'fba-rechner/js/app.js' },
  { label: 'calc.js (Berechnungskern)', node: 'fba-rechner/js/calc.js' },
  { label: 'charts.js (SVG-Charts)', node: 'fba-rechner/js/charts.js' },
]);
flow('Mopedplaner (offline/lokal)', 'SPA mit Hash-Router; alle Daten bleiben im localStorage des Browsers.', [
  { label: 'Nutzer' },
  { label: 'mopedplaner/index.html', node: 'mopedplaner/index.html' },
  { label: 'app.js', node: 'mopedplaner/js/app.js' },
  { label: 'router.js', node: 'mopedplaner/js/router.js' },
  { label: 'views/*', node: 'mopedplaner/js/views/dashboard.js' },
  { label: 'store.js → localStorage', node: 'mopedplaner/js/store.js' },
]);
flow('Video-Produktion (Build-Zeit)', 'Voiceover via ElevenLabs, Rendering via Remotion in die fba-rechner-Assets.', [
  { label: 'ELEVENLABS_API_KEY (env)' },
  { label: 'generate-voice.mjs', node: 'fba-rechner-video/voiceover/generate-voice.mjs' },
  { label: 'ElevenLabs API', node: 'svc:elevenlabs' },
  { label: 'Remotion Root.tsx', node: 'fba-rechner-video/src/Root.tsx' },
  { label: 'explainer.mp4', node: 'fba-rechner/assets/explainer.mp4' },
]);

// ---------------------------------------------------------------------------
// Ausgabe
// ---------------------------------------------------------------------------

const nodes = [];
for (const [rel, f] of files) {
  const m = fileMeta.get(rel);
  nodes.push({
    id: rel,
    label: path.basename(rel),
    path: rel,
    dir: path.posix.dirname(rel) === '.' ? '/' : path.posix.dirname(rel),
    ext: f.ext.replace('.', '') || 'ohne',
    size: f.size,
    lines: m.lines,
    category: m.category,
    area: m.area,
    desc: m.desc,
    symbols: m.symbols,
    envVars: m.envVars,
    inDeg: inDeg.get(rel) || 0,
    outDeg: outDeg.get(rel) || 0,
    virtual: false,
  });
}
for (const v of virtualNodes) {
  nodes.push({
    id: v.id, label: v.label, path: v.id, dir: '(virtuell)', ext: 'dienst', size: 0, lines: 0,
    category: v.category, area: v.area, desc: v.desc, symbols: [], envVars: [],
    inDeg: inDeg.get(v.id) || 0, outDeg: outDeg.get(v.id) || 0, virtual: true,
  });
}

// Findings den Knoten zuordnen
const nodeFindings = new Map();
findings.forEach((f, i) => {
  for (const n of f.nodes) {
    if (!nodeFindings.has(n)) nodeFindings.set(n, []);
    nodeFindings.get(n).push(i);
  }
});
for (const n of nodes) n.findings = nodeFindings.get(n.id) || [];
for (const n of nodes) n.unused = unused.includes(n.id);

const data = {
  meta: {
    repo: 'morenggg/landingpage',
    domain: files.has('CNAME') ? fs.readFileSync(files.get('CNAME').abs, 'utf8').trim() : null,
    generatedAt: new Date().toISOString(),
    dirCount: dirCount + 1,
    fileCount: files.size,
    edgeCount: edges.length,
    excluded: [...EXCLUDED_DIRS],
    areas: [...new Set(nodes.map(n => n.area))],
    categories: [...new Set(nodes.map(n => n.category))].sort(),
  },
  nodes,
  edges,
  findings,
  flows,
};

// Abschließender Secret-Check: Ausgabe darf keine bekannten Secret-Muster enthalten
const out = 'window.REPO_DATA = ' + JSON.stringify(data, null, 1) + ';\n';
if (SECRET_VALUE_RE.test(out)) {
  console.error('ABBRUCH: Ausgabe enthält ein mögliches Secret-Muster. Es wurde nichts geschrieben.');
  process.exit(1);
}
fs.writeFileSync(OUT_FILE, out, 'utf8');

console.log('✓ repository-data.js geschrieben');
console.log('  Ordner analysiert:   ' + data.meta.dirCount);
console.log('  Dateien analysiert:  ' + data.meta.fileCount);
console.log('  Knoten gesamt:       ' + nodes.length + ' (davon ' + virtualNodes.length + ' Dienste/DB)');
console.log('  Beziehungen erkannt: ' + edges.length);
console.log('  Auffälligkeiten:     ' + findings.length);
console.log('  Datenflüsse:         ' + flows.length);
