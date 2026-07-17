/**
 * app.js — UI-Schicht: State, Event-Wiring, Rendering.
 * Die gesamte Rechenlogik lebt in calc.js, Diagramme in charts.js.
 */

import {
  CATEGORIES, suggestCosts, applyRisk, computeResults, computeStartCapital,
  simulate, rateProduct, fbaSizeTierLabel,
} from './calc.js';
import { renderLineChart } from './charts.js';

/* ---------- Helpers ---------- */

const $ = (sel) => document.querySelector(sel);

const fmtEur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const fmtEur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtInt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const eur = (v) => fmtEur.format(v);
const eur0 = (v) => fmtEur0.format(v);
const int = (v) => fmtInt.format(v);
const pct = (v) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
/** Kompakt für Diagrammachsen: 1,2 Mio. € / 45 Tsd. € / 320 € */
const eurCompact = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  if (a >= 1e4) return `${(v / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Tsd. €`;
  return fmtEur0.format(v);
};

const num = (el) => {
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : 0;
};
const numOrNull = (el) => {
  const v = parseFloat(el.value);
  return Number.isFinite(v) && v > 0 ? v : null;
};

/* ---------- Felddefinitionen ---------- */

const COST_FIELDS = [
  { key: 'referralPct',     label: 'Amazon Verkaufsprovision', unit: '%',        step: 0.5 },
  { key: 'fbaFee',          label: 'FBA-Gebühren',             unit: '€/Stück',  step: 0.01 },
  { key: 'inboundShipping', label: 'Versand zum Amazon-Lager', unit: '€/Stück',  step: 0.01 },
  { key: 'packaging',       label: 'Verpackung',               unit: '€/Stück',  step: 0.01 },
  { key: 'ppc',             label: 'Werbekosten (PPC)',        unit: '€/Stück',  step: 0.01 },
  { key: 'returnsPct',      label: 'Retourenreserve (vom Umsatz)', unit: '%',    step: 0.5 },
  { key: 'storage',         label: 'Lagerkosten',              unit: '€/Stück',  step: 0.01 },
  { key: 'other',           label: 'Sonstige Kosten',          unit: '€/Stück',  step: 0.01 },
];

const RISK_FIELDS = [
  { key: 'buyUpPct',      label: 'Einkaufspreis steigt', max: 50,  fmt: (v) => `+${v} %` },
  { key: 'saleDownPct',   label: 'Verkaufspreis sinkt',  max: 30,  fmt: (v) => `−${v} %` },
  { key: 'returnsAddPct', label: 'Retourenquote',        max: 20,  fmt: (v) => `+${v} Pkt.` },
  { key: 'ppcUpPct',      label: 'PPC-Kosten steigen',   max: 100, fmt: (v) => `+${v} %` },
  { key: 'shipUpPct',     label: 'Lieferkosten steigen', max: 100, fmt: (v) => `+${v} %` },
];

/** Kostenverteilung im Preis-Balken (feste kategoriale Reihenfolge). */
const BAR_SEGMENTS = [
  { key: 'buy',             label: 'Einkauf',    color: 'var(--cat-1)' },
  { key: 'referral',        label: 'Provision',  color: 'var(--cat-2)' },
  { key: 'fba',             label: 'FBA',        color: 'var(--cat-3)' },
  { key: 'ppc',             label: 'PPC',        color: 'var(--cat-4)' },
  { key: 'inboundShipping', label: 'Fracht',     color: 'var(--cat-5)' },
  { key: 'packaging',       label: 'Verpackung', color: 'var(--cat-6)' },
  { key: 'returns',         label: 'Retouren',   color: 'var(--cat-7)' },
  { key: 'storageOther',    label: 'Lager & Sonstiges', color: 'var(--cat-8)' },
  { key: 'profit',          label: 'Gewinn',     color: 'var(--muted)' },
];

/* ---------- State ---------- */

const STORAGE_CURRENT = 'fba-current-v1';
const STORAGE_SCENARIOS = 'fba-scenarios-v1';

