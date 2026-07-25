/**
 * Szene 6 – Was damit möglich ist
 *
 * Sechs Karten mit dem tatsächlichen Funktionsumfang – keine Versprechen,
 * sondern das, was in der App vorhanden ist. Daneben läuft die echte
 * Anwendung im Hochformat auf einem Telefonrahmen.
 *
 * Dauer: 13 s (Start 94 s)
 */

import {
  at, ease, clamp, lerp, alpha, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, easeOutBack, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, bloom, glowDot, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitWords, set, place, ICONS } from '../lib/ui.js';
import { revealStagger, camera } from '../lib/timeline.js';
import { AppFrame } from '../lib/appframe.js';

/** Der Funktionsumfang, wie er in README.md dokumentiert ist. */
const FEATURES = [
  {
    icon: ICONS.bolt, color: COLORS.mint,
    title: 'Testmodus',
    text: 'Jeder Wurf ohne Scheibe: Segment, Double, Triple, Bull, Miss – auch per Tastatur.',
  },
  {
    icon: ICONS.players, color: COLORS.cyan,
    title: '1 bis 6 Spieler',
    text: 'Namen, Farben und Reihenfolge. Schläge je Bahn, Par-Differenz, Rangliste.',
  },
  {
    icon: ICONS.course, color: COLORS.violet,
    title: 'Bahnen als Daten',
    text: 'Drei Layouts, wahlweise 3, 6 oder 9 Bahnen. Eine neue Bahn ist eine Datei.',
  },
  {
    icon: ICONS.shield, color: COLORS.magenta,
    title: 'Zugschutz',
    text: 'Doppelte Treffer, Cooldown und Sperre während der Ballbewegung greifen automatisch.',
  },
  {
    icon: ICONS.offline, color: COLORS.mint,
    title: 'PWA & offline',
    text: 'Installierbar, nach dem ersten Laden ohne Internet spielbar. Alles bleibt lokal.',
  },
  {
    icon: ICONS.screens, color: COLORS.cyan,
    title: 'TV & Smartphone',
    text: 'Vollbild auf dem Fernseher, große Touch-Ziele auf dem Handy, kein Seitenversatz.',
  },
];

/** Rasterposition der Karten. */
const GRID = { x: 132, y: 318, w: 560, h: 172, gapX: 34, gapY: 24, cols: 2 };

