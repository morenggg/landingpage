/**
 * MopedPlaner – Ersatzteile
 * Moderner Katalog: Suche + Fahrzeugbezug immer sichtbar, Detail-Filter
 * im Bottom-Sheet, aktive Filter als Chips. Detailseiten zeigen das
 * Wichtigste sofort, technische Tiefe per Akkordeon.
 */

import {
  el, icon, verificationText, verificationNote, compatBadge, openSheet, closeSheet,
  accordion, sectionEl, emptyState, note, techValue, priceValue,
} from '../ui.js';
import {
  filterParts, getPart, getModel, getEngine, getTool, getFastener,
  componentByPath, partCompatibility, usagesOfPart, matchEngineFromText,
} from '../knowledge.js';
import { PARTS, PART_CATEGORIES, QUALITY_LEVELS } from '../data/parts.js';
import { ENGINES } from '../data/engines.js';
import { MODELS } from '../data/models.js';
import { offersForPart, getSeller } from '../data/offers.js';
import { Vehicles } from '../store.js';

/* UI-Zustand (zuletzt angesehen) – getrennt von den Nutzdaten. */
const UI_KEY = 'mopedplaner.ui.v1';

function readUiState() {
  try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch { return {}; }
}
function writeUiState(patch) {
  try { localStorage.setItem(UI_KEY, JSON.stringify({ ...readUiState(), ...patch })); } catch { /* voll */ }
}
function rememberPart(partId) {
  const state = readUiState();
  writeUiState({ recentParts: [partId, ...(state.recentParts || []).filter((id) => id !== partId)].slice(0, 6) });
}

const FILTER_LABELS = {
  category: (v) => v,
  modelId: (v) => getModel(v)?.name || v,
  engineId: (v) => getEngine(v)?.name || v,
  quality: (v) => QUALITY_LEVELS[v] || v,
  status: (v) => ({ 'partially-verified': 'Teilw. geprüft', unverified: 'Ungeprüft', verified: 'Verifiziert' }[v] || v),
};

/* ─────────────────────────── Liste ─────────────────────────── */

