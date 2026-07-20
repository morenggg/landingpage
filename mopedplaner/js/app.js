/**
 * MopedPlaner – App-Bootstrap
 * Baut die Shell (View-Container + Tab-Bar), registriert Routen
 * und startet den Router. Service Worker für Offline-Betrieb.
 */

import { el, icon, closeSheet } from './ui.js';
import { route, setNotFound, startRouter, currentPath } from './router.js';
import { seedDemoIfEmpty } from './store.js';
import { renderDashboard } from './views/dashboard.js';
import { renderGarage } from './views/garage.js';
import { renderVehicle } from './views/vehicle.js';
import { renderRepairStep } from './views/repair.js';
import { renderTechnik } from './views/technik.js';
import { renderDiagnoseList, renderDiagnoseFlow } from './views/diagnose.js';
import { renderPlanerList, renderPlanerKit } from './views/planer.js';
import { renderSchrauben } from './views/schrauben.js';
import { renderEinstellungen } from './views/einstellungen.js';
import { renderTeileList, renderTeilDetail } from './views/teile.js';
import { renderSuche } from './views/suche.js';
import {
  renderMotorenList, renderMotorDetail,
  renderWartungList, renderWartungDetail,
  renderReparaturList, renderReparaturDetail,
} from './views/wissen.js';

const viewRoot = document.getElementById('view-root');

const TABS = [
  { id: '', name: 'Start', icon: 'home', match: (p) => p === '' },
  { id: 'garage', name: 'Garage', icon: 'garage', match: (p) => p.startsWith('garage') || p.startsWith('fahrzeug') },
  { id: 'diagnose', name: 'Diagnose', icon: 'diag', match: (p) => p.startsWith('diagnose') },
  { id: 'technik', name: 'Technik', icon: 'engine', match: (p) =>
      ['technik', 'schrauben', 'teile', 'suche', 'motor', 'wartung', 'reparatur'].some((prefix) => p.startsWith(prefix)) },
  { id: 'mehr', name: 'Mehr', icon: 'more', match: (p) => p.startsWith('mehr') || p.startsWith('planer') },
];

function buildTabbar() {
  const bar = document.getElementById('tabbar');
  // Markenkopf – nur in der Desktop-Sidebar sichtbar (mobil per CSS versteckt)
  bar.append(
    el('a', { class: 'nav-brand', href: '#/', 'aria-label': 'MopedPlaner Start' },
      icon('nut', 20), el('span', {}, 'MopedPlaner'))
  );
  for (const tab of TABS) {
    bar.append(
      el('a', { class: 'tab', href: '#/' + tab.id, dataset: { tab: tab.id } },
        icon(tab.icon, 22),
        el('span', {}, tab.name))
    );
  }
}

function updateTabbar() {
  const path = currentPath();
  document.querySelectorAll('#tabbar .tab').forEach((node) => {
    const tab = TABS.find((t) => t.id === node.dataset.tab);
    node.classList.toggle('active', !!tab && tab.match(path));
  });
}

async function mount(renderFn, params) {
  closeSheet();
  viewRoot.classList.add('leaving');
  const node = await renderFn(params || {});
  viewRoot.replaceChildren(node);
  viewRoot.classList.remove('leaving');
  window.scrollTo({ top: 0 });
  updateTabbar();
}

/* Query-Parameter aus dem Hash lösen (#/garage?neu=1) */
function withQuery(handler) {
  return (params) => {
    const raw = location.hash.split('?')[1];
    const query = raw ? Object.fromEntries(new URLSearchParams(raw)) : {};
    // Letztes Pfadsegment kann Query enthalten
    for (const key of Object.keys(params)) {
      if (typeof params[key] === 'string' && params[key].includes('?')) params[key] = params[key].split('?')[0];
    }
    return handler({ ...params, query });
  };
}

route('', withQuery(() => mount(renderDashboard)));
route('garage', withQuery((p) => mount(renderGarage, p)));
route('fahrzeug/:id', withQuery((p) => mount(renderVehicle, p)));
route('fahrzeug/:id/schritt/:taskId', (p) => mount(renderRepairStep, p));
route('fahrzeug/:id/:tab', withQuery((p) => mount(renderVehicle, p)));
route('technik/*path', (p) => mount(renderTechnik, p));
route('technik', () => mount(renderTechnik, { path: [] }));
route('diagnose', () => mount(renderDiagnoseList));
route('diagnose/:flowId', (p) => mount(renderDiagnoseFlow, p));
route('planer', () => mount(renderPlanerList));
route('planer/:kitId', (p) => mount(renderPlanerKit, p));
route('schrauben', () => mount(renderSchrauben));
route('teile', () => mount(renderTeileList));
route('teile/:partId', (p) => mount(renderTeilDetail, p));
route('suche', () => mount(renderSuche));
route('motoren', () => mount(renderMotorenList));
route('motor/:id', (p) => mount(renderMotorDetail, p));
route('wartung', () => mount(renderWartungList));
route('wartung/:id', (p) => mount(renderWartungDetail, p));
route('reparaturen', () => mount(renderReparaturList));
route('reparatur/:id', (p) => mount(renderReparaturDetail, p));
route('mehr', () => mount(renderEinstellungen));
setNotFound(() => mount(renderDashboard));

buildTabbar();
// Beim allerersten Start ein Beispiel-Fahrzeug anlegen (löschbar), damit die
// App sofort ihren Charakter zeigt – dann erst rendern.
seedDemoIfEmpty().catch(() => {}).finally(() => startRouter());

/* Offline-Indikator – dezent, nicht alarmistisch. navigator.onLine wird
   nur vorsichtig interpretiert: „online" ist nicht garantiert, aber
   „offline" ist verlässlich genug für den Hinweis, dass lokal alles
   weiterläuft. Statuswechsel ohne Neuladen. */
(function setupOfflineIndicator() {
  const bar = el('div', { id: 'offline-bar', role: 'status', 'aria-live': 'polite' },
    icon('offline', 16), el('span', {}, 'Offline – gespeicherte Inhalte bleiben verfügbar.'));
  document.body.append(bar);
  const sync = () => bar.classList.toggle('show', navigator.onLine === false);
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
})();

/* PWA: Service Worker (nur auf http/https, scoped auf /mopedplaner/) */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