export const scene = {
  id: 's6-features',
  start: 94,
  dur: 13,

  build(root) {
    const kicker = place(el('div', { class: 'kicker', text: 'Möglichkeiten' }), { left: 132, top: 158 });
    const head = place(el('div', {}), { left: 132, top: 198, width: 1200 });
    const headWords = splitWords('Was damit möglich ist.', { class: 'h2' });
    head.appendChild(headWords.node);

    const cards = FEATURES.map((feature, i) => {
      const col = i % GRID.cols;
      const row = Math.floor(i / GRID.cols);
      const card = place(el('div', { class: 'card' }), {
        left: GRID.x + col * (GRID.w + GRID.gapX),
        top: GRID.y + row * (GRID.h + GRID.gapY),
        width: GRID.w,
        height: GRID.h,
      });
      card.style.padding = '26px 30px';
      card.style.setProperty('--accent', feature.color);
      card.style.borderColor = alpha(feature.color, 0.2);

      const iconWrap = el('div', {
        html: feature.icon,
        style: { width: '44px', height: '44px', marginBottom: '12px' },
      });
      const title = el('div', {
        text: feature.title,
        style: { fontSize: '36px', fontWeight: '700', letterSpacing: '-0.01em' },
      });
      const body = el('div', {
        text: feature.text,
        style: { fontSize: '23px', lineHeight: '1.32', color: 'var(--dim)', marginTop: '6px' },
      });
      card.append(iconWrap, title, body);
      return { card, iconWrap, feature };
    });

    /* Die echte App im Hochformat – kein Mockup. */
    const phone = new AppFrame({
      src: '../../index.html?vclock=1',
      width: 390,
      height: 844,
      cursor: false,
    });
    phone.shell.style.borderRadius = '38px';
    phone.device.style.width = '390px';
    phone.device.style.height = '844px';

    const phoneLabel = place(el('div', { class: 'mono', text: 'dieselbe App im Hochformat' }), {
      left: 1420, top: 890, width: 420,
    });
    phoneLabel.style.textAlign = 'center';
    phoneLabel.style.fontSize = '22px';
    phoneLabel.style.color = 'var(--dim)';

    root.append(kicker, head, ...cards.map((c) => c.card), phone.device, phoneLabel);

    return { kicker, head, headWords: headWords.words, cards, phone, phoneLabel };
  },

  render(t, { back, front, refs, root }) {
    /* --------------------------------- Kamera ------------------------------- */
    const cam = camera(root, {
      x: drift(t * 0.3, 7) * 4,
      y: drift(t * 0.3, 3) * 3 - easeInOutCubic(at(t, 0, 12)) * 10,
      scale: 1 + easeInOutCubic(at(t, 0, 12)) * 0.02,
      ox: 960,
      oy: 560,
    });

    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t + 190, { intensity: 0.4, a: COLORS.violet, b: COLORS.mint });
    dotGrid(back, 0.1, { offsetY: -t * 4 });
    dust(back, t + 190, { opacity: 0.1 });

    /* ------------------------------- Kopfzeile ------------------------------ */
    set(refs.kicker, { opacity: ease(t, 0.1, 0.5) * (1 - ease(t, 12.2, 0.6)) });
    revealStagger(refs.headWords, t, {
      start: 0.15, step: 0.06, dur: 0.85, y: 38, blur: 10, ease: easeOutQuint,
      outStart: 12.1, outDur: 0.6,
    });

    /* -------------------------------- Karten -------------------------------- */
    // Die Karten kommen versetzt herein und werden beim Erscheinen kurz betont.
    refs.cards.forEach((entry, i) => {
      const start = 0.6 + i * 0.22;
      const p = easeOutQuint(clamp(at(t, start, 0.9)));
      const out = easeInCubic(at(t, 12.0 + i * 0.03, 0.7));
      set(entry.card, {
        x: (1 - p) * 40,
        y: (1 - p) * 26 - out * 24,
        scale: lerp(0.95, 1, p),
        opacity: p * (1 - out),
        blur: (1 - p) * 9,
      });

      // Symbol pulsiert einmal, sobald die Karte steht.
      const pulse = 1 + Math.sin(clamp(at(t, start + 0.35, 0.6)) * Math.PI) * 0.16;
      entry.iconWrap.style.transform = `scale(${pulse})`;

      // Ein Lichtschein hinter der zuletzt erschienenen Karte.
      const glow = Math.sin(clamp(at(t, start, 1.4)) * Math.PI);
      if (glow > 0.02) {
        const left = GRID.x + (i % GRID.cols) * (GRID.w + GRID.gapX) + GRID.w / 2;
        const top = GRID.y + Math.floor(i / GRID.cols) * (GRID.h + GRID.gapY) + GRID.h / 2;
        bloom(back, left, top, 420, entry.feature.color, 0.075 * glow);
      }
    });

    /* -------------------------------- Telefon ------------------------------- */
    const phoneIn = easeOutQuint(clamp(at(t, 1.4, 1.2)));
    const phoneOut = easeInCubic(at(t, 12.1, 0.7));
    // Der Rahmen sitzt rechts, leicht gekippt, und läuft mit der echten App.
    const scale = 0.72;
    const px = 1436 - (1 - phoneIn) * -60;
    const py = 246 + (1 - phoneIn) * 70 - phoneOut * 30;
    refs.phone.device.style.transformOrigin = '0 0';
    refs.phone.device.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`;
    refs.phone.device.style.opacity = String(phoneIn * (1 - phoneOut));
    refs.phone.advanceTo(t + 0.05);

    set(refs.phoneLabel, {
      y: (1 - phoneIn) * 20,
      opacity: phoneIn * (1 - phoneOut) * 0.9,
    });
  },
};