export async function renderTeileList() {
  const vehicles = await Vehicles.all();
  const wrap = el('div', { class: 'view' });

  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Ersatzteile'),
        el('p', { class: 'muted' }, 'Händlerunabhängiger Katalog – verknüpft mit Technik & Fahrzeugen.'))
    )
  );

  const filters = { query: '', category: '', modelId: '', engineId: '', quality: '', status: '', vehicleId: '' };

  // Suche + Filter-Button in einer Zeile
  const search = el('input', {
    class: 'search-input', type: 'search',
    placeholder: '„Kupplung", „M541", „S51" …',
    oninput: (e) => { filters.query = e.target.value; renderList(); },
  });
  wrap.append(
    el('div', { style: 'display:flex;gap:8px' },
      el('div', { class: 'search-wrap', style: 'flex:1;margin:0' }, icon('search', 18, 'search-icon'), search),
      el('button', { class: 'icon-btn', style: 'width:50px;height:50px', 'aria-label': 'Filter', onclick: () => openFilterSheet() }, icon('settings', 20)))
  );

  // Fahrzeugbezug – die wichtigste Filterfunktion, immer sichtbar
  if (vehicles.length) {
    const vSelect = el('select', {
      onchange: (e) => {
        filters.vehicleId = e.target.value;
        const v = vehicles.find((x) => x.id === filters.vehicleId);
        filters.modelId = v ? v.modelId : '';
        filters.engineId = v ? (matchEngineFromText(v.motor)?.id || '') : '';
        renderList();
      },
    },
      el('option', { value: '' }, 'Alle Fahrzeuge'),
      vehicles.map((v) => el('option', { value: v.id }, `Nur passend zu: ${v.name || getModel(v.modelId)?.name || 'Fahrzeug'}`))
    );
    wrap.append(el('div', { class: 'vehicle-filter' }, icon('moped', 18), vSelect));
  }

  // Aktive Filter als entfernbare Chips
  const activeBar = el('div', {});
  wrap.append(activeBar);

  const vehicleHint = el('div', {});
  wrap.append(vehicleHint);

  // Zuletzt angesehen
  const recentIds = (readUiState().recentParts || []).filter((id) => getPart(id));
  if (recentIds.length) {
    wrap.append(sectionEl('Zuletzt angesehen', {},
      el('div', { class: 'link-chips' },
        recentIds.map((id) => el('a', { class: 'chip', href: `#/teile/${id}` }, icon('box', 14), getPart(id).shortName || getPart(id).name)))));
  }

  const countLine = el('p', { class: 'result-count' });
  const listWrap = el('div', { class: 'stack', style: 'margin-top:10px' });
  wrap.append(countLine, listWrap);

  const vehicleForCompat = () => vehicles.find((x) => x.id === filters.vehicleId) || null;

  function renderActiveFilters() {
    activeBar.replaceChildren();
    const active = ['category', 'modelId', 'engineId', 'quality', 'status']
      .filter((k) => filters[k] && !(filters.vehicleId && (k === 'modelId' || k === 'engineId')));
    if (!active.length) return;
    activeBar.append(
      el('div', { class: 'active-filters' },
        active.map((k) =>
          el('button', { class: 'chip', onclick: () => { filters[k] = ''; renderList(); } },
            FILTER_LABELS[k](filters[k]), icon('x', 13))),
        el('button', { class: 'mini-btn', style: 'align-self:center', onclick: () => { active.forEach((k) => (filters[k] = '')); renderList(); } }, 'Zurücksetzen'))
    );
  }

  function openFilterSheet() {
    const mkSelect = (label, key, options) =>
      el('label', { class: 'field' },
        el('span', {}, label),
        el('select', { class: 'field-input', onchange: (e) => { filters[key] = e.target.value; } },
          el('option', { value: '' }, 'Alle'),
          options.map((o) => el('option', { value: o.value, selected: filters[key] === o.value || null }, o.label))));

    const body = el('div', { class: 'form-stack' },
      mkSelect('Kategorie', 'category', PART_CATEGORIES.map((c) => ({ value: c, label: c }))),
      mkSelect('Motor', 'engineId', ENGINES.map((e) => ({ value: e.id, label: e.name }))),
      mkSelect('Modell', 'modelId', MODELS.filter((m) => m.id !== 'sonstige').map((m) => ({ value: m.id, label: m.name }))),
      mkSelect('Qualitätsstufe', 'quality', Object.entries(QUALITY_LEVELS).map(([id, name]) => ({ value: id, label: name }))),
      mkSelect('Prüfstatus', 'status', [
        { value: 'partially-verified', label: 'Teilweise geprüft' },
        { value: 'unverified', label: 'Ungeprüft' },
        { value: 'verified', label: 'Verifiziert' },
      ]),
      el('div', { class: 'btn-row' },
        el('button', { class: 'btn btn-ghost', onclick: () => { ['category', 'modelId', 'engineId', 'quality', 'status'].forEach((k) => (filters[k] = '')); closeSheet(); renderList(); } }, 'Zurücksetzen'),
        el('button', { class: 'btn btn-primary', onclick: () => { closeSheet(); renderList(); } }, 'Anwenden')));
    openSheet('Filter', body);
  }

  function renderList() {
    renderActiveFilters();

    vehicleHint.replaceChildren();
    const v = vehicleForCompat();
    if (v && !matchEngineFromText(v.motor)) {
      vehicleHint.append(note('info',
        v.motor
          ? `Der Motor „${v.motor}" konnte keiner Motorfamilie zugeordnet werden – gefiltert wird nur nach Modell.`
          : 'In diesem Fahrzeug ist kein Motor gepflegt (Garage → Bearbeiten) – gefiltert wird nur nach Modell.'));
    }

    const results = filterParts(filters);
    countLine.textContent = `${results.length} ${results.length === 1 ? 'Teil' : 'Teile'}`;
    listWrap.replaceChildren();

    if (!results.length) {
      listWrap.append(emptyState('search', null, 'Kein Teil gefunden – Suchbegriff oder Filter anpassen.',
        el('button', { class: 'btn btn-ghost', onclick: () => { Object.assign(filters, { query: '', category: '', modelId: '', engineId: '', quality: '', status: '', vehicleId: '' }); search.value = ''; renderList(); } }, 'Filter zurücksetzen'), true));
      return;
    }

    // Nach Kategorie gruppieren – technischer Teilekatalog mit Registern
    const byCat = new Map();
    for (const part of results) {
      if (!byCat.has(part.category)) byCat.set(part.category, []);
      byCat.get(part.category).push(part);
    }
    for (const [cat, parts] of byCat) {
      listWrap.append(
        el('div', { class: 'cat-header' },
          el('span', {}, cat),
          techValue(String(parts.length), { kind: 'plain' }))
      );
      const group = el('div', { class: 'cat-group' });
      for (const part of parts) group.append(partRow(part, v));
      listWrap.append(group);
    }
  }

  renderList();
  return wrap;
}

