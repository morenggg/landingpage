/**
 * DartGolf – 2D-Physik
 *
 * Bewusst eigene, kleine Physik statt einer Bibliothek:
 * Minigolf braucht nur einen rollenden Kreis, Reibung und Reflexion an
 * Kanten. Eine Physik-Engine würde hier deutlich mehr Gewicht und
 * Unvorhersehbarkeit einbringen, als sie Nutzen stiftet.
 *
 * Die Simulation läuft mit festem Zeitschritt (siehe PHYSICS.fixedStep),
 * damit das Verhalten unabhängig von der Bildrate reproduzierbar bleibt.
 */

import { PHYSICS } from '../config.js';

/* ------------------------------- Vektoren ------------------------------- */

export const vec = {
  /** @returns {{x:number,y:number}} */
  make(x = 0, y = 0) {
    return { x, y };
  },
  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  },
  scale(a, s) {
    return { x: a.x * s, y: a.y * s };
  },
  dot(a, b) {
    return a.x * b.x + a.y * b.y;
  },
  length(a) {
    return Math.hypot(a.x, a.y);
  },
  /** Normalisiert einen Vektor; der Nullvektor bleibt der Nullvektor. */
  normalize(a) {
    const len = Math.hypot(a.x, a.y);
    return len < 1e-9 ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
  },
  distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  },
};

/**
 * Wandelt einen Winkel in Grad in einen Richtungsvektor.
 * 0° zeigt nach oben (negative Y-Achse, wie auf dem Bildschirm),
 * positive Winkel drehen im Uhrzeigersinn – genau wie die Segmente
 * einer Dartscheibe von der 20 aus.
 * @param {number} degrees
 * @returns {{x:number,y:number}}
 */
export function angleToVector(degrees) {
  const rad = (degrees * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
}

/**
 * Umkehrfunktion zu `angleToVector`.
 * @param {{x:number,y:number}} v
 * @returns {number} Winkel in Grad (0..360)
 */
export function vectorToAngle(v) {
  const deg = (Math.atan2(v.x, -v.y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Dreht einen Winkel um höchstens `maxStep` Grad in Richtung `target`.
 * Wird für die Zielhilfe im einfachen Steuerungsmodus verwendet.
 * @param {number} from Grad
 * @param {number} to Grad
 * @param {number} fraction 0..1
 * @returns {number}
 */
export function blendAngles(from, to, fraction) {
  // Kürzesten Weg zwischen zwei Winkeln bestimmen (-180..180).
  let delta = ((to - from + 540) % 360) - 180;
  return (from + delta * fraction + 360) % 360;
}

/* --------------------------------- Ball --------------------------------- */

/**
 * Erzeugt einen Ball an einer Startposition.
 * @param {{x:number,y:number}} position
 */
export function createBall(position) {
  return {
    position: { x: position.x, y: position.y },
    velocity: { x: 0, y: 0 },
    radius: PHYSICS.ballRadius,
    /** Letzte sichere Position – Rücksetzpunkt nach Wasser/Aus. */
    safePosition: { x: position.x, y: position.y },
    moving: false,
    /** Sekunden seit dem Abschlag – Notbremse gegen endloses Rollen. */
    rollTime: 0,
  };
}

/**
 * Setzt den Ball auf eine Position und stoppt ihn.
 * @param {ReturnType<typeof createBall>} ball
 * @param {{x:number,y:number}} position
 */
export function placeBall(ball, position) {
  ball.position.x = position.x;
  ball.position.y = position.y;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.moving = false;
  ball.rollTime = 0;
  ball.safePosition.x = position.x;
  ball.safePosition.y = position.y;
}

/**
 * Stößt den Ball an.
 * @param {ReturnType<typeof createBall>} ball
 * @param {number} angleDeg Richtung in Grad (0 = nach oben)
 * @param {number} power Startgeschwindigkeit in Einheiten/Sekunde
 */
export function strikeBall(ball, angleDeg, power) {
  const dir = angleToVector(angleDeg);
  const speed = Math.min(power, PHYSICS.maxSpeed);
  ball.velocity.x = dir.x * speed;
  ball.velocity.y = dir.y * speed;
  ball.moving = speed > 0;
  ball.rollTime = 0;
  // Die Position vor dem Schlag ist der Rücksetzpunkt für Wasser/Aus.
  ball.safePosition.x = ball.position.x;
  ball.safePosition.y = ball.position.y;
}

/**
 * Führt einen Integrationsschritt aus: Bewegung und Reibung.
 * Kollisionen behandelt das Kollisionssystem separat.
 * @param {ReturnType<typeof createBall>} ball
 * @param {number} dt Zeitschritt in Sekunden
 */
export function integrate(ball, dt) {
  if (!ball.moving) return;

  ball.position.x += ball.velocity.x * dt;
  ball.position.y += ball.velocity.y * dt;

  // Exponentielle Rollreibung: unabhängig von der Schrittweite.
  const damping = (1 - PHYSICS.friction) ** dt;
  ball.velocity.x *= damping;
  ball.velocity.y *= damping;

  ball.rollTime += dt;

  const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
  if (speed < PHYSICS.stopSpeed || ball.rollTime > PHYSICS.maxRollSeconds) {
    ball.velocity.x = 0;
    ball.velocity.y = 0;
    ball.moving = false;
  }
}

/**
 * Rollweite eines Schlags ohne Hindernisse.
 *
 * Herleitung: Die Geschwindigkeit fällt exponentiell,
 *   v(t) = v0 * (1 - friction)^t
 * Das Integral über die Zeit ergibt die Strecke
 *   s = v0 / ln(1 / (1 - friction))
 * Damit lässt sich die Stärke eines Präzisionsschlags aus der Entfernung
 * berechnen, statt sie zu raten.
 *
 * @param {number} power Startgeschwindigkeit
 * @returns {number} Strecke in Welt-Einheiten
 */
export function distanceForPower(power) {
  return power / Math.log(1 / (1 - PHYSICS.friction));
}

/**
 * Umkehrung von `distanceForPower`: nötige Startgeschwindigkeit für eine
 * gewünschte Rollweite.
 * @param {number} distance
 * @returns {number}
 */
export function powerForDistance(distance) {
  return distance * Math.log(1 / (1 - PHYSICS.friction));
}

/**
 * Aktuelle Geschwindigkeit des Balls.
 * @param {ReturnType<typeof createBall>} ball
 * @returns {number}
 */
export function speedOf(ball) {
  return Math.hypot(ball.velocity.x, ball.velocity.y);
}

/**
 * Spiegelt die Geschwindigkeit an einer Normalen (Reflexion mit Dämpfung).
 * @param {{x:number,y:number}} velocity
 * @param {{x:number,y:number}} normal Einheitsvektor
 * @param {number} restitution 0..1
 * @returns {{x:number,y:number}}
 */
export function reflect(velocity, normal, restitution) {
  const d = vec.dot(velocity, normal);
  return {
    x: (velocity.x - 2 * d * normal.x) * restitution,
    y: (velocity.y - 2 * d * normal.y) * restitution,
  };
}
