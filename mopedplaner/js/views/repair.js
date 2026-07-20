/**
 * MopedPlaner – Geführte Reparatur (Schritt-für-Schritt)
 *
 * Die „Weiter, wo du warst"-Karte auf dem Start führt hierher. Ein Schritt
 * pro Blick, klarer Fortschritt, ein Weiter-Knopf. Am Ende mündet die Arbeit
 * ins Werkstattbuch – so wächst die Historie von selbst.
 *
 * Kontext (benötigte Teile, Werkzeug, Sollwerte) kommt aus der austauschbaren
 * Reparaturdatenbank (REPAIRS), verknüpft über task.repairId.
 */

import { el, icon, techValue, toast, note } from '../ui.js';
import { Vehicles, Tasks } from '../store.js';
import { getModel } from '../data/models.js';
import { REPAIRS } from '../data/repairs.js';
import { navigate, refresh } from '../router.js';
import { openLogForm } from './vehicle.js';

export async function renderRepairStep({ id, taskId }) {
  const [vehicle, tasks] = await Promise.all([Vehicles.get(id), Tasks.byVehicle(id)]);
  const task = tasks.find((t) => t.id === taskId);

  if (!vehicle || !task) {
    return el('div', { class: 'view' },
      el('div', { class: 'empty-state' },
        icon('warn', 44, 'empty-icon'),
        el('h2', {}, 'Aufgabe nicht gefunden'),
        el('a', { class: 'btn btn-primary', href: '#/' }, 'Zum Start')));
  }

  const steps = task.steps || [];
  const model = getModel(vehicle.modelId);
  const repair = REPAIRS.find((r) => r.id === task.repairId) || null;

  // Ohne Schritte: es ist eine einfache Aufgabe – zurück zur Aufgabenliste.
  if (!steps.length) {
    navigate(`fahrzeug/${id}/aufgaben`);
    return el('div', { class: 'view' });
  }

  const total = steps.length;
  const done = Math.max(0, Math.min(task.stepDone || 0, total));
  const finished = done >= total;
  const current = finished ? total - 1 : done; // 0-basiert
  const remaining = task.minutes ? Math.max(1, Math.round(task.minutes * (total - done) / total)) : null;

  const wrap = el('div', { class: 'view rep' });

  // ── Kopf: zurück + Fortschritt ──
  wrap.append(
    el('div', { class: 'rep-bar' },
      el('a', { class: 'icon-btn', href: `#/fahrzeug/${id}`, 'aria-label': 'Zurück zum Fahrzeug' }, icon('back', 20)),
      el('div', { class: 'rep-bar-main' },
        el('span', { class: 'rep-bar-lead' }, vehicle.name || model?.name || 'Reparatur'),
        el('h1', { class: 'rep-title' }, task.title)))
  );

  // ── Fortschritt: „Schritt X von Y · noch ~Z min" + Balken ──
  wrap.append(
    el('div', { class: 'rep-progress' },
      el('div', { class: 'rep-progress-top' },
        el('span', { class: 'rep-progress-step' },
          finished ? 'Alle Schritte erledigt' : `Schritt ${done + 1} von ${total}`),
        remaining && !finished ? el('span', { class: 'rep-progress-min' }, `noch ~${remaining} min`) : null),
      el('div', { class: 'rep-progress-track' },
        el('span', { style: `width:${Math.round((done / total) * 100)}%` })))
  );

  if (finished) {
    wrap.append(renderDone(vehicle, task, repair));
  } else {
    wrap.append(renderCurrent(vehicle, task, steps, current, total, repair));
  }

  // ── Alle Schritte als Checkliste (Überblick, springbar) ──
  const listWrap = el('div', { class: 'rep-steps' });
  steps.forEach((s, i) => {
    const state = i < done ? 'done' : i === current && !finished ? 'now' : 'todo';
    listWrap.append(
      el('button', {
        class: `rep-step rep-step-${state}`,
        onclick: async () => { await Tasks.setStep(task.id, i); refresh(); },
      },
        el('span', { class: 'rep-step-idx' }, state === 'done' ? icon('check', 14) : String(i + 1)),
        el('span', { class: 'rep-step-text' }, s))
    );
  });
  wrap.append(el('div', { class: 'rep-steps-wrap' },
    el('p', { class: 'rep-steps-lab' }, 'Alle Schritte'), listWrap));

  return wrap;
}

/* ── aktueller Schritt ── */
function renderCurrent(vehicle, task, steps, current, total, repair) {
  const box = el('div', { class: 'rep-current perfboard' });
  box.append(
    el('span', { class: 'rep-current-lead' }, `Schritt ${current + 1}`),
    el('p', { class: 'rep-current-text' }, steps[current]));

  // Kontext aus der Reparaturdatenbank (Sollwerte, Warnung) – knapp
  if (repair) {
    const vals = (repair.values || []).slice(0, 2);
    if (vals.length) {
      box.append(el('div', { class: 'rep-vals' },
        vals.map((v) => el('div', { class: 'rep-val' },
          el('span', { class: 'rep-val-k' }, v.name),
          el('span', { class: 'rep-val-v' }, techValue(v.value, { kind: /Nm|mm/.test(v.value) ? 'torque' : 'plain' }))))));
    }
    if (repair.warnings && repair.warnings[0]) {
      box.append(note('warn', repair.warnings[0]));
    }
  }

  const advance = async () => { await Tasks.setStep(task.id, current + 1); refresh(); };
  const wrap = el('div', {});
  wrap.append(box);
  wrap.append(
    el('div', { class: 'rep-actions' },
      current > 0
        ? el('button', { class: 'btn btn-ghost', onclick: async () => { await Tasks.setStep(task.id, current - 1); refresh(); } }, 'Zurück')
        : el('span', {}),
      el('button', { class: 'btn btn-primary rep-next', onclick: advance },
        icon('check', 18), current + 1 >= total ? 'Letzter Schritt erledigt' : 'Schritt erledigt'))
  );
  return wrap;
}

/* ── Abschluss ── */
function renderDone(vehicle, task, repair) {
  const wrap = el('div', { class: 'rep-done' });
  wrap.append(
    el('div', { class: 'rep-done-mark' }, icon('check', 30)),
    el('h2', {}, 'Geschafft.'),
    el('p', { class: 'muted' }, 'Halte die Arbeit im Werkstattbuch fest – dann ist deine Historie lückenlos.'));

  const prefill = {
    type: 'reparatur',
    title: task.title,
    parts: repair && repair.partIds && repair.partIds.length ? '' : '',
    notes: 'Geführte Reparatur abgeschlossen.',
  };

  wrap.append(
    el('div', { class: 'rep-done-actions' },
      el('button', { class: 'btn btn-primary btn-block', onclick: async () => {
        await Tasks.toggle(task.id); // als erledigt markieren
        openLogForm(vehicle.id, null, prefill);
      } }, icon('note', 18), 'Im Logbuch festhalten'),
      el('button', { class: 'btn btn-ghost btn-block', onclick: async () => {
        await Tasks.toggle(task.id);
        toast('Als erledigt markiert');
        navigate(`fahrzeug/${vehicle.id}`);
      } }, 'Nur als erledigt markieren'))
  );
  return wrap;
}
