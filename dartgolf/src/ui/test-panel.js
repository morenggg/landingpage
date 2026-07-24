/**
 * DartGolf – Testpanel
 *
 * Mit diesem Panel lässt sich jeder mögliche Wurf ohne Dartscheibe auslösen.
 * Es ist die Grundlage dafür, dass das gesamte Spiel ohne Autodarts
 * vollständig geprüft werden kann.
 *
 * Funktionen: Segmente 1–20, Single/Double/Triple, Outer Bull, Bullseye,
 * Miss, optionale Koordinaten, Zufallswurf, Testsequenz, Anzeige des
 * erzeugten DartThrow-Objekts und des letzten Rohereignisses.
 */

import { el, qs, replaceChildren, setText } from './dom.js';
import { DEMO_SEQUENCE } from '../input/test-provider.js';
import { toast } from './screens.js';

/** Auswahlzustand des Panels. */
const selection = {
  segment: 20,
  multiplier: 1,
  useCoordinates: false,
  x: 0,
  y: 0,
};

/** @type {import('../input/test-provider.js').TestDartProvider|null} */
let provider = null;
let rerender = () => {};

/** Zwischenspeicher für mehrstellige Segmenteingaben per Tastatur. */
let digitBuffer = '';
let digitTimer = null;

/**
 * Baut das Panel auf.
 * @param {import('../input/test-provider.js').TestDartProvider} testProvider
 */
