/**
 * MopedPlaner – UI-Werkzeugkasten
 *
 * Kleine, abhängigkeitsfreie Helfer: DOM-Erzeugung, Icon-Bibliothek (Inline-SVG),
 * Bottom-Sheets, Toasts und Formatierung.
 */

/* ─────────────────────────── DOM ─────────────────────────── */

/** Element-Factory: el('div', { class: 'card', onclick: fn }, child1, child2 …) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (key === 'dataset') {
      Object.assign(node.dataset, value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ─────────────────────────── Icons ─────────────────────────── */

const ICON_PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9h13v-9"/><path d="M10 19v-5h4v5"/>',
  garage: '<path d="M3 10 12 4l9 6v10h-3v-7H6v7H3z"/><path d="M6 16h12M6 19h12"/>',
  wrench: '<path d="M14.2 6.3a4 4 0 0 0-5.4 5L4 16.1V20h3.9l4.8-4.8a4 4 0 0 0 5-5.4L14.9 12l-2.9-2.9z"/>',
  tools: '<path d="m6 7 3 3-2 2-3-3a3.5 3.5 0 0 1 0-3 3.5 3.5 0 0 1 2 1z"/><path d="m9 14 7-7"/><path d="m13 14 6 6 2-2-6-6"/><path d="M17.5 4.5 21 8l-2 1-2.5-2.5z"/>',
  diag: '<path d="M3 12h4l2-6 3 12 2.5-8 1.5 2h5"/>',
  engine: '<path d="M7 6h6v3h3l2 3h3v6h-3l-2 2H8l-2-3H3v-5h3z"/><path d="M10 6V4h4"/>',
  cylinder: '<rect x="8" y="3" width="8" height="6" rx="1"/><path d="M6 9h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M6 13h12M6 17h12"/>',
  clutch: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
  gearbox: '<circle cx="8" cy="8" r="4"/><circle cx="16" cy="16" r="4"/><path d="M8 12v4a2 2 0 0 0 2 2h2"/>',
  crank: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M8.5 10.5 15.5 7M8.5 13.5 15.5 17"/>',
  carb: '<path d="M8 4h8v5l3 3v8H5v-8l3-3z"/><path d="M10 4V2h4v2M9 14h6"/>',
  spark: '<path d="m13 2-8 12h6l-2 8 8-12h-6z"/>',
  fuel: '<path d="M5 4h8v16H5z"/><path d="M13 8h2l3 3v6a2 2 0 1 1-4 0V9"/><path d="M7 8h4"/>',
  exhaust: '<path d="M3 8h10v3H3z"/><path d="M13 9h4a3 3 0 0 1 3 3v5"/><circle cx="20" cy="19" r="1.6"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  suspension: '<path d="m5 19 4-4M7 21l4-4"/><path d="m9 15 8-8"/><path d="m14 4 6 6M15 9l3-3"/><circle cx="6" cy="18" r="2"/>',
  brake: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  chain: '<rect x="3" y="9" width="7" height="6" rx="3"/><rect x="14" y="9" width="7" height="6" rx="3"/><path d="M10 12h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  back: '<path d="M19 12H5m6-7-7 7 7 7"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  note: '<path d="M5 3h11l3 3v15H5z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 4h3l2.5 11h9L20 8H7"/>',
  upgrade: '<path d="M12 20V7"/><path d="m6 12 6-6 6 6"/><path d="M5 3h14"/>',
  gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 14 4-5"/><circle cx="12" cy="15" r="1.6"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z"/>',
  stop: '<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6"/>',
  sound: '<path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  star: '<path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z"/>',
  shield: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  mountain: '<path d="m3 19 6-10 4 6 3-4 5 8z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v6"/>',
  warn: '<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17.5h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  more: '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 19h16"/>',
  upload: '<path d="M12 15V3m0 0 4 4m-4-4L8 7"/><path d="M4 19h16"/>',
  moped: '<circle cx="5.5" cy="17" r="2.8"/><circle cx="18.5" cy="17" r="2.8"/><path d="M5.5 17h6l3-7h-4"/><path d="M13 7h3l2.5 10"/><path d="M9.5 7H13"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  euro: '<path d="M17 6a7 7 0 1 0 0 12"/><path d="M4 10h9M4 14h9"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/>',
  book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z"/>',
  nut: '<path d="m12 2 8 4.6v9.2L12 22l-8-6.2V6.6z" transform="rotate(90 12 12)"/><circle cx="12" cy="12" r="3.4"/>',
};

/** Inline-SVG-Icon. size in px. */
export function icon(name, size = 22, cls = '') {
  const path = ICON_PATHS[name] || ICON_PATHS.info;
  const span = document.createElement('span');
  span.className = 'icon ' + cls;
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  return span;
}

/* ─────────────────────────── Bottom-Sheet ─────────────────────────── */

let activeSheet = null;

export function openSheet(title, contentNode, opts = {}) {
  closeSheet();
  const backdrop = el('div', { class: 'sheet-backdrop', onclick: (e) => e.target === backdrop && closeSheet() });
  const sheet = el(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    el('div', { class: 'sheet-grip' }),
    el(
      'div',
      { class: 'sheet-head' },
      el('h2', {}, title),
      el('button', { class: 'icon-btn', 'aria-label': 'Schließen', onclick: closeSheet }, icon('x', 20))
    ),
    el('div', { class: 'sheet-body' }, contentNode)
  );
  backdrop.append(sheet);
  document.body.append(backdrop);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => backdrop.classList.add('open'));
  activeSheet = backdrop;
  return { close: closeSheet };
}

export function closeSheet() {
  if (!activeSheet) return;
  const node = activeSheet;
  activeSheet = null;
  node.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => node.remove(), 250);
}

/** Bestätigungsdialog als Sheet, liefert Promise<boolean>. */
export function confirmSheet(title, text, confirmLabel = 'Löschen') {
  return new Promise((resolve) => {
    const body = el(
      'div',
      {},
      el('p', { class: 'muted', style: 'margin-top:0' }, text),
      el(
        'div',
        { class: 'btn-row' },
        el('button', { class: 'btn btn-ghost', onclick: () => { closeSheet(); resolve(false); } }, 'Abbrechen'),
        el('button', { class: 'btn btn-danger', onclick: () => { closeSheet(); resolve(true); } }, confirmLabel)
      )
    );
    openSheet(title, body);
  });
}

/* ─────────────────────────── Toast ─────────────────────────── */

let toastTimer = null;

export function toast(message, kind = 'ok') {
  let node = document.getElementById('mp-toast');
  if (!node) {
    node = el('div', { id: 'mp-toast', class: 'toast', role: 'status' });
    document.body.append(node);
  }
  node.textContent = message;
  node.dataset.kind = kind;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}

/* ─────────────────────────── Formatierung ─────────────────────────── */

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EUR2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const fmtEuro = (n) => EUR.format(n || 0);
export const fmtEuro2 = (n) => EUR2.format(n || 0);
export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : DATE.format(d);
};

export function difficultyDots(level, max = 5) {
  const wrap = el('span', { class: 'dots', 'aria-label': `Schwierigkeit ${level} von ${max}` });
  for (let i = 1; i <= max; i++) wrap.append(el('span', { class: 'dot' + (i <= level ? ' on' : '') }));
  return wrap;
}

export const LIKELIHOOD_ORDER = { hoch: 0, mittel: 1, gering: 2 };

export function likelihoodBadge(likelihood) {
  return el('span', { class: `badge lk-${likelihood}` }, likelihood);
}
