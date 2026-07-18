/**
 * MopedPlaner – Zentrale technische Suche
 * Ein Suchfeld über die ganze Wissensbasis. Letzte Suchanfragen und
 * Vorschläge beim Einstieg, Treffer nach Typ gruppiert.
 */

import { el, icon, emptyState } from '../ui.js';
import { searchKnowledge } from '../knowledge.js';

const UI_KEY = 'mopedplaner.ui.v1';

function readRecent() {
  try { return (JSON.parse(localStorage.getItem(UI_KEY)) || {}).recentSearches || []; } catch { return []; }
}
function rememberSearch(q) {
  try {
    const state = JSON.parse(localStorage.getItem(UI_KEY)) || {};
    state.recentSearches = [q, ...(state.recentSearches || []).filter((x) => x !== q)].slice(0, 5);
    localStorage.setItem(UI_KEY, JSON.stringify(state));
  } catch { /* voll */ }
}

const SUGGESTIONS = ['Kupplung', 'Zündung', 'Vergaser', 'Bremse', 'Polrad', 'M541'];

export function renderSuche() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Suche'),
        el('p', { class: 'muted' }, 'Bauteile, Ersatzteile, Schrauben, Motoren, Reparaturen – alles in einem Feld.'))
    )
  );

  const input = el('input', {
    class: 'search-input', type: 'search', autofocus: true,
    placeholder: 'z. B. „Kupplung", „M541", „Polrad" …',
  });
  wrap.append(el('div', { class: 'search-wrap' }, icon('search', 18, 'search-icon'), input));

  const out = el('div', {});
  wrap.append(out);

  let timer = null;
  let saveTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => render(input.value), 120);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const q = input.value.trim();
      if (q.length >= 3 && searchKnowledge(q).length) rememberSearch(q);
    }, 1200);
  });

  function startScreen() {
    const box = el('div', {});
    const recent = readRecent();
    if (recent.length) {
      box.append(
        el('p', { class: 'result-count' }, 'Letzte Suchen'),
        el('div', { class: 'link-chips', style: 'margin-top:8px' },
          recent.map((q) => chip(q))));
    }
    box.append(
      el('p', { class: 'result-count' }, 'Vorschläge'),
      el('div', { class: 'link-chips', style: 'margin-top:8px' },
        SUGGESTIONS.map((q) => chip(q))));
    return box;
  }

  function chip(q) {
    return el('button', { class: 'chip', onclick: () => { input.value = q; render(q); } }, icon('search', 13), q);
  }

  function render(query) {
    out.replaceChildren();
    const q = (query || '').trim();
    if (q.length < 2) {
      out.append(startScreen());
      return;
    }
    const groups = searchKnowledge(q);
    if (!groups.length) {
      out.append(emptyState('search', null, `Nichts gefunden für „${q}" – andere Schreibweise probieren?`, null, true));
      return;
    }

    out.append(el('p', { class: 'result-count' },
      groups.map((g) => `${g.count} ${g.label}`).join(' · ')));

    for (const group of groups) {
      const sec = el('section', { class: 'result-group' },
        el('div', { class: 'result-group-head' }, icon(group.icon, 16), `${group.label} (${group.count})`));
      const list = el('div', { class: 'stack' });
      for (const item of group.items) {
        const inner = [
          el('div', { class: 'row-main' },
            el('span', {}, item.title),
            item.sub ? el('span', { class: 'muted small clamp-1' }, item.sub) : null),
          item.href ? icon('chevR', 16, 'muted') : null,
        ];
        list.append(item.href
          ? el('a', { class: 'row-item', href: item.href }, ...inner)
          : el('div', { class: 'row-item' }, ...inner));
      }
      sec.append(list);
      out.append(sec);
    }
  }

  render('');
  return wrap;
}
