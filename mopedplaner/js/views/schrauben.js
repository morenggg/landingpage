/**
 * MopedPlaner – Schraubenfinder
 * Durchsuchbare Drehmoment- und Schrauben-Datenbank mit Gruppenfilter.
 */

import { el, icon } from '../ui.js';
import { FASTENERS, FASTENER_GROUPS } from '../data/fasteners.js';

export function renderSchrauben() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Schraubenfinder'),
        el('p', { class: 'muted' }, 'Gewinde, Schlüsselweite und Drehmoment für jede Verbindung.'))
    )
  );

  let query = '';
  let group = 'alle';

  const search = el('input', {
    class: 'search-input', type: 'search', placeholder: 'Suchen: „Polrad", „M6", „Achse" …',
    oninput: (e) => { query = e.target.value.toLowerCase().trim(); renderList(); },
  });
  wrap.append(el('div', { class: 'search-wrap' }, icon('search', 18, 'search-icon'), search));

  const filterBar = el('div', { class: 'chip-wrap', role: 'tablist' });
  const groups = [{ id: 'alle', name: 'Alle' }, ...FASTENER_GROUPS];
  for (const g of groups) {
    filterBar.append(
      el('button', {
        class: 'chip filter' + (g.id === group ? ' active' : ''),
        role: 'tab',
        onclick: (e) => {
          group = g.id;
          filterBar.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          e.currentTarget.classList.add('active');
          renderList();
        },
      }, g.name)
    );
  }
  wrap.append(filterBar);

  const listWrap = el('div', { class: 'stack', style: 'margin-top:14px' });
  wrap.append(listWrap);

  function renderList() {
    const rows = FASTENERS.filter((f) => {
      if (group !== 'alle' && f.group !== group) return false;
      if (!query) return true;
      return [f.part, f.fastener, f.thread, f.sw, f.torque, f.note].join(' ').toLowerCase().includes(query);
    });

    listWrap.replaceChildren();
    if (!rows.length) {
      listWrap.append(el('div', { class: 'empty-state slim' }, icon('search', 36, 'empty-icon'), el('p', { class: 'muted' }, 'Nichts gefunden – andere Schreibweise probieren?')));
      return;
    }
    for (const f of rows) {
      listWrap.append(
        el('div', { class: 'card fastener-card' },
          el('div', { class: 'fastener-top' },
            el('strong', {}, f.part),
            el('strong', { class: 'torque' }, f.torque)
          ),
          el('div', { class: 'chip-wrap tight' },
            el('span', { class: 'badge' }, f.thread),
            f.sw !== '—' ? el('span', { class: 'badge' }, f.sw) : null,
            f.grade !== '—' ? el('span', { class: 'badge' }, `Festigkeit ${f.grade}`) : null,
            el('span', { class: 'badge subtle' }, f.fastener)
          ),
          f.note && f.note !== '—' ? el('p', { class: 'small muted', style: 'margin:8px 0 0' }, f.note) : null
        )
      );
    }
    listWrap.append(
      el('p', { class: 'disclaimer' }, icon('info', 14),
        ' Richtwerte für M53/M54/M531/M541/M741 – im Zweifel gilt das Reparaturhandbuch.')
    );
  }

  renderList();
  return wrap;
}
