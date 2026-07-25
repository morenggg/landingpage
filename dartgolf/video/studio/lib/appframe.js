/**
 * DartGolf – Render-Studio: die echte Web-App als Filmmotiv
 *
 * Für die Demo-Szenen wird nicht etwas nachgebaut, sondern die tatsächliche
 * Anwendung in einem iframe geladen und Frame für Frame weitergeschaltet.
 *
 * Möglich macht das die virtualisierte Zeit im iframe (siehe
 * build/render.mjs → installVirtualClock). Von außen gibt es genau einen
 * Hebel: `advanceTo(sekunden)`.
 *
 * Zusätzlich bringt diese Klasse mit:
 *   - einen gezeichneten Mauszeiger samt Klick-Welle (im iframe, damit er
 *     mit der Kamerafahrt mitskaliert),
 *   - Positionsabfragen echter Bedienelemente (für Zeiger und Beschriftungen),
 *   - eine Kamera (Verschiebung, Zoom) auf den Gerätrahmen.
 */

import { clamp, easeInOutCubic, easeOutCubic, easeOutQuint } from './easing.js';
import { el } from './ui.js';

/** Alle erzeugten Rahmen – der Renderer wartet auf deren Ladezustand. */
export const APP_FRAMES = [];

export class AppFrame {
  /**
   * @param {Object} options
   * @param {string} options.src Adresse der App (mit `vclock=1`)
   * @param {number} [options.width] Breite in App-Pixeln
   * @param {number} [options.height]
   * @param {boolean} [options.cursor] Mauszeiger einblenden
   */
  constructor({ src, width = 1920, height = 1080, cursor = true }) {
    this.src = src;
    this.width = width;
    this.height = height;
    this.wantCursor = cursor;
    this.loaded = false;
    this.clock = 0;

    this.device = el('div', { class: 'device' });
    this.device.style.width = `${width}px`;
    this.device.style.height = `${height}px`;

    this.shell = el('div', { class: 'device-shell' });
    this.iframe = el('iframe', {
      src,
      title: 'DartGolf',
      scrolling: 'no',
      // Der Rahmen läuft im selben Origin – nur so ist Frame-Steuerung möglich.
    });
    this.iframe.style.width = `${width}px`;
    this.iframe.style.height = `${height}px`;

    this.gloss = el('div', { class: 'device-gloss' });
    this.shell.append(this.iframe, this.gloss);
    this.device.appendChild(this.shell);

    this.readyPromise = new Promise((resolve) => {
      this.iframe.addEventListener('load', () => {
        this.loaded = true;
        if (this.wantCursor) this._installCursor();
        resolve(this);
      });
    });

    APP_FRAMES.push(this);
  }

  /** @returns {Window|null} */
  get win() {
    try { return this.iframe.contentWindow; } catch { return null; }
  }

  /** @returns {Document|null} */
  get doc() {
    try { return this.iframe.contentDocument; } catch { return null; }
  }

  /** Wartet, bis die App geladen ist. */
  ready() {
    return this.readyPromise;
  }

  /**
   * Schaltet die virtuelle Zeit der App auf `seconds`.
   * Nur vorwärts – genau wie eine Videospur.
   * @param {number} seconds
   */
  advanceTo(seconds) {
    const win = this.win;
    if (!win || !win.__v) return;
    const target = Math.max(0, seconds) * 1000;
    if (target <= this.clock) return;
    this.clock = target;
    win.__v.advanceTo(target);
  }

