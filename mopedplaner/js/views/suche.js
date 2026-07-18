/**
 * MopedPlaner – Zentrale technische Suche
 * Durchsucht die komplette Wissensbasis und gruppiert die Treffer
 * nach Typ (Modelle, Motoren, Bauteile, Ersatzteile, Schrauben, …).
 */

import { el, icon, verificationBadge } from '../ui.js';
import { searchKnowledge } from '../knowledge.js';

export function renderSuche() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Technische Suche'),
        el('p', { class: 'muted' }, 'Ein Suchfeld für alles: Modelle, Motoren, Bauteile, Teile, Schrauben, Wartungen, Reparaturen.'))
    )
  );

  const input = el('input', {
    class: 'search-input', type: 'search', autofocus: true,
    placeholder: 'z. B. „Kupplung", „M541", „Polrad", „9 Nm" …',
  });
  wrap.append(el('div', { class: 'search-wrap' }, icon('search', 18, 'search-icon'), input));

  const out = el('div', {});
  wrap.append(out);

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => render(input.value), 120);
  });

  function render(query) {
    out.replaceChildren();
    const q = (query || '').trim();
    if (q.length < 2) {
      out.append(el('div', { class: 'empty-state slim' },
        icon('search', 36, 'empty-icon'),
        el('p', { class: 'muted' }, 'Mindestens 2 Zeichen eingeben – gesucht wird in der gesamten Wissensdatenbank.')));
      return;
    }
    const groups = searchKnowledge(q);
    if (!groups.length) {
      out.append(el('div', { class: 'empty-state slim' },
        icon('search', 36, 'empty-icon'),
        el('p', { class: 'muted' }, `Nichts gefunden für „${q}".`)));
      return;
    }

    // Treffer-Zusammenfassung („2 Bauteile · 1 Ersatzteil · 3 Schrauben")
    out.append(el('p', { class: 'muted small', style: 'margin:4px 0 0' },
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
          item.status ? verificationBadge(item.status) : null,
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
