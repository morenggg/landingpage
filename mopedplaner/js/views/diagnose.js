/**
 * MopedPlaner – Problemfinder
 * Geführte Diagnose: Symptom wählen → Rückfragen beantworten →
 * wahrscheinlichste Ursachen mit Fix und Link in den Technik-Explorer.
 */

import { el, icon, likelihoodBadge, LIKELIHOOD_ORDER, accordion, note } from '../ui.js';
import { DIAGNOSTIC_FLOWS, getFlow } from '../data/diagnostics.js';
import { repairsForDiagnostic } from '../data/repairs.js';

export function renderDiagnoseList() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Problemfinder'),
        el('p', { class: 'muted' }, 'Was macht dein Moped? Wähle das Symptom – wir grenzen die Ursache Schritt für Schritt ein.'))
    )
  );

  const list = el('div', { class: 'stack' });
  for (const f of DIAGNOSTIC_FLOWS) {
    list.append(
      el('a', { class: 'row-item tall', href: `#/diagnose/${f.id}` },
        icon(f.icon, 22, 'row-lead accent-lead'),
        el('div', { class: 'row-main' },
          el('span', { class: 'row-title' }, f.title),
          el('span', { class: 'muted small' }, f.tagline)
        ),
        icon('chevR', 18, 'muted')
      )
    );
  }
  wrap.append(list);
  return wrap;
}

export function renderDiagnoseFlow({ flowId }) {
  const flow = getFlow(flowId);
  const wrap = el('div', { class: 'view' });
  if (!flow) {
    wrap.append(el('div', { class: 'empty-state' }, el('h2', {}, 'Diagnose nicht gefunden'), el('a', { class: 'btn btn-primary', href: '#/diagnose' }, 'Zur Übersicht')));
    return wrap;
  }

  wrap.append(
    el('nav', { class: 'crumbs' },
      el('a', { href: '#/diagnose' }, 'Problemfinder'),
      icon('chevR', 13, 'crumb-sep'),
      el('a', { class: 'current' }, flow.title))
  );

  const stage = el('div', { class: 'diag-stage' });
  wrap.append(stage);

  const history = [];

  function showStep(stepId) {
    const step = flow.steps[stepId];
    if (!step) return showResult(stepId);
    stage.replaceChildren(
      el('div', { class: 'card diag-card perfboard' },
        el('span', { class: 'diag-mode' }, icon('diag', 13), 'Diagnose'),
        el('p', { class: 'diag-progress muted small' }, `Frage ${history.length + 1}`),
        el('h2', { class: 'diag-question' }, step.question),
        step.help ? el('p', { class: 'muted diag-help' }, icon('info', 15), ' ', step.help) : null,
        el('div', { class: 'diag-options' },
          step.options.map((opt) =>
            el('button', {
              class: 'diag-option',
              onclick: () => {
                history.push(stepId);
                opt.result ? showResult(opt.result) : showStep(opt.next);
              },
            }, el('span', {}, opt.label), icon('chevR', 18))
          )
        ),
        history.length
          ? el('button', { class: 'mini-btn back-btn', onclick: () => showStep(history.pop()) }, icon('chevL', 14), 'Zurück')
          : null
      )
    );
    stage.scrollIntoView({ block: 'nearest' });
  }

  function showResult(resultId) {
    const result = flow.results[resultId];
    if (!result) return;
    const causes = [...result.causes].sort((a, b) => LIKELIHOOD_ORDER[a.likelihood] - LIKELIHOOD_ORDER[b.likelihood]);
    const [top, ...others] = causes;
    const linkedRepairs = repairsForDiagnostic(flow.id);

    const causeCard = (c, highlight = false) =>
      el('div', { class: 'cause card' + (highlight ? ' cause-top' : '') },
        el('div', { class: 'cause-head' },
          el('strong', {}, c.name),
          likelihoodBadge(c.likelihood)),
        el('p', { class: 'small muted' }, c.fix),
        c.link
          ? el('a', { class: 'mini-btn', href: `#/technik/${c.link}` }, icon('engine', 14), 'Bauteil ansehen')
          : null);

    stage.replaceChildren(
      el('div', { class: `card diag-card result sev-${result.severity}` },
        el('p', { class: 'diag-progress muted small' }, 'Ergebnis'),
        el('h2', { class: 'diag-question' }, result.title),

        // Wahrscheinlichste Ursache prominent
        top ? el('div', { style: 'margin-top:14px' },
          el('p', { class: 'result-count', style: 'margin:0 0 8px' }, 'Wahrscheinlichste Ursache'),
          causeCard(top, true)) : null,

        // Weitere Ursachen eingeklappt
        others.length
          ? el('div', { style: 'margin-top:12px' },
              accordion('Weitere mögliche Ursachen',
                el('div', { class: 'stack' }, others.map((c) => causeCard(c))),
                { icon: 'diag', meta: String(others.length) }))
          : null,

        // Passende geführte Reparaturen
        linkedRepairs.length
          ? el('div', { style: 'margin-top:12px' },
              el('p', { class: 'result-count', style: 'margin:0 0 8px' }, 'Passende Reparaturen'),
              el('div', { class: 'stack' },
                linkedRepairs.map((r) =>
                  el('a', { class: 'row-item', href: `#/reparatur/${r.id}` },
                    icon('tools', 18, 'row-lead accent-lead'),
                    el('div', { class: 'row-main' }, el('span', {}, r.name), el('span', { class: 'muted small' }, r.duration)),
                    icon('chevR', 16, 'muted')))))
          : null,

        result.severity === 'schwer'
          ? note('danger', 'Bei diesem Befund besser nicht weiterfahren, bis die Ursache geklärt ist – es drohen Folgeschäden.', 'Sicherheit')
          : null,

        el('div', { class: 'btn-row', style: 'margin-top:16px' },
          el('button', { class: 'btn btn-ghost', onclick: () => { history.length = 0; showStep(flow.start); } }, 'Neu starten'),
          el('a', { class: 'btn btn-primary', href: '#/diagnose' }, 'Anderes Problem')
        )
      )
    );
  }

  showStep(flow.start);
  return wrap;
}
