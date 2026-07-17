/**
 * Design-Tokens — übernommen aus fba-rechner/css/styles.css (Dark Theme),
 * damit das Video exakt zur Website passt.
 */
import { INTER_DATA_URL } from './inter-font';

export const T = {
  bg: '#0d0d0d',
  surface: '#1a1a19',
  surface2: '#232322',
  ink: '#ffffff',
  ink2: '#c3c2b7',
  muted: '#898781',
  border: 'rgba(255,255,255,0.10)',
  grid: '#2c2c2a',
  accent: '#3987e5',
  accentSoft: 'rgba(57,135,229,0.16)',
  good: '#0ca30c',
  warn: '#fab219',
  bad: '#e66767',
  seriesQty: '#d95926',
  radius: 24,
  font: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
};

// Inter (Variable Font) als eingebettete Data-URL registrieren.
// Bewusst OHNE delayRender: In dieser Headless-Umgebung resolvet das
// FontFaceSet-Promise nie (Remotion virtualisiert die Zeit im Render-Tab)
// und würde den Render per Timeout abbrechen. Die Data-URL wird in wenigen
// Millisekunden dekodiert; font-display:block hält Text bis dahin unsichtbar,
// sodass nie eine Fallback-Schrift ins Bild gerät.
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@font-face {
    font-family: 'Inter';
    src: url(${INTER_DATA_URL}) format('woff2');
    font-weight: 100 900;
    font-display: block;
  }`;
  document.head.appendChild(style);
}

export const fmtEur = (v: number, digits = 2) =>
  v.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + ' €';

export const fmtInt = (v: number) =>
  Math.round(v).toLocaleString('de-DE');

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Zählt einen Wert weich hoch (easeOutCubic). */
export const countUp = (
  frame: number,
  delay: number,
  duration: number,
  to: number,
  from = 0,
) => {
  const t = Math.max(0, Math.min(1, (frame - delay) / duration));
  return from + (to - from) * easeOutCubic(t);
};

/** Tipp-Animation: liefert die ersten n Zeichen abhängig vom Frame. */
export const typed = (frame: number, delay: number, text: string, cps = 1.4) => {
  const chars = Math.max(0, Math.floor((frame - delay) * cps));
  return text.slice(0, chars);
};