/** Katalog-Zeile: Name, Unterkategorie, Kompatibilität – Preis dezent in Messing. */
function partRow(part, vehicle) {
  const price = part.estimatedPriceRange;
  const compat = vehicle ? partCompatibility(part, vehicle) : null;
  return el('a', { class: 'part-row', href: `#/teile/${part.id}` },
    el('div', { class: 'part-row-main' },
      el('span', { class: 'part-row-name' }, part.shortName || part.name),
      el('span', { class: 'part-row-meta' },
        compat
          ? el('span', { class: 'chip-wrap tight' }, compatBadge(compat))
          : el('span', {}, part.subcategory || part.category, ' · ', verificationText(part.verificationStatus)))),
    el('div', { class: 'part-row-side' },
      price?.min != null ? techValue(`${price.min}–${price.max} €`, { kind: 'price' }) : null,
      icon('chevR', 16, 'muted'))
  );
}

/* ─────────────────────────── Detail ─────────────────────────── */

export async function renderTeilDetail({ partId }) {
  const part = getPart(partId);
  const wrap = el('div', { class: 'view' });
  if (!part) {
    wrap.append(emptyState('warn', 'Teil nicht gefunden', 'Der Katalog-Eintrag existiert nicht (mehr).',
      el('a', { class: 'btn btn-primary', href: '#/teile' }, 'Zum Katalog')));
    return wrap;
  }
  rememberPart(partId);

  const vehicles = await Vehicles.all();
  const price = part.estimatedPriceRange;

  wrap.append(
    el('nav', { class: 'crumbs' },
      el('a', { href: '#/teile' }, 'Ersatzteile'),
      icon('chevR', 13, 'crumb-sep'),
      el('a', { class: 'current' }, part.shortName || part.name)),
    el('header', { class: 'comp-head' },
      icon('box', 26, 'comp-icon'),
      el('div', {},
        el('h1', {}, part.name),
        el('p', { class: 'muted small' },
          [part.category, part.subcategory, price?.min != null && `ca. ${price.min}–${price.max} €`].filter(Boolean).join(' · '))))
  );

  if (part.description) wrap.append(el('p', { class: 'lead' }, part.description));
  if (part.function) wrap.append(el('p', { class: 'small muted', style: 'margin:8px 0 0' }, part.function));

  // Prüfstatus mit Erklärung (statt reinem Badge)
  const vNote = verificationNote(part.verificationStatus);
  if (vNote) wrap.append(vNote);

  // Warnungen & Recht direkt sichtbar
  for (const w of part.warnings || []) wrap.append(note('warn', w));
  for (const l of part.legalNotes || []) wrap.append(note('legal', l));

  // Passt das an mein Fahrzeug? – die Kernfrage, prominent
  if (vehicles.length) {
    const compatOut = el('div', { style: 'margin-top:10px' });
    const vSelect = el('select', {
      onchange: (e) => {
        const v = vehicles.find((x) => x.id === e.target.value);
        compatOut.replaceChildren();
        if (v) {
          const compat = partCompatibility(part, v);
          compatOut.append(
            el('div', { class: 'chip-wrap tight' }, compatBadge(compat)),
            el('p', { class: 'small muted', style: 'margin:8px 0 0' }, compat.detail));
        }
      },
    },
      el('option', { value: '' }, 'Fahrzeug wählen …'),
      vehicles.map((v) => el('option', { value: v.id }, v.name || getModel(v.modelId)?.name || 'Fahrzeug')));
    wrap.append(sectionEl('Passt das an mein Fahrzeug?', {},
      el('div', { class: 'card' },
        el('div', { class: 'vehicle-filter', style: 'margin:0' }, icon('moped', 18), vSelect),
        compatOut)));
  }

  // Kompatibilität (Katalogdaten) – ruhige Key-Value-Liste
  const kompatSec = sectionEl('Kompatibilität');
  kompatSec.append(
    el('div', { class: 'card' },
      el('div', { class: 'info-list' },
        infoRow('Modelle', part.compatibleModelIds.length ? part.compatibleModelIds.map((id) => getModel(id)?.name.replace('Simson ', '') || id).join(', ') : 'Noch nicht erfasst'),
        infoRow('Motoren', part.compatibleEngineIds.length ? part.compatibleEngineIds.map((id) => getEngine(id)?.name || id).join(', ') : 'Noch nicht erfasst'),
        infoRow('OEM-Nummern', part.oemNumbers.length ? part.oemNumbers.join(', ') : 'Noch nicht erfasst'),
        infoRow('Qualitätsstufen', part.qualityLevels.map((q) => QUALITY_LEVELS[q] || q).join(', '))),
      part.compatNotes ? el('p', { class: 'muted small', style: 'margin:10px 0 0' }, part.compatNotes) : null));
  wrap.append(kompatSec);

  // Verbaut in – Kernverknüpfung, sichtbar
  linkChips(wrap, 'Verbaut in', part.componentIds.map((cid) => {
    const c = componentByPath(cid);
    return c && { icon: 'gearbox', label: c.node.name, href: `#/technik/${c.path}` };
  }));

  // Technische Tiefe – Akkordeons
  const details = el('div', { class: 'section' });
  let hasDetails = false;

  const fastenerRows = part.requiredFastenerIds.map(getFastener).filter(Boolean);
  if (fastenerRows.length) {
    details.append(accordion('Schrauben & Drehmomente',
      el('div', {}, fastenerRows.map((x) =>
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' },
            el('span', { class: 'small' }, x.part),
            el('span', { class: 'muted small' }, x.thread)),
          el('strong', { class: 'torque' }, x.torque)))),
      { icon: 'nut', meta: String(fastenerRows.length) }));
    hasDetails = true;
  }

  const tools = part.requiredToolIds.map(getTool).filter(Boolean);
  if (tools.length) {
    details.append(accordion('Benötigtes Werkzeug',
      el('div', { class: 'chip-wrap' }, tools.map((t) => el('span', { class: 'chip static', title: t.purpose }, icon('wrench', 14), t.name))),
      { icon: 'wrench', meta: String(tools.length) }));
    hasDetails = true;
  }

  const related = [
    ...part.alternativePartIds.map((pid) => ({ p: getPart(pid), alt: true })),
    ...part.relatedPartIds.map((pid) => ({ p: getPart(pid), alt: false })),
  ].filter((x) => x.p);
  if (related.length) {
    details.append(accordion('Alternative & verwandte Teile',
      el('div', { class: 'link-chips' }, related.map(({ p, alt }) =>
        el('a', { class: 'chip', href: `#/teile/${p.id}` }, icon('box', 14), (alt ? 'Alternative: ' : '') + (p.shortName || p.name)))),
      { icon: 'box', meta: String(related.length) }));
    hasDetails = true;
  }

  const usages = usagesOfPart(part.id);
  const linked = [
    ...usages.repairs.map((r) => ({ icon: 'tools', label: r.name, href: `#/reparatur/${r.id}` })),
    ...usages.maintenance.map((m) => ({ icon: 'calendar', label: m.name, href: `#/wartung/${m.id}` })),
    ...(part.diagnosticIds || []).map((d) => ({ icon: 'diag', label: 'Diagnose: ' + d.replaceAll('-', ' '), href: `#/diagnose/${d}` })),
  ];
  if (linked.length) {
    details.append(accordion('Reparaturen, Wartungen & Diagnosen',
      el('div', { class: 'link-chips' }, linked.map((it) => el('a', { class: 'chip', href: it.href }, icon(it.icon, 14), it.label))),
      { icon: 'tools', meta: String(linked.length) }));
    hasDetails = true;
  }

  if (part.notes?.length) {
    details.append(accordion('Hinweise',
      el('div', {}, part.notes.map((n) => el('p', { class: 'small', style: 'margin:4px 0' }, '• ' + n))),
      { icon: 'note' }));
    hasDetails = true;
  }

  const offers = offersForPart(part.id, { includeDemo: true });
  if (offers.length) {
    details.append(accordion('Angebote & Preisvergleich',
      el('div', {},
        offers.map((o) =>
          el('div', { class: 'fastener-row' },
            el('div', { class: 'row-main' },
              el('span', { class: 'small' }, o.productName),
              el('span', { class: 'muted small' }, getSeller(o.sellerId)?.name || '')),
            verificationText('demo'))),
        el('p', { class: 'muted small', style: 'margin:10px 0 0' },
          'Händleranbindung vorbereitet, noch nicht aktiv – nur Demo-Strukturen ohne echte Preise oder Links.')),
      { icon: 'cart', meta: 'Demo' }));
    hasDetails = true;
  }

  if (hasDetails) wrap.append(details);

  wrap.append(el('p', { class: 'disclaimer' }, icon('info', 14),
    ' Richtwerte ohne Gewähr – im Zweifel Original-Reparaturhandbuch.'));

  return wrap;
}

/* ─────────────────────────── Helfer ─────────────────────────── */

function infoRow(label, value) {
  return el('div', { class: 'info-row' },
    el('span', { class: 'info-label' }, label),
    el('span', { class: 'info-value' }, value));
}

function linkChips(wrap, title, entries) {
  const items = (entries || []).filter(Boolean);
  if (!items.length) return;
  wrap.append(sectionEl(title, {},
    el('div', { class: 'link-chips' },
      items.map((it) => el(it.href ? 'a' : 'span', { class: 'chip' + (it.href ? '' : ' static'), href: it.href || null },
        icon(it.icon, 14), it.label)))));
}
