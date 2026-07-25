/**
 * DartGolf – Render-Studio: Zeitachse
 *
 * Hält die Szenen, blendet sie zur richtigen Zeit ein und zeichnet die
 * Übergänge. Es gibt genau einen Eintrittspunkt: `render(t)`.
 *
 * Szenen dürfen sich zeitlich überlappen – dadurch entstehen echte Übergänge
 * statt harter Schnitte.
 */

import { clamp, at, easeInOutCubic, easeOutCubic, easeInCubic } from './easing.js';
import { curtain, lightSweep, flash, W, H } from './draw.js';
import { el } from './ui.js';

/**
 * @typedef {Object} Scene
 * @property {string} id
 * @property {number} start Beginn in Sekunden
 * @property {number} dur Dauer in Sekunden
 * @property {(root: HTMLElement) => Object} build einmaliger Aufbau, liefert Referenzen
 * @property {(t: number, ctx: SceneContext) => void} render pro Frame, t = lokale Zeit
 */

/**
 * @typedef {Object} SceneContext
 * @property {CanvasRenderingContext2D} back
 * @property {CanvasRenderingContext2D} front
 * @property {Object} refs Rückgabe von build()
 * @property {number} global globale Zeit
 * @property {HTMLElement} root
 */

export class Timeline {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.layers Container für die Szenen-DOM-Ebenen
   * @param {CanvasRenderingContext2D} options.back
   * @param {CanvasRenderingContext2D} options.front
   */
  constructor({ layers, back, front }) {
    this.layers = layers;
    this.back = back;
    this.front = front;
    /** @type {Array<Scene & {root: HTMLElement, refs: Object}>} */
    this.scenes = [];
    /** @type {Array<{at:number, dur:number, kind:string, options?:Object}>} */
    this.transitions = [];
    /** @type {Array<{start:number, end:number, text:string}>} */
    this.subtitles = [];

    this.subtitleNode = el('div', { id: 'subtitle' });
    this.progressNode = el('div', { id: 'progress' });
    document.getElementById('stage').append(this.subtitleNode, this.progressNode);

    this.duration = 0;
  }

  /**
   * Registriert eine Szene. Die Reihenfolge der Aufrufe ist die Zeichenreihenfolge.
   * @param {Scene} scene
   */
  add(scene) {
    const root = el('div', { class: 'scene', 'data-scene': scene.id });
    this.layers.appendChild(root);
    const refs = scene.build ? scene.build(root) || {} : {};
    this.scenes.push({ ...scene, root, refs });
    this.duration = Math.max(this.duration, scene.start + scene.dur);
    return this;
  }

  /** Registriert einen Übergang, der über allem liegt. */
  addTransition(entry) {
    this.transitions.push(entry);
    return this;
  }

  /** Registriert Untertitelzeilen (ersetzen die Sprecherstimme im Bild). */
  addSubtitles(list) {
    this.subtitles.push(...list);
    return this;
  }

  /**
   * Zeichnet den Zustand zum Zeitpunkt t.
   * @param {number} t Sekunden
   */
  render(t) {
    const { back, front } = this;

    back.setTransform(1, 0, 0, 1, 0, 0);
    back.clearRect(0, 0, W, H);
    front.setTransform(1, 0, 0, 1, 0, 0);
    front.clearRect(0, 0, W, H);

    // Kamera der Bühne zurücksetzen; jede Szene bewegt nur ihre eigene Ebene.
    this.layers.style.transform = 'none';

    for (const scene of this.scenes) {
      const local = t - scene.start;
      const active = local >= -0.001 && local <= scene.dur + 0.001;

      if (!active) {
        if (scene.root.style.visibility !== 'hidden') {
          scene.root.style.visibility = 'hidden';
          scene.root.style.opacity = '0';
        }
        continue;
      }

      scene.root.style.visibility = 'visible';
      scene.root.style.opacity = '1';
      scene.render(local, {
        back,
        front,
        refs: scene.refs,
        root: scene.root,
        global: t,
      });
    }

    this._renderTransitions(t);
    this._renderSubtitle(t);
    this.progressNode.style.width = `${clamp(t / this.duration) * W}px`;
  }

