/**
 * charts.js — Leichtgewichtige SVG-Liniendiagramme ohne Fremdbibliotheken.
 *
 * Ein Diagramm = eine Serie (der Titel benennt sie), 2px-Linie mit weichem
 * Flächenverlauf, dezente Gitterlinien, Crosshair + Tooltip beim Hovern.
 */

const W = 640;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 56 };

/** "Schöne" Achsenschritte für einen Wertebereich berechnen. */
function niceTicks(min, max, count = 4) {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v);
  return ticks;
}

let uid = 0;

/**
 * Rendert ein Liniendiagramm in den Container.
 *
 * @param {HTMLElement} el Zielcontainer (wird geleert)
 * @param {object} cfg
 * @param {number[]} cfg.values  y-Werte
 * @param {string[]} cfg.labels  x-Beschriftungen (gleiche Länge)
 * @param {string}  cfg.color    CSS-Farbe / var(...)
 * @param {(v:number)=>string} cfg.format  Wertformatierung für Achse & Tooltip
 * @param {string}  cfg.name     Serienname für den Tooltip
 */
export function renderLineChart(el, cfg) {
  el.innerHTML = '';
  const { values, labels, color, format, name } = cfg;
  if (!values || values.length === 0) {
    el.innerHTML = '<p class="chart-empty">Keine Daten — bitte Eingaben prüfen.</p>';
    return;
  }

  const id = `ch${++uid}`;
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  const ticks = niceTicks(min, max, 4);
  min = Math.min(min, ticks[0]);
  max = Math.max(max, ticks[ticks.length - 1]);

  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw);
  const y = (v) => PAD.top + ih - ((v - min) / (max - min)) * ih;

  const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const baseY = y(Math.max(min, Math.min(max, 0)));
  const areaPath = `${linePath}L${x(values.length - 1).toFixed(1)},${baseY.toFixed(1)}L${x(0).toFixed(1)},${baseY.toFixed(1)}Z`;

  const gridLines = ticks.map((t) =>
    `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"
       stroke="${t === 0 ? 'var(--axis)' : 'var(--grid)'}" stroke-width="1"/>`).join('');

  const yLabels = ticks.map((t) =>
    `<text x="${PAD.left - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end" class="tick">${format(t)}</text>`).join('');

  // x-Achse: max. ~6 Beschriftungen, damit nichts kollidiert
  const stepX = Math.max(1, Math.ceil(labels.length / 6));
  const xLabels = labels.map((l, i) => (i % stepX !== 0) ? '' :
    `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="tick">${l}</text>`).join('');

  el.innerHTML = `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${name}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style="stop-color:${color}" stop-opacity="0.18"/>
            <stop offset="1" style="stop-color:${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridLines}${yLabels}${xLabels}
        <path d="${areaPath}" fill="url(#${id}g)"/>
        <path d="${linePath}" fill="none" style="stroke:${color}" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
        <g class="hover-layer" style="display:none">
          <line class="crosshair" y1="${PAD.top}" y2="${PAD.top + ih}" stroke="var(--axis)"
                stroke-width="1" stroke-dasharray="3 3"/>
          <circle r="4.5" style="fill:${color}" stroke="var(--surface)" stroke-width="2"/>
        </g>
        <rect class="hit" x="${PAD.left}" y="${PAD.top}" width="${iw}" height="${ih}"
              fill="transparent" style="cursor:crosshair"/>
      </svg>
      <div class="chart-tooltip" hidden></div>
    </div>`;

  const svg = el.querySelector('svg');
  const hit = el.querySelector('.hit');
  const hover = el.querySelector('.hover-layer');
  const cross = hover.querySelector('.crosshair');
  const dot = hover.querySelector('circle');
  const tip = el.querySelector('.chart-tooltip');

  function onMove(ev) {
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    const rel = (px - PAD.left) / iw;
    const i = Math.max(0, Math.min(values.length - 1, Math.round(rel * (values.length - 1))));
    const cx = x(i), cy = y(values[i]);
    hover.style.display = '';
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    tip.hidden = false;
    tip.innerHTML = `<span class="tt-label">${labels[i]}</span><span class="tt-value"><i style="background:${color}"></i>${name}: <strong>${format(values[i])}</strong></span>`;
    const wrapRect = el.querySelector('.chart-wrap').getBoundingClientRect();
    const left = (cx / W) * rect.width + (rect.left - wrapRect.left);
    const top = (cy / H) * rect.height + (rect.top - wrapRect.top);
    tip.style.left = `${Math.min(Math.max(left, 70), wrapRect.width - 70)}px`;
    tip.style.top = `${Math.max(top - 14, 8)}px`;
  }
  function onLeave() { hover.style.display = 'none'; tip.hidden = true; }

  hit.addEventListener('pointermove', onMove);
  hit.addEventListener('pointerleave', onLeave);
}
