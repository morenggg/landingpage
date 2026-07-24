/**
 * DartGolf – Spiel-Engine
 *
 * Verbindet Eingabe, Physik, Regeln und Darstellung:
 *
 *   DartThrow -> Zugfilter -> Schlagberechnung -> Ballphysik -> Ereignisse
 *
 * Die Engine kennt keine Trefferquelle und keine DOM-Oberfläche. Sie meldet
 * Ereignisse über Callbacks; die UI entscheidet, was daraus wird.
 *
 * Zeitsteuerung: ein einziger requestAnimationFrame-Loop mit fester
 * Simulationsschrittweite. Verzögerungen (Vorschau, Nachlauf) laufen über
 * denselben Loop, damit "Pause" wirklich alles anhält.
 */

import { PHYSICS, TIMING, RULES, CONTROL_MODE } from '../config.js';
import { TURN_PHASE } from '../state.js';
import { createBall, placeBall, strikeBall, integrate, speedOf, angleToVector, distanceForPower } from './golf-physics.js';
import { resolveCollisions } from './collision-system.js';
import { computeShot } from './shot-mapper.js';
import { TurnManager, REJECT, REJECT_TEXT } from './turn-manager.js';
import {
  addStrokes, currentCourse, currentPlayer, strokesOnCurrentHole,
  finishHoleForCurrentPlayer,
} from './scoring.js';