  /**
   * Mittelpunkt eines Bedienelements in App-Koordinaten.
   * @param {string} selector
   * @returns {{x:number, y:number, w:number, h:number}|null}
   */
  rect(selector) {
    const doc = this.doc;
    if (!doc) return null;
    const node = doc.querySelector(selector);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      w: r.width,
      h: r.height,
      left: r.left,
      top: r.top,
    };
  }

  /**
   * Mittelpunkt des ersten Elements, dessen Text passt.
   * Robuster als Positionsselektoren, weil die App ihre Panels neu aufbaut.
   * @param {string} selector
   * @param {string} textContent
   */
  rectByText(selector, textContent) {
    const doc = this.doc;
    if (!doc) return null;
    const node = [...doc.querySelectorAll(selector)]
      .find((n) => n.textContent.trim().startsWith(textContent));
    if (!node) return null;
    const r = node.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }

  /**
   * Klickt ein Element in der App an – über den echten DOM-Aufruf, damit die
   * App genau so reagiert wie bei einer Bedienung durch einen Menschen.
   * @param {string} selector
   * @returns {boolean} true, wenn das Element gefunden wurde
   */
  click(selector) {
    const doc = this.doc;
    if (!doc) return false;
    const node = doc.querySelector(selector);
    if (!node) return false;
    node.click();
    return true;
  }

  /**
   * Klickt das erste Element, dessen Text passt (für Schaltflächen ohne ID).
   * @param {string} selector
   * @param {string} textContent
   */
  clickByText(selector, textContent) {
    const doc = this.doc;
    if (!doc) return false;
    const node = [...doc.querySelectorAll(selector)]
      .find((n) => n.textContent.trim().startsWith(textContent));
    if (!node) return false;
    node.click();
    return true;
  }

  /** Tastendruck an die App schicken. */
  key(key) {
    const win = this.win;
    if (!win) return;
    win.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }));
  }

  /* ------------------------------- Kamera -------------------------------- */

  /**
   * Setzt Kamera auf den Gerätrahmen.
   * @param {{x:number, y:number, scale:number}} cam
   */
  camera({ x = 0, y = 0, scale = 1 }) {
    this.device.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }

  /**
   * Zoomt so, dass der Punkt (fx, fy) in App-Koordinaten auf der Bühne
   * an der Stelle (sx, sy) landet.
   * @param {number} fx App-X
   * @param {number} fy App-Y
   * @param {number} scale
   * @param {number} sx Bühnen-X
   * @param {number} sy Bühnen-Y
   */
  focus(fx, fy, scale, sx = 960, sy = 540) {
    this.camera({ x: sx - fx * scale, y: sy - fy * scale, scale });
  }

  /* ----------------------------- Mauszeiger ------------------------------ */

  /**
   * Baut Zeiger und Klick-Welle in das Dokument der App.
   *
   * Wichtig: Die App liefert eine Content Security Policy mit
   * `style-src 'self'` aus. Ein eingefügtes <style>-Element wäre damit
   * blockiert – deshalb werden alle Eigenschaften über das CSSOM gesetzt
   * (`element.style.…`), was von der Richtlinie erlaubt ist.
   */
  _installCursor() {
    const doc = this.doc;
    if (!doc) return;

    // Eigener Zeiger als SVG – klar erkennbar, ohne Systemgrafik.
    const cursor = doc.createElement('div');
    Object.assign(cursor.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147483000',
      width: '34px',
      height: '34px',
      margin: '-3px 0 0 -3px',
      pointerEvents: 'none',
      opacity: '0',
      filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.65))',
    });
    cursor.innerHTML = `<svg viewBox="0 0 34 34" width="34" height="34">
      <path d="M4 2 L4 26 L11 20 L15.5 30 L20 27.5 L15.5 18 L25 18 Z"
            fill="#ffffff" stroke="#0b1218" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
    doc.body.appendChild(cursor);

    const ripple = doc.createElement('div');
    Object.assign(ripple.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      zIndex: '2147482999',
      width: '22px',
      height: '22px',
      margin: '-11px 0 0 -11px',
      borderRadius: '50%',
      pointerEvents: 'none',
      opacity: '0',
      border: '3px solid #3ddc97',
    });
    doc.body.appendChild(ripple);

    this.cursor = cursor;
    this.ripple = ripple;
  }

  /**
   * Setzt den Zeiger auf eine Position in App-Koordinaten.
   * @param {number} x
   * @param {number} y
   * @param {number} opacity
   */
  setCursor(x, y, opacity = 1) {
    if (!this.cursor) return;
    this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.cursor.style.opacity = String(opacity);
  }

  /**
   * Zeichnet die Klick-Welle an einer Position.
   * @param {number} x
   * @param {number} y
   * @param {number} p 0..1 Fortschritt der Welle
   */
  setRipple(x, y, p) {
    if (!this.ripple) return;
    if (p <= 0 || p >= 1) {
      this.ripple.style.opacity = '0';
      return;
    }
    const scale = 1 + easeOutQuint(p) * 4.2;
    this.ripple.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    this.ripple.style.opacity = String((1 - p) ** 1.5 * 0.9);
  }
}

/**
 * Interpoliert eine Kamerafahrt aus Schlüsselbildern.
 *
 * @param {Array<{at:number, fx:number, fy:number, scale:number, sx?:number, sy?:number}>} keys
 * @param {number} t
 * @returns {{fx:number, fy:number, scale:number, sx:number, sy:number}}
 */
export function cameraTrack(keys, t) {
  if (keys.length === 0) return { fx: 960, fy: 540, scale: 1, sx: 960, sy: 540 };
  if (t <= keys[0].at) return { sx: 960, sy: 540, ...keys[0] };

  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a.at && t <= b.at) {
      const p = easeInOutCubic(clamp((t - a.at) / (b.at - a.at)));
      return {
        fx: a.fx + (b.fx - a.fx) * p,
        fy: a.fy + (b.fy - a.fy) * p,
        scale: a.scale + (b.scale - a.scale) * p,
        sx: (a.sx ?? 960) + ((b.sx ?? 960) - (a.sx ?? 960)) * p,
        sy: (a.sy ?? 540) + ((b.sy ?? 540) - (a.sy ?? 540)) * p,
      };
    }
  }
  return { sx: 960, sy: 540, ...keys[keys.length - 1] };
}

/**
 * Führt Schritte einer Ablaufliste genau einmal aus, sobald ihre Zeit erreicht
 * ist. Da die Zeit beim Rendern streng vorwärts läuft, genügt ein Merker.
 *
 * @param {Array<{at:number, run:() => void}>} steps
 * @param {number} t
 * @param {Set<number>} done
 */
export function runSteps(steps, t, done) {
  steps.forEach((step, index) => {
    if (done.has(index)) return;
    if (t >= step.at) {
      done.add(index);
      try { step.run(); } catch (err) { console.error('[Studio] Schritt fehlgeschlagen:', err); }
    }
  });
}

/**
 * Zeigerbewegung aus einer Liste von Zielen.
 * Jedes Ziel ist ein Selektor in der App; die Position wird live abgefragt,
 * damit sich Layoutänderungen nicht auf das Skript auswirken.
 *
 * @param {AppFrame} frame
 * @param {Array<{at:number, sel?:string, x?:number, y?:number, dur?:number}>} moves
 * @param {number} t
 * @returns {{x:number, y:number}|null}
 */
export function cursorTrack(frame, moves, t) {
  let current = null;
  let previous = null;

  for (const move of moves) {
    if (t >= move.at) {
      previous = current;
      current = move;
    }
  }
  if (!current) return null;

  const resolve = (move) => {
    if (!move) return null;
    if (move.sel && move.text) {
      const r = frame.rectByText(move.sel, move.text);
      if (r) return { x: r.x, y: r.y };
      return move.fallback || null;
    }
    if (move.sel) {
      const r = frame.rect(move.sel);
      if (r) return { x: r.x, y: r.y };
      return move.fallback || null;
    }
    return { x: move.x, y: move.y };
  };

  const to = resolve(current);
  if (!to) return null;
  const from = resolve(previous) || to;
  const dur = current.dur ?? 0.8;
  const p = easeInOutCubic(clamp((t - current.at) / dur));

  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p,
  };
}