  /** Übergänge liegen auf der Vordergrundebene. */
  _renderTransitions(t) {
    for (const tr of this.transitions) {
      const p = (t - tr.at) / tr.dur;
      if (p <= -0.001 || p >= 1.001) continue;

      if (tr.kind === 'sweep') {
        lightSweep(this.front, p, tr.options);
      } else if (tr.kind === 'flash') {
        flash(this.front, p, tr.options);
      } else {
        curtain(this.front, p, tr.kind, tr.options);
      }
    }
  }

  /**
   * Untertitel: erscheinen weich, verschwinden weich, immer an derselben Stelle.
   */
  _renderSubtitle(t) {
    let active = null;
    for (const line of this.subtitles) {
      if (t >= line.start && t <= line.end) { active = line; break; }
    }

    if (!active) {
      this.subtitleNode.style.opacity = '0';
      return;
    }

    if (this.subtitleNode.dataset.text !== active.text) {
      this.subtitleNode.dataset.text = active.text;
      this.subtitleNode.textContent = active.text;
    }

    const fade = 0.32;
    const inP = easeOutCubic(at(t, active.start, fade));
    const outP = 1 - easeInCubic(at(t, active.end - fade, fade));
    const o = Math.min(inP, outP);
    this.subtitleNode.style.opacity = String(o * 0.97);
    this.subtitleNode.style.transform = `translateX(-50%) translateY(${(1 - o) * 16}px)`;
  }
}

/**
 * Setzt die Kamera einer Szene auf ihre DOM-Ebene und gibt die Werte zurück,
 * damit die Canvas-Ebenen exakt dieselbe Bewegung anwenden können
 * (siehe `withCamera` in draw.js).
 *
 * @param {HTMLElement} root
 * @param {{x?:number, y?:number, scale?:number, ox?:number, oy?:number}} cam
 */
export function camera(root, cam = {}) {
  const {
    x = 0, y = 0, scale = 1, ox = 960, oy = 540,
  } = cam;
  root.style.transformOrigin = `${ox}px ${oy}px`;
  root.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  return { x, y, scale, ox, oy };
}

/**
 * Hilfsfunktion für Szenen: gestaffelte Einblendung einer Elementliste.
 *
 * @param {HTMLElement[]} nodes
 * @param {number} t lokale Zeit
 * @param {Object} options
 * @param {number} [options.start]
 * @param {number} [options.step] Abstand zwischen den Elementen
 * @param {number} [options.dur] Dauer pro Element
 * @param {number} [options.y] Startversatz in px
 * @param {number} [options.scale] Startgröße
 * @param {number} [options.blur] Startunschärfe
 * @param {number} [options.outStart] Zeitpunkt des Ausblendens (optional)
 * @param {number} [options.outDur]
 * @param {(v:number)=>number} [options.ease]
 */
export function revealStagger(nodes, t, options = {}) {
  const {
    start = 0, step = 0.055, dur = 0.72, y = 42, scale = 1, blur = 8,
    outStart = null, outDur = 0.4, ease = easeOutCubic, x = 0,
  } = options;

  nodes.forEach((node, i) => {
    const p = ease(at(t, start + i * step, dur));
    let o = p;
    let dy = (1 - p) * y;
    let dx = (1 - p) * x;
    let sc = 1 + (scale - 1) * (1 - p);
    let bl = (1 - p) * blur;

    if (outStart !== null) {
      const q = easeInCubic(at(t, outStart + i * step * 0.4, outDur));
      o *= 1 - q;
      dy -= q * 30;
      bl += q * 10;
    }

    node.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sc})`;
    node.style.opacity = String(o);
    node.style.filter = bl > 0.05 ? `blur(${bl}px)` : 'none';
  });
}