export function initTestPanel(testProvider) {
  provider = testProvider;

  const toggle = qs('#test-panel-toggle');
  const panel = qs('#test-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = panel.dataset.open !== 'true';
      panel.dataset.open = open ? 'true' : 'false';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  rerender = () => renderTestPanel();
  rerender();
}

/** Öffnet oder schließt das Panel. */
export function setTestPanelOpen(open) {
  const panel = qs('#test-panel');
  const toggle = qs('#test-panel-toggle');
  if (!panel) return;
  panel.dataset.open = open ? 'true' : 'false';
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/** @returns {boolean} */
export function isTestPanelOpen() {
  const panel = qs('#test-panel');
  return Boolean(panel && panel.dataset.open === 'true');
}

/** Zeichnet das Panel neu. */
function renderTestPanel() {
  const body = qs('#test-panel-body');
  if (!body) return;

  const segmentButtons = [];
  for (let n = 1; n <= 20; n += 1) {
    segmentButtons.push(el('button', {
      type: 'button',
      class: 'btn btn--small',
      text: String(n),
      'aria-pressed': selection.segment === n ? 'true' : 'false',
      onClick: () => {
        selection.segment = n;
        if (selection.multiplier === 0) selection.multiplier = 1;
        rerender();
      },
    }));
  }

  const multiplierButton = (label, value) => el('button', {
    type: 'button',
    class: 'btn btn--small btn--toggle',
    text: label,
    'aria-pressed': selection.multiplier === value && selection.segment !== 25 ? 'true' : 'false',
    onClick: () => {
      selection.multiplier = value;
      if (selection.segment === 25) selection.segment = 20;
      rerender();
    },
  });

  const specialButton = (label, segment, multiplier) => el('button', {
    type: 'button',
    class: 'btn btn--small btn--toggle',
    text: label,
    'aria-pressed': selection.segment === segment && selection.multiplier === multiplier ? 'true' : 'false',
    onClick: () => {
      selection.segment = segment;
      selection.multiplier = multiplier;
      rerender();
    },
  });

  const preview = buildThrowPreview();

  replaceChildren(body, [
    el('p', { class: 'field-hint', text: 'Segment wählen, Art wählen, auslösen. Alles ohne echte Scheibe.' }),

    el('div', { class: 'segment-grid' }, segmentButtons),

    el('div', { class: 'multiplier-row' }, [
      multiplierButton('Single', 1),
      multiplierButton('Double', 2),
      multiplierButton('Triple', 3),
    ]),

    el('div', { class: 'special-row' }, [
      specialButton('Outer Bull', 25, 1),
      specialButton('Bullseye', 25, 2),
      specialButton('Miss', null, 0),
    ]),

    el('label', { class: 'checkbox-row' }, [
      el('input', {
        type: 'checkbox',
        checked: selection.useCoordinates,
        onChange: (event) => {
          selection.useCoordinates = event.target.checked;
          rerender();
        },
      }),
      'Koordinaten mitsenden (x / y, −1 bis 1)',
    ]),

    selection.useCoordinates ? el('div', { class: 'option-row' }, [
      el('input', {
        type: 'number', step: '0.05', min: '-1', max: '1', value: String(selection.x),
        'aria-label': 'x-Koordinate',
        onInput: (event) => { selection.x = Number(event.target.value) || 0; },
      }),
      el('input', {
        type: 'number', step: '0.05', min: '-1', max: '1', value: String(selection.y),
        'aria-label': 'y-Koordinate',
        onInput: (event) => { selection.y = Number(event.target.value) || 0; },
      }),
    ]) : null,

    el('button', {
      type: 'button',
      class: 'btn btn--primary',
      text: `Wurf auslösen (${preview.notation})`,
      onClick: () => triggerSelectedThrow(),
    }),

    el('div', { class: 'option-row' }, [
      el('button', {
        type: 'button', class: 'btn btn--small', text: 'Zufallswurf',
        onClick: () => triggerRandomThrow(),
      }),
      el('button', {
        type: 'button',
        class: 'btn btn--small',
        text: provider && provider.isSequenceRunning() ? 'Sequenz stoppen' : 'Testsequenz',
        onClick: () => toggleSequence(),
      }),
    ]),

    el('div', { class: 'field-group' }, [
      el('h3', { text: 'Erzeugtes DartThrow-Objekt' }),
      el('pre', { class: 'code-box', id: 'test-throw-output', text: '–' }),
    ]),

    el('div', { class: 'field-group' }, [
      el('h3', { text: 'Letztes Rohereignis' }),
      el('pre', { class: 'code-box', id: 'test-raw-output', text: '–' }),
    ]),

    el('p', { class: 'field-hint', text: 'Tastatur: 1–20 Segment, S/D/T Art, B Bull, M Miss, Leertaste auslösen, R Zufall.' }),
  ]);
}

/** Beschreibt die aktuelle Auswahl (nur zur Anzeige auf der Schaltfläche). */
function buildThrowPreview() {
  if (selection.multiplier === 0 || selection.segment === null) return { notation: 'MISS' };
  if (selection.segment === 25) return { notation: selection.multiplier === 2 ? 'BULL' : '25' };
  const prefix = selection.multiplier === 3 ? 'T' : selection.multiplier === 2 ? 'D' : 'S';
  return { notation: `${prefix}${selection.segment}` };
}

/** Löst den aktuell gewählten Wurf aus. */
export function triggerSelectedThrow() {
  if (!provider) return null;
  const payload = {
    segment: selection.segment,
    multiplier: selection.multiplier,
  };
  if (selection.useCoordinates) {
    payload.x = selection.x;
    payload.y = selection.y;
  }
  return provider.throwDart(payload);
}

/** Löst einen Zufallswurf aus. */
export function triggerRandomThrow() {
  if (!provider) return null;
  return provider.randomThrow();
}

/** Startet oder stoppt die vordefinierte Testsequenz. */
export function toggleSequence() {
  if (!provider) return;
  if (provider.isSequenceRunning()) {
    provider.stopSequence();
    toast('Testsequenz gestoppt.', 'info');
  } else {
    provider.playSequence(DEMO_SEQUENCE, 3200, () => {
      toast('Testsequenz beendet.', 'good');
      rerender();
    });
    toast('Testsequenz läuft: Single, Double, Triple, Bull, Bullseye, Miss …', 'info');
  }
  rerender();
}

/**
 * Zeigt den zuletzt erzeugten Wurf und das Rohereignis an.
 * @param {import('../input/dart-provider.js').DartThrow} dartThrow
 */
export function showThrowInPanel(dartThrow) {
  const throwOutput = qs('#test-throw-output');
  const rawOutput = qs('#test-raw-output');
  if (throwOutput) {
    const { raw, ...withoutRaw } = dartThrow;
    setText(throwOutput, JSON.stringify(withoutRaw, null, 2));
  }
  if (rawOutput) {
    setText(rawOutput, dartThrow.raw === undefined ? '–' : JSON.stringify(dartThrow.raw, null, 2));
  }
}

/**
 * Verarbeitet Tastatureingaben des Testmodus.
 * @param {KeyboardEvent} event
 * @returns {boolean} true, wenn die Taste verarbeitet wurde
 */
export function handleTestKey(event) {
  const key = event.key;

  // Ziffern: mehrstellige Eingabe erlaubt (z. B. "2" + "0" = 20).
  if (/^[0-9]$/.test(key)) {
    digitBuffer += key;
    const asNumber = Number(digitBuffer);
    if (asNumber >= 1 && asNumber <= 20) {
      selection.segment = asNumber;
      if (selection.multiplier === 0) selection.multiplier = 1;
      rerender();
    }
    if (digitTimer) clearTimeout(digitTimer);
    digitTimer = setTimeout(() => { digitBuffer = ''; }, 900);
    return true;
  }

  switch (key.toLowerCase()) {
    case 's':
      selection.multiplier = 1;
      if (selection.segment === 25 || selection.segment === null) selection.segment = 20;
      rerender();
      return true;
    case 'd':
      selection.multiplier = 2;
      if (selection.segment === 25 || selection.segment === null) selection.segment = 20;
      rerender();
      return true;
    case 't':
      selection.multiplier = 3;
      if (selection.segment === 25 || selection.segment === null) selection.segment = 20;
      rerender();
      return true;
    case 'b':
      // Wiederholtes Drücken wechselt zwischen Outer Bull und Bullseye.
      selection.segment = 25;
      selection.multiplier = selection.multiplier === 1 ? 2 : 1;
      rerender();
      return true;
    case 'm':
      selection.segment = null;
      selection.multiplier = 0;
      rerender();
      return true;
    case 'r':
      triggerRandomThrow();
      return true;
    default:
      return false;
  }
}

/** Aktuelle Auswahl (für Tests und Debug). */
export function getSelection() {
  return { ...selection };
}