const DEMO_STATE = () => ({
  product: {
    name: 'Edelstahl-Trinkflasche 750 ml',
    salePrice: 24.99, buyPrice: 5.20, qty: 100,
    category: 'home', dims: { l: 26, w: 8, h: 8 }, weightG: 350, asin: '',
  },
  costs: {},           // wird aus Vorschlägen befüllt
  touched: {},         // key → true, wenn der Nutzer den Wert überschrieben hat
  capital: { available: null, bufferPct: 10, maxQtyPerCycle: null },
});

let state = loadCurrent() || DEMO_STATE();
let scenarios = loadScenarios();
let risk = { buyUpPct: 0, saleDownPct: 0, returnsAddPct: 0, ppcUpPct: 0, shipUpPct: 0 };

function loadCurrent() {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function persistCurrent() {
  try { localStorage.setItem(STORAGE_CURRENT, JSON.stringify(state)); } catch { /* voll/blockiert */ }
}
function loadScenarios() {
  try {
    const raw = localStorage.getItem(STORAGE_SCENARIOS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function persistScenarios() {
  try { localStorage.setItem(STORAGE_SCENARIOS, JSON.stringify(scenarios)); } catch { /* */ }
}

/** Effektive Basiseingaben (ohne Risiko) für calc.js. */
function baseInputs() {
  return {
    salePrice: state.product.salePrice,
    buyPrice: state.product.buyPrice,
    qty: state.product.qty,
    costs: { ...state.costs },
    bufferPct: state.capital.bufferPct,
    availableCapital: state.capital.available,
  };
}

/* ---------- Formular-Aufbau ---------- */

function buildCategorySelect() {
  const sel = $('#p-cat');
  sel.innerHTML = CATEGORIES.map((c) =>
    `<option value="${c.id}">${c.label} — ${c.referralPct} %</option>`).join('');
}

function buildCostFields() {
  const grid = $('#costs-grid');
  grid.innerHTML = COST_FIELDS.map((f) => `
    <div class="field cost-field" data-key="${f.key}">
      <span>${f.label}</span>
      <div class="unit-wrap">
        <input type="number" id="c-${f.key}" min="0" step="${f.step}" inputmode="decimal">
        <span class="unit">${f.unit}</span>
      </div>
      <div class="auto-row">
        <span class="auto-tag" data-role="tag">automatischer Vorschlag</span>
        <button type="button" class="auto-reset" data-role="reset" hidden>↺ Vorschlag</button>
      </div>
    </div>`).join('');

  for (const f of COST_FIELDS) {
    const input = $(`#c-${f.key}`);
    input.addEventListener('input', () => {
      state.costs[f.key] = num(input);
      state.touched[f.key] = true;
      updateCostTags();
      recalcAll();
    });
    grid.querySelector(`[data-key="${f.key}"] [data-role="reset"]`)
      .addEventListener('click', () => {
        delete state.touched[f.key];
        refreshSuggestions();
        recalcAll();
      });
  }
}

function updateCostTags() {
  for (const f of COST_FIELDS) {
    const wrap = document.querySelector(`.cost-field[data-key="${f.key}"]`);
    const tag = wrap.querySelector('[data-role="tag"]');
    const reset = wrap.querySelector('[data-role="reset"]');
    const custom = !!state.touched[f.key];
    tag.textContent = custom ? 'manuell angepasst' : 'automatischer Vorschlag';
    tag.classList.toggle('custom', custom);
    reset.hidden = !custom;
  }
}

/** Kostenvorschläge neu berechnen; nur nicht manuell angepasste Felder überschreiben. */
function refreshSuggestions() {
  const s = suggestCosts(state.product);
  for (const f of COST_FIELDS) {
    if (!state.touched[f.key]) {
      state.costs[f.key] = s[f.key];
      $(`#c-${f.key}`).value = s[f.key];
    }
  }
  updateCostTags();

  const tier = fbaSizeTierLabel(state.product.dims, state.product.weightG);
  const note = $('#tier-note');
  if (state.product.weightG > 0) {
    note.hidden = false;
    note.textContent = `FBA-Größenklasse (Schätzung): ${tier}`;
  } else {
    note.hidden = true;
  }
}

function buildRiskSliders() {
  const grid = $('#risk-grid');
  grid.innerHTML = RISK_FIELDS.map((f) => `
    <div class="risk-field" data-key="${f.key}">
      <label class="risk-label" for="r-${f.key}">
        <span>${f.label}</span>
        <span class="risk-value" data-role="value">${f.fmt(0)}</span>
      </label>
      <input type="range" id="r-${f.key}" min="0" max="${f.max}" step="1" value="0">
    </div>`).join('');

  for (const f of RISK_FIELDS) {
    const input = $(`#r-${f.key}`);
    input.addEventListener('input', () => {
      risk[f.key] = num(input);
      updateRiskLabels();
      recalcAll();
    });
  }
}

function updateRiskLabels() {
  let active = false;
  for (const f of RISK_FIELDS) {
    const wrap = document.querySelector(`.risk-field[data-key="${f.key}"]`);
    const v = risk[f.key] || 0;
    wrap.querySelector('[data-role="value"]').textContent = f.fmt(v);
    wrap.classList.toggle('active', v > 0);
    if (v > 0) active = true;
  }
  $('#risk-badge').hidden = !active;
  $('#kpi-context').textContent = active ? 'pro Verkaufsrunde — Risikoszenario aktiv' : 'pro Verkaufsrunde';
}

/* ---------- Produkt-Inputs ↔ State ---------- */

function writeProductInputs() {
  const p = state.product;
  $('#p-name').value = p.name || '';
  $('#p-price').value = p.salePrice ?? '';
  $('#p-buy').value = p.buyPrice ?? '';
  $('#p-qty').value = p.qty ?? '';
  $('#p-cat').value = p.category || 'misc';
  $('#p-len').value = p.dims.l || '';
  $('#p-wid').value = p.dims.w || '';
  $('#p-hei').value = p.dims.h || '';
  $('#p-weight').value = p.weightG || '';
  $('#p-asin').value = p.asin || '';
  $('#k-capital').value = state.capital.available ?? '';
  $('#k-buffer').value = state.capital.bufferPct ?? 10;
  $('#k-maxqty').value = state.capital.maxQtyPerCycle ?? '';
}

function wireProductInputs() {
  const map = [
    ['#p-name',   () => { state.product.name = $('#p-name').value; }],
    ['#p-price',  () => { state.product.salePrice = num($('#p-price')); }],
    ['#p-buy',    () => { state.product.buyPrice = num($('#p-buy')); }],
    ['#p-qty',    () => { state.product.qty = num($('#p-qty')); }],
    ['#p-cat',    () => { state.product.category = $('#p-cat').value; }],
    ['#p-len',    () => { state.product.dims.l = num($('#p-len')); }],
    ['#p-wid',    () => { state.product.dims.w = num($('#p-wid')); }],
    ['#p-hei',    () => { state.product.dims.h = num($('#p-hei')); }],
    ['#p-weight', () => { state.product.weightG = num($('#p-weight')); }],
    ['#p-asin',   () => { state.product.asin = $('#p-asin').value.trim(); }],
    ['#k-capital',() => { state.capital.available = numOrNull($('#k-capital')); }],
    ['#k-buffer', () => { state.capital.bufferPct = num($('#k-buffer')); }],
    ['#k-maxqty', () => { state.capital.maxQtyPerCycle = numOrNull($('#k-maxqty')); }],
  ];
  for (const [sel, apply] of map) {
    $(sel).addEventListener('input', () => {
      apply();
      refreshSuggestions();
      recalcAll();
    });
  }
}

/* ---------- Rendering ---------- */

const kpiCache = {};
function setKpi(id, text, tone) {
  const el = $(id);
  if (kpiCache[id] !== text) {
    kpiCache[id] = text;
    el.textContent = text;
    el.classList.remove('flash');
    void el.offsetWidth; // Animation neu starten
    el.classList.add('flash');
  }
  el.classList.toggle('neg', tone === 'neg');
  el.classList.toggle('pos', tone === 'pos');
}

function renderKpis(r) {
  const toneOf = (v) => (v < 0 ? 'neg' : v > 0 ? 'pos' : '');
  setKpi('#kpi-profit-unit', eur(r.profitPerUnit), toneOf(r.profitPerUnit));
  setKpi('#kpi-profit-total', eur(r.totalProfit), toneOf(r.totalProfit));
  setKpi('#kpi-revenue', eur(r.revenue));
  setKpi('#kpi-roi', pct(r.roiPct), toneOf(r.roiPct));
  setKpi('#kpi-margin', pct(r.marginPct), toneOf(r.marginPct));
  setKpi('#kpi-bound', eur(r.boundCapital));
  setKpi('#kpi-ratio', pct(r.profitRatioPct), toneOf(r.profitRatioPct));
  setKpi('#kpi-cost-unit', eur(r.totalCostPerUnit));
}

function renderCostBar(r) {
  const bar = $('#cost-bar');
  const legend = $('#cost-legend');
  if (r.price <= 0) { bar.innerHTML = ''; legend.innerHTML = ''; return; }

  const parts = {
    ...r.perUnit,
    storageOther: r.perUnit.storage + r.perUnit.other,
    profit: Math.max(0, r.profitPerUnit),
  };
  const total = Object.entries(parts)
    .filter(([k]) => k !== 'storage' && k !== 'other')
    .reduce((s, [, v]) => s + v, 0);

  bar.innerHTML = BAR_SEGMENTS
    .filter((seg) => parts[seg.key] > 0.001)
    .map((seg) => {
      const w = (parts[seg.key] / total) * 100;
      return `<i style="width:${w.toFixed(2)}%;background:${seg.color}" title="${seg.label}: ${eur(parts[seg.key])}"></i>`;
    }).join('');

  legend.innerHTML = BAR_SEGMENTS
    .filter((seg) => parts[seg.key] > 0.001)
    .map((seg) => `<span><i class="dot" style="background:${seg.color}"></i>${seg.label} ${eur(parts[seg.key])}</span>`)
    .join('');
}

function renderStartCapital(cap, r) {
  $('#sc-number').textContent = cap.startCapital > 0 ? eur(cap.startCapital) : '–';

  const story = $('#sc-story');
  story.classList.remove('good', 'bad');
  if (r.qty <= 0 || cap.startCapital <= 0) {
    story.textContent = 'Bitte Produktdaten eingeben, um das benötigte Startkapital zu berechnen.';
  } else if (cap.selfSustaining) {
    story.classList.add('good');
    story.innerHTML =
      `Mit <strong>${eur(cap.startCapital)}</strong> Startkapital kannst du <strong>${int(r.qty)} Stück</strong> bestellen. ` +
      `Nach vollständigem Abverkauf stehen dir <strong>${eur(cap.capitalAfterCycle)}</strong> zur Verfügung — genug, ` +
      `um erneut ${int(r.qty)} Stück einzukaufen. Zusätzlich verbleiben <strong>${eur(cap.surplus)}</strong> als Überschuss.`;
  } else {
    story.classList.add('bad');
    story.innerHTML =
      `Mit <strong>${eur(cap.startCapital)}</strong> Startkapital kannst du ${int(r.qty)} Stück bestellen — ` +
      `aber nach dem Abverkauf bleiben nur <strong>${eur(cap.capitalAfterCycle)}</strong> übrig. ` +
      `Für eine erneute Bestellung derselben Menge fehlen <strong>${eur(cap.reorderCost - cap.capitalAfterCycle)}</strong>. ` +
      `Das Geschäft trägt sich so nicht selbst.`;
  }

  const rows = [
    ['Wareneinkauf', cap.goods],
    ['Versand zum Lager', cap.shipping],
    ['Verpackung', cap.packaging],
    [`Sicherheitspuffer (${cap.bufferPct} %)`, cap.buffer],
  ];
  const max = Math.max(...rows.map(([, v]) => v), 1);
  $('#sc-breakdown').innerHTML = rows.map(([label, v]) => `
    <div class="sc-row">
      <span class="sc-label">${label}</span>
      <span class="sc-track"><span class="sc-fill" style="width:${((v / max) * 100).toFixed(1)}%"></span></span>
      <span class="sc-value">${eur(v)}</span>
    </div>`).join('') + `
    <div class="sc-row total">
      <span class="sc-label">Startkapital gesamt</span>
      <span></span>
      <span class="sc-value">${eur(cap.startCapital)}</span>
    </div>`;
}

function renderSimulation(inputs, r, cap) {
  const startCapital = state.capital.available ?? cap.startCapital;
  const maxQty = state.capital.maxQtyPerCycle ?? Infinity;
  const rows = simulate(inputs, r, startCapital, 12, maxQty);

  $('#sim-start-label').textContent = eur(startCapital) +
    (state.capital.available != null ? ' (dein Kapital)' : ' (empfohlenes Startkapital)');
  $('#sim-cycles-label').textContent = '12';

  const labels = rows.map((row) => `Zyklus ${row.cycle}`);
  renderLineChart($('#chart-capital'), {
    values: rows.map((row) => row.capitalEnd), labels,
    color: 'var(--series-capital)', format: eurCompact, name: 'Kapital',
  });
  renderLineChart($('#chart-profit'), {
    values: rows.map((row) => row.profit), labels,
    color: 'var(--series-profit)', format: eurCompact, name: 'Gewinn',
  });
  renderLineChart($('#chart-qty'), {
    values: rows.map((row) => row.orderQty), labels,
    color: 'var(--series-qty)', format: int, name: 'Bestellmenge',
  });

  $('#sim-table tbody').innerHTML = rows.map((row) => `
    <tr>
      <td>Zyklus ${row.cycle}</td>
      <td>${eur(row.capitalStart)}</td>
      <td>${int(row.orderQty)}</td>
      <td>${eur(row.revenue)}</td>
      <td class="${row.profit < 0 ? 'neg' : ''}">${eur(row.profit)}</td>
      <td class="${row.capitalEnd < 0 ? 'neg' : ''}">${eur(row.capitalEnd)}</td>
    </tr>`).join('');

  const note = $('#sim-note');
  const stalled = rows.find((row) => row.stalled);
  if (stalled) {
    note.hidden = false;
    note.textContent = `Ab Zyklus ${stalled.cycle} reicht das Kapital nicht mehr für eine Bestellung — die Simulation endet dort.`;
  } else if (maxQty !== Infinity) {
    note.hidden = false;
    note.textContent = `Bestellmenge pro Zyklus auf ${int(maxQty)} Stück begrenzt (Absatzlimit). Überschüssiges Kapital bleibt ungenutzt liegen.`;
  } else {
    note.hidden = true;
  }
}

function renderRating(rating) {
  const card = $('#card-rating');
  card.dataset.level = rating.level;
  $('#rating-badge').textContent = rating.level === 'good' ? '✅' : rating.level === 'bad' ? '❌' : '⚠️';
  $('#rating-title').textContent = rating.title;
  $('#rating-points').innerHTML = rating.points.map((p) => `
    <li data-tone="${p.tone}">
      <span class="pt-icon">${p.tone === 'good' ? '✔' : p.tone === 'bad' ? '✖' : '⚠'}</span>
      <span>${p.text}</span>
    </li>`).join('');
}

function renderRiskCompare(base, adj, capBase, capAdj) {
  const tiles = [
    ['Gewinn pro Stück', eur(base.profitPerUnit), eur(adj.profitPerUnit), adj.profitPerUnit - base.profitPerUnit, eur],
    ['Gewinn gesamt', eur(base.totalProfit), eur(adj.totalProfit), adj.totalProfit - base.totalProfit, eur],
    ['Marge', pct(base.marginPct), pct(adj.marginPct), adj.marginPct - base.marginPct, (d) => `${d.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Pkt.`],
    ['ROI', pct(base.roiPct), pct(adj.roiPct), adj.roiPct - base.roiPct, (d) => `${d.toLocaleString('de-DE', { maximumFractionDigits: 0 })} Pkt.`],
    ['Startkapital', eur(capBase.startCapital), eur(capAdj.startCapital), capAdj.startCapital - capBase.startCapital, eur, true],
  ];
  $('#risk-compare').innerHTML = tiles.map(([label, from, to, delta, fmtD, invert]) => {
    const changed = Math.abs(delta) > 0.005;
    const worse = invert ? delta > 0 : delta < 0;
    const cls = !changed ? '' : worse ? 'down' : 'up';
    const arrow = !changed ? '' : worse ? '▼ ' : '▲ ';
    return `<div class="kpi">
      <span class="kpi-label">${label}</span>
      <strong class="kpi-value" style="font-size:17px">${changed ? `${from} → ${to}` : from}</strong>
      <span class="delta ${cls}">${changed ? arrow + fmtD(delta) : 'unverändert'}</span>
    </div>`;
  }).join('');
}

/* ---------- Szenarien ---------- */

function scenarioKpis(sc) {
  const inputs = {
    salePrice: sc.product.salePrice, buyPrice: sc.product.buyPrice, qty: sc.product.qty,
    costs: sc.costs, bufferPct: sc.capital.bufferPct, availableCapital: sc.capital.available,
  };
  const r = computeResults(inputs);
  const cap = computeStartCapital(inputs, r);
  const rating = rateProduct(r, cap);
  return { r, cap, rating };
}

const ratingIcon = (level) => level === 'good' ? '✅' : level === 'bad' ? '❌' : '⚠️';

function renderScenarios() {
  const list = $('#scenario-list');
  if (scenarios.length === 0) {
    list.innerHTML = '<p class="empty-note">Noch keine Szenarien gespeichert. Fülle die Eingaben aus und klicke oben auf „Szenario speichern“.</p>';
    $('#scenario-compare-wrap').hidden = true;
    return;
  }

  list.innerHTML = scenarios.map((sc) => {
    const { r, cap, rating } = scenarioKpis(sc);
    return `<article class="scenario-card" data-id="${sc.id}">
      <h3><span class="sc-badge">${ratingIcon(rating.level)}</span>${escapeHtml(sc.name)}</h3>
      <span class="sc-meta">${int(r.qty)} Stück · gespeichert am ${new Date(sc.savedAt).toLocaleDateString('de-DE')}</span>
      <div class="scenario-kpis">
        <span>Gewinn/Stück<strong>${eur(r.profitPerUnit)}</strong></span>
        <span>Marge<strong>${pct(r.marginPct)}</strong></span>
        <span>Startkapital<strong>${eur0(cap.startCapital)}</strong></span>
      </div>
      <div class="scenario-actions">
        <button type="button" class="btn" data-action="load">Laden</button>
        <button type="button" class="btn btn-ghost danger" data-action="delete">Löschen</button>
      </div>
    </article>`;
  }).join('');

  const wrap = $('#scenario-compare-wrap');
  wrap.hidden = scenarios.length < 2;
  if (!wrap.hidden) {
    $('#scenario-compare tbody').innerHTML = scenarios.map((sc) => {
      const { r, cap, rating } = scenarioKpis(sc);
      return `<tr>
        <td>${escapeHtml(sc.name)}</td>
        <td>${eur(r.price)}</td>
        <td class="${r.profitPerUnit < 0 ? 'neg' : ''}">${eur(r.profitPerUnit)}</td>
        <td>${pct(r.marginPct)}</td>
        <td>${pct(r.roiPct)}</td>
        <td>${eur0(cap.startCapital)}</td>
        <td>${cap.selfSustaining ? 'Ja' : 'Nein'}</td>
        <td class="rating-cell" title="${escapeHtml(rating.title)}">${ratingIcon(rating.level)} ${escapeHtml(rating.title)}</td>
      </tr>`;
    }).join('');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function saveScenario() {
  const name = state.product.name.trim() || `Szenario ${scenarios.length + 1}`;
  scenarios.push({
    id: `sc-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    name,
    savedAt: new Date().toISOString(),
    product: structuredClone(state.product),
    costs: structuredClone(state.costs),
    touched: structuredClone(state.touched),
    capital: structuredClone(state.capital),
  });
  persistScenarios();
  renderScenarios();
  $('#card-scenarios').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function wireScenarioActions() {
  $('#scenario-list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('.scenario-card').dataset.id;
    const sc = scenarios.find((s) => s.id === id);
    if (!sc) return;

    if (btn.dataset.action === 'delete') {
      scenarios = scenarios.filter((s) => s.id !== id);
      persistScenarios();
      renderScenarios();
    } else if (btn.dataset.action === 'load') {
      state = {
        product: structuredClone(sc.product),
        costs: structuredClone(sc.costs),
        touched: structuredClone(sc.touched),
        capital: structuredClone(sc.capital),
      };
      writeProductInputs();
      refreshSuggestions();
      // Manuell angepasste Kostenwerte wiederherstellen
      for (const f of COST_FIELDS) {
        if (state.touched[f.key]) $(`#c-${f.key}`).value = state.costs[f.key];
      }
      updateCostTags();
      recalcAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

/* ---------- Zentrale Neuberechnung ---------- */

function recalcAll() {
  const base = baseInputs();
  const adjusted = applyRisk(base, risk);

  const rBase = computeResults(base);
  const rAdj = computeResults(adjusted);
  const capBase = computeStartCapital(base, rBase);
  const capAdj = computeStartCapital(adjusted, rAdj);

  renderKpis(rAdj);
  renderCostBar(rAdj);
  renderStartCapital(capAdj, rAdj);
  renderSimulation(adjusted, rAdj, capAdj);
  renderRating(rateProduct(rAdj, capAdj));
  renderRiskCompare(rBase, rAdj, capBase, capAdj);

  persistCurrent();
}

/* ---------- Theme & globale Buttons ---------- */

function wireGlobalActions() {
  $('#btn-theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('fba-theme', next);
  });

  $('#btn-save-scenario').addEventListener('click', saveScenario);

  $('#btn-reset').addEventListener('click', () => {
    state = DEMO_STATE();
    risk = { buyUpPct: 0, saleDownPct: 0, returnsAddPct: 0, ppcUpPct: 0, shipUpPct: 0 };
    for (const f of RISK_FIELDS) $(`#r-${f.key}`).value = 0;
    updateRiskLabels();
    writeProductInputs();
    refreshSuggestions();
    recalcAll();
  });

  $('#btn-all-auto').addEventListener('click', () => {
    state.touched = {};
    refreshSuggestions();
    recalcAll();
  });

  $('#btn-risk-reset').addEventListener('click', () => {
    risk = { buyUpPct: 0, saleDownPct: 0, returnsAddPct: 0, ppcUpPct: 0, shipUpPct: 0 };
    for (const f of RISK_FIELDS) $(`#r-${f.key}`).value = 0;
    updateRiskLabels();
    recalcAll();
  });
}

/* ---------- Init ---------- */

function init() {
  buildCategorySelect();
  buildCostFields();
  buildRiskSliders();
  writeProductInputs();
  refreshSuggestions();
  // Manuell gespeicherte Kostenwerte aus der letzten Sitzung wiederherstellen
  for (const f of COST_FIELDS) {
    if (state.touched[f.key] && state.costs[f.key] != null) {
      $(`#c-${f.key}`).value = state.costs[f.key];
    }
  }
  updateCostTags();
  wireProductInputs();
  wireGlobalActions();
  wireScenarioActions();
  renderScenarios();
  recalcAll();
}

init();