/** Prüft, ob der Nutzer reduzierte Bewegung wünscht. */
function prefersReducedMotion() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export class GameEngine {
  /**
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {Object} [options.sound] SoundManager mit play(name)
   * @param {Object} [options.callbacks]
   */
  constructor({ canvas, sound, callbacks = {} }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = sound || { play() {} };
    this.callbacks = callbacks;

    /** @type {import('./scoring.js').Match|null} */
    this.match = null;
    /** @type {TurnManager|null} */
    this.turnManager = null;
    /** @type {import('./course-manager.js').PreparedCourse|null} */
    this.course = null;
    this.ball = createBall({ x: 0, y: 0 });

    this.phase = TURN_PHASE.IDLE;
    this.paused = false;
    this.running = false;

    /** Aktuell vorbereiteter Schlag (während der Vorschau). */
    this.pendingShot = null;
    /** Letzter ausgeführter Schlag – für HUD und Debug. */
    this.lastShot = null;

    /** Interner Timer, der mit dem Spiel pausiert. */
    this._timer = null;

    /** Spur des Balls für die Darstellung. */
    this._trail = [];
    this._reducedMotion = prefersReducedMotion();

    /** Anzeige-Hilfen. */
    this._animationTime = 0;
    this._lastFrameTime = 0;
    this._accumulator = 0;
    this._fps = 0;
    this._fpsSamples = [];
    this._wallSoundCooldown = 0;

    this._frame = this._frame.bind(this);
    this._resize = this._resize.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._resize);
      if (typeof matchMedia === 'function') {
        const query = matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => { this._reducedMotion = query.matches; };
        if (query.addEventListener) query.addEventListener('change', update);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Lebenszyklus
   * ------------------------------------------------------------------ */

  /**
   * Startet ein Spiel.
   * @param {import('./scoring.js').Match} match
   */
  startMatch(match) {
    this.match = match;
    this.turnManager = new TurnManager(match);
    this.paused = false;
    this._resize();
    this.loadCurrentHole();
    if (!this.running) {
      this.running = true;
      this._lastFrameTime = 0;
      requestAnimationFrame(this._frame);
    }
  }

  /** Beendet den Loop und gibt Ressourcen frei. */
  stop() {
    this.running = false;
    this._timer = null;
    this.match = null;
    this.turnManager = null;
    this.course = null;
    this._setPhase(TURN_PHASE.IDLE);
  }

  /** Lädt die aktuelle Bahn für den aktuellen Spieler. */
  loadCurrentHole() {
    this.course = currentCourse(this.match);
    placeBall(this.ball, this.course.start);
    this._trail.length = 0;
    this.pendingShot = null;
    this.lastShot = null;
    this._timer = null;
    if (this.turnManager) {
      this.turnManager.clearQueue();
      this.turnManager.resetCooldown();
    }
    this._setPhase(TURN_PHASE.AWAITING_THROW);
    this._emit('onHoleReady', {
      course: this.course,
      player: currentPlayer(this.match),
    });
  }

  /** Pausiert bzw. setzt fort. */
  setPaused(paused) {
    this.paused = paused;
    this._emit('onPause', paused);
  }

  /* ------------------------------------------------------------------ *
   * Eingabe
   * ------------------------------------------------------------------ */

  /**
   * Nimmt einen Wurf entgegen.
   * @param {import('../input/dart-provider.js').DartThrow} dartThrow
   * @returns {{accepted:boolean, reason?:string}}
   */
  handleThrow(dartThrow) {
    if (!this.match || !this.turnManager) {
      return { accepted: false, reason: REJECT.NOT_READY };
    }
    if (this.paused) {
      return { accepted: false, reason: REJECT.NOT_READY };
    }

    const result = this.turnManager.filterThrow(dartThrow, this.phase);
    if (!result.accepted) {
      this._emit('onThrowRejected', {
        dartThrow,
        reason: result.reason,
        text: REJECT_TEXT[result.reason] || 'Wurf ignoriert.',
      });
      return result;
    }

    this.sound.play('dart');
    this._beginShot(dartThrow);
    return result;
  }

  /**
   * Berechnet den Schlag und startet die Vorschau.
   * @param {import('../input/dart-provider.js').DartThrow} dartThrow
   */
  _beginShot(dartThrow) {
    const settings = this.match.settings || {};
    const shot = computeShot(dartThrow, {
      ballPosition: this.ball.position,
      holePosition: this.course.hole,
      controlMode: settings.controlMode || CONTROL_MODE.SIMPLE,
      useCoordinates: Boolean(settings.useCoordinates),
    });

    this.pendingShot = { dartThrow, shot };
    this.lastShot = shot;
    this._emit('onShotPlanned', { dartThrow, shot });
    this._setPhase(TURN_PHASE.PREVIEW);

    // Bei reduzierter Bewegung wird die Vorschau deutlich verkürzt.
    const previewMs = this._reducedMotion ? 220 : TIMING.aimPreviewMs;
    this._setTimer(previewMs, () => this._executeShot());
  }

  /** Führt den vorbereiteten Schlag aus. */
  _executeShot() {
    if (!this.pendingShot) return;
    const { dartThrow, shot } = this.pendingShot;
    this.pendingShot = null;

    const strokes = addStrokes(this.match, 1);
    this._emit('onStroke', { dartThrow, shot, strokes });

    if (shot.power <= 0 || shot.angleDeg === null) {
      // Miss: kein Ballkontakt, der Schlag ist aber gezählt.
      if (RULES.missCountsAsStroke) {
        this._emit('onMiss', { dartThrow, strokes });
      }
      this._setPhase(TURN_PHASE.SETTLING);
      this._setTimer(TIMING.settleDelayMs, () => this._afterSettle(false));
      return;
    }

    strikeBall(this.ball, shot.angleDeg, shot.power);
    this._trail.length = 0;
    // Restzeit aus dem vorherigen Schlag verwerfen, damit jeder Schlag
    // reproduzierbar mit einem vollen Simulationsschritt beginnt.
    this._accumulator = 0;
    this.sound.play('hit');
    this._setPhase(TURN_PHASE.BALL_MOVING);
  }

  /* ------------------------------------------------------------------ *
   * Simulation
   * ------------------------------------------------------------------ */

  /**
   * Ein Frame: Zeit verwalten, Timer bedienen, Physik nachrechnen, zeichnen.
   * @param {number} timestamp
   */
  _frame(timestamp) {
    if (!this.running) return;
    requestAnimationFrame(this._frame);

    if (!this._lastFrameTime) this._lastFrameTime = timestamp;
    let delta = (timestamp - this._lastFrameTime) / 1000;
    this._lastFrameTime = timestamp;
    if (delta > PHYSICS.maxFrameTime) delta = PHYSICS.maxFrameTime;

    this._trackFps(delta);

    if (!this.paused) {
      this._animationTime += delta;
      this._tickTimer(delta);
      if (this.phase === TURN_PHASE.BALL_MOVING) this._simulate(delta);
      if (this._wallSoundCooldown > 0) this._wallSoundCooldown -= delta;
    }

    this._render();
  }

  /**
   * Physik mit fester Schrittweite.
   * @param {number} delta
   */
  _simulate(delta) {
    this._accumulator += delta;
    let steps = 0;
    let hazardHit = null;
    let holed = false;
    let wallHits = 0;

    while (this._accumulator >= PHYSICS.fixedStep && steps < 240) {
      this._accumulator -= PHYSICS.fixedStep;
      steps += 1;

      integrate(this.ball, PHYSICS.fixedStep);
      const result = resolveCollisions(this.ball, this.course);
      wallHits += result.wallHits;
      if (result.hazard && !hazardHit) hazardHit = result.hazard;
      if (result.holed) { holed = true; break; }
      if (!this.ball.moving) break;
    }

    // Spur für die Darstellung (nur bei normaler Bewegungsdarstellung).
    if (!this._reducedMotion) {
      this._trail.push({ x: this.ball.position.x, y: this.ball.position.y });
      if (this._trail.length > 26) this._trail.shift();
    }

    if (wallHits > 0 && this._wallSoundCooldown <= 0 && speedOf(this.ball) > 60) {
      this.sound.play('wall');
      this._wallSoundCooldown = 0.12;
    }

    if (holed) {
      this._handleHoled();
      return;
    }

    if (hazardHit) {
      this._handleHazard(hazardHit);
      return;
    }

    if (!this.ball.moving) {
      this._setPhase(TURN_PHASE.SETTLING);
      this._setTimer(TIMING.settleDelayMs, () => this._afterSettle(false));
    }
  }

  /** Ball ist im Loch. */
  _handleHoled() {
    this.ball.velocity.x = 0;
    this.ball.velocity.y = 0;
    this.ball.moving = false;
    this.ball.position.x = this.course.hole.x;
    this.ball.position.y = this.course.hole.y;
    this.sound.play('holed');
    this._setPhase(TURN_PHASE.SETTLING);
    this._setTimer(TIMING.settleDelayMs, () => this._afterSettle(true));
  }

  /**
   * Ball in Wasser oder im Aus.
   * @param {{kind:string, name?:string}} hazard
   */
  _handleHazard(hazard) {
    this.ball.velocity.x = 0;
    this.ball.velocity.y = 0;
    this.ball.moving = false;
    this.sound.play('hazard');

    const penalty = RULES.hazardPenalty;
    const strokes = addStrokes(this.match, penalty);

    // Zurück auf die letzte sichere Position (Stand vor dem Schlag).
    placeBall(this.ball, this.ball.safePosition);
    this._trail.length = 0;

    this._emit('onHazard', { hazard, penalty, strokes });
    this._setPhase(TURN_PHASE.SETTLING);
    this._setTimer(TIMING.settleDelayMs, () => this._afterSettle(false));
  }

  /**
   * Nach dem Stillstand: Bahn beendet oder nächster Wurf.
   * @param {boolean} holed
   */
  _afterSettle(holed) {
    const strokes = strokesOnCurrentHole(this.match);
    const end = TurnManager.evaluateHoleEnd(holed, strokes);

    if (!end.done) {
      this._setPhase(TURN_PHASE.AWAITING_THROW);
      // Vorgemerkte Würfe (falls die Warteschlange aktiviert ist) nachholen.
      const queued = this.turnManager.takeQueued();
      if (queued) this.handleThrow(queued);
      return;
    }

    finishHoleForCurrentPlayer(this.match, holed);
    this.sound.play('holeComplete');
    this._setPhase(TURN_PHASE.HOLE_DONE);
    this._emit('onHoleFinished', {
      player: currentPlayer(this.match),
      course: this.course,
      strokes: strokesOnCurrentHole(this.match),
      holed,
      reason: end.reason,
    });
  }

  /**
   * Schaltet nach der Bahn-Zusammenfassung weiter.
   * Wird von der UI aufgerufen, damit das Tempo steuerbar bleibt.
   * @returns {{type:string}}
   */
  advance() {
    const result = this.turnManager.advance();
    if (result.type === 'gameEnd') {
      this._setPhase(TURN_PHASE.FINISHED);
      this.sound.play('gameComplete');
      this._emit('onGameEnd', { match: this.match });
      return result;
    }
    if (result.type === 'nextPlayer') this.sound.play('playerChange');
    this.loadCurrentHole();
    this._emit(result.type === 'nextHole' ? 'onHoleChanged' : 'onPlayerChanged', {
      player: currentPlayer(this.match),
      course: currentCourse(this.match),
    });
    return result;
  }

  /* ------------------------------------------------------------------ *
   * Interner Timer (pausierbar)
   * ------------------------------------------------------------------ */

  _setTimer(ms, callback) {
    this._timer = { remaining: ms / 1000, callback };
  }

  _tickTimer(delta) {
    if (!this._timer) return;
    this._timer.remaining -= delta;
    if (this._timer.remaining <= 0) {
      const { callback } = this._timer;
      this._timer = null;
      callback();
    }
  }

  /* ------------------------------------------------------------------ *
   * Darstellung
   * ------------------------------------------------------------------ */

  /** Passt die Canvas-Auflösung an die Anzeigegröße an (inkl. Retina). */
  _resize() {
    const canvas = this.canvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  /** Berechnet Maßstab und Versatz, damit die Bahn vollständig sichtbar ist. */
  _viewTransform() {
    const { width, height } = this.canvas;
    const course = this.course;
    const margin = 0.045;
    const scale = Math.min(
      (width * (1 - margin)) / course.width,
      (height * (1 - margin)) / course.height,
    );
    return {
      scale,
      offsetX: (width - course.width * scale) / 2,
      offsetY: (height - course.height * scale) / 2,
    };
  }

  _render() {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = this.canvas;

    if (!this.course) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    this._resize();
    const view = this._viewTransform();

    // Hintergrund
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.course.theme.background;
    ctx.fillRect(0, 0, width, height);

    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);

    this._drawFairway(ctx);
    this._drawHazards(ctx);
    this._drawStart(ctx);
    this._drawHole(ctx);
    this._drawObstacles(ctx);
    this._drawTrail(ctx);
    this._drawAimPreview(ctx);
    this._drawBall(ctx);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _drawFairway(ctx) {
    const course = this.course;
    ctx.save();
    ctx.beginPath();
    course.polygon.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, course.width, course.height);
    gradient.addColorStop(0, course.theme.fairway);
    gradient.addColorStop(1, course.theme.fairwayEdge);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.lineJoin = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = course.theme.accent;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawHazards(ctx) {
    for (const hazard of this.course.hazards) {
      ctx.save();
      const isWater = hazard.kind === 'water';
      ctx.fillStyle = isWater ? 'rgba(56,140,220,0.42)' : 'rgba(220,80,60,0.30)';
      ctx.strokeStyle = isWater ? 'rgba(120,200,255,0.8)' : 'rgba(255,140,110,0.85)';
      ctx.lineWidth = 3;
      ctx.setLineDash(isWater ? [] : [14, 10]);

      ctx.beginPath();
      if (hazard.shape === 'circle') {
        ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      } else {
        ctx.rect(hazard.x, hazard.y, hazard.w, hazard.h);
      }
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Wellenlinien als Wasser-Andeutung (statisch bei reduzierter Bewegung).
      if (isWater && hazard.shape !== 'circle') {
        ctx.strokeStyle = 'rgba(160,220,255,0.45)';
        ctx.lineWidth = 2;
        const phase = this._reducedMotion ? 0 : this._animationTime * 1.4;
        for (let row = hazard.y + 18; row < hazard.y + hazard.h - 6; row += 22) {
          ctx.beginPath();
          for (let x = hazard.x + 6; x <= hazard.x + hazard.w - 6; x += 8) {
            const y = row + Math.sin((x / 26) + phase) * 3;
            if (x === hazard.x + 6) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  _drawObstacles(ctx) {
    for (const obstacle of this.course.obstacles || []) {
      ctx.save();
      ctx.fillStyle = 'rgba(12,16,22,0.92)';
      ctx.strokeStyle = this.course.theme.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (obstacle.shape === 'circle') {
        ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
      } else if (obstacle.shape === 'polygon') {
        obstacle.points.forEach(([x, y], index) => {
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      } else {
        const radius = Math.min(10, obstacle.w / 2, obstacle.h / 2);
        this._roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, radius);
      }
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  _roundedRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _drawStart(ctx) {
    const { start } = this.course;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawHole(ctx) {
    const { hole, theme } = this.course;
    ctx.save();

    // Zielmarkierung: dezenter Ring um das Loch.
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = this._reducedMotion ? 0.4 : 0.3 + 0.18 * Math.sin(this._animationTime * 2.4);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Loch
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fahne
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hole.x, hole.y - 4);
    ctx.lineTo(hole.x, hole.y - 62);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.moveTo(hole.x, hole.y - 62);
    ctx.lineTo(hole.x + 30, hole.y - 52);
    ctx.lineTo(hole.x, hole.y - 42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawTrail(ctx) {
    if (this._trail.length < 2) return;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 1; i < this._trail.length; i += 1) {
      const alpha = (i / this._trail.length) * 0.35;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(this._trail[i - 1].x, this._trail[i - 1].y);
      ctx.lineTo(this._trail[i].x, this._trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Zeigt Richtung und Stärke des geplanten Schlags. */
  _drawAimPreview(ctx) {
    if (this.phase !== TURN_PHASE.PREVIEW || !this.pendingShot) return;
    const { shot } = this.pendingShot;
    if (shot.angleDeg === null || shot.power <= 0) return;

    const dir = angleToVector(shot.angleDeg);
    const length = Math.min(distanceForPower(shot.power), 520);
    const from = this.ball.position;
    const to = { x: from.x + dir.x * length, y: from.y + dir.y * length };
    const color = this._currentPlayerColor();

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.setLineDash([16, 12]);
    ctx.lineDashOffset = this._reducedMotion ? 0 : -this._animationTime * 90;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pfeilspitze
    const head = 22;
    const left = { x: to.x - dir.x * head + dir.y * head * 0.55, y: to.y - dir.y * head - dir.x * head * 0.55 };
    const right = { x: to.x - dir.x * head - dir.y * head * 0.55, y: to.y - dir.y * head + dir.x * head * 0.55 };
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawBall(ctx) {
    const color = this._currentPlayerColor();
    const { position, radius } = this.ball;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = this._reducedMotion ? 0 : 18;
    ctx.fillStyle = '#f7fbff';
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
  }

  _currentPlayerColor() {
    if (!this.match) return '#3ddc97';
    return currentPlayer(this.match).color;
  }

  /* ------------------------------------------------------------------ *
   * Hilfsfunktionen
   * ------------------------------------------------------------------ */

  _setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this._emit('onPhaseChange', phase);
  }

  _emit(name, payload) {
    const fn = this.callbacks[name];
    if (typeof fn === 'function') {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[DartGolf] Fehler im Callback ${name}:`, err);
      }
    }
  }

  _trackFps(delta) {
    if (delta <= 0) return;
    this._fpsSamples.push(1 / delta);
    if (this._fpsSamples.length > 30) this._fpsSamples.shift();
    this._fps = this._fpsSamples.reduce((a, b) => a + b, 0) / this._fpsSamples.length;
  }

  /** Momentaufnahme für das Debug-Panel. */
  getDebugSnapshot() {
    return {
      phase: this.phase,
      paused: this.paused,
      fps: Math.round(this._fps),
      ball: {
        x: Math.round(this.ball.position.x),
        y: Math.round(this.ball.position.y),
        speed: Math.round(speedOf(this.ball)),
      },
      course: this.course ? this.course.name : '–',
      player: this.match ? currentPlayer(this.match).name : '–',
      queueLength: this.turnManager ? this.turnManager.queue.length : 0,
      rejected: this.turnManager ? { ...this.turnManager.rejected } : null,
      lastShot: this.lastShot,
    };
  }
}
