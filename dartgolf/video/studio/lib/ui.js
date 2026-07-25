/**
 * DartGolf – Render-Studio: DOM-Bausteine für Szenen
 *
 * Text und Karten entstehen als echtes DOM (scharfe Schrift, einfaches
 * Layout), Bewegung wird pro Frame per `transform`/`opacity` gesetzt.
 * Nur diese beiden Eigenschaften werden animiert – das hält das Rendern
 * schnell und die Kanten sauber.
 */

/**
 * Erzeugt ein Element.
 * @param {string} tag
 * @param {Object} [props] `class`, `text`, `html` (nur für eigene Inhalte), `style`
 * @param {Array<Node|string>} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key === 'html') node.innerHTML = value; // ausschließlich eigene, statische Inhalte
    else if (key === 'style') Object.assign(node.style, value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/**
 * Zerlegt einen Text in einzelne Zeichen-Elemente.
 * Damit lässt sich Schrift zeichenweise einfliegen lassen – ein Kennzeichen
 * hochwertiger Produktvideos.
 *
 * @param {string} str
 * @param {Object} [options]
 * @param {string} [options.class] Klasse für den Container
 * @returns {{node: HTMLElement, chars: HTMLElement[]}}
 */
export function splitChars(str, options = {}) {
  const node = el('div', { class: options.class || '' });
  const chars = [];
  // Wörter bleiben zusammen, damit nicht mitten im Wort umgebrochen wird.
  const words = str.split(' ');
  words.forEach((word, wi) => {
    const wordNode = el('span', { class: 'word' });
    [...word].forEach((c) => {
      const charNode = el('span', { class: 'char', text: c });
      chars.push(charNode);
      wordNode.appendChild(charNode);
    });
    node.appendChild(wordNode);
    if (wi < words.length - 1) {
      const space = el('span', { class: 'char', text: ' ' });
      chars.push(space);
      node.appendChild(space);
    }
  });
  return { node, chars };
}

/**
 * Zerlegt einen Text in Wort-Elemente (für weichere Staffelungen).
 * @returns {{node: HTMLElement, words: HTMLElement[]}}
 */
export function splitWords(str, options = {}) {
  const node = el('div', { class: options.class || '' });
  const words = [];
  str.split(' ').forEach((word, i, arr) => {
    const w = el('span', { class: 'word', text: word });
    words.push(w);
    node.appendChild(w);
    if (i < arr.length - 1) node.appendChild(document.createTextNode(' '));
  });
  return { node, words };
}

/**
 * Setzt Position und Bewegung eines Elements in einem Aufruf.
 * @param {HTMLElement} node
 * @param {Object} t
 * @param {number} [t.x] Verschiebung in px
 * @param {number} [t.y]
 * @param {number} [t.scale]
 * @param {number} [t.rotate] Grad
 * @param {number} [t.opacity]
 * @param {number} [t.blur] px
 */
export function set(node, t = {}) {
  const {
    x = 0, y = 0, scale = 1, rotate = 0, opacity = 1, blur = 0, z = 0,
  } = t;
  node.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotate(${rotate}deg) scale(${scale})`;
  node.style.opacity = String(opacity);
  node.style.filter = blur > 0.02 ? `blur(${blur}px)` : 'none';
}

/**
 * Positioniert ein Element absolut auf der Bühne.
 */
export function place(node, { left, top, right, bottom, width, height } = {}) {
  node.style.position = 'absolute';
  if (left !== undefined) node.style.left = `${left}px`;
  if (top !== undefined) node.style.top = `${top}px`;
  if (right !== undefined) node.style.right = `${right}px`;
  if (bottom !== undefined) node.style.bottom = `${bottom}px`;
  if (width !== undefined) node.style.width = `${width}px`;
  if (height !== undefined) node.style.height = `${height}px`;
  return node;
}

/**
 * Baut eine Feature-Karte (Symbol, Titel, Text).
 * Das Symbol ist ein eigenes, schlichtes SVG – keine fremden Icon-Sets.
 * @param {{icon: string, title: string, text: string, color?: string}} data
 */
export function featureCard(data) {
  const color = data.color || 'var(--mint)';
  const card = el('div', { class: 'card' }, [
    el('div', { class: 'card-icon', html: data.icon }),
    el('div', { class: 'card-title', text: data.title }),
    el('div', { class: 'card-text', text: data.text }),
  ]);
  card.style.setProperty('--accent', color);
  return card;
}

/* ------------------------------- Symbole -------------------------------- */

/**
 * Kleine SVG-Symbolsammlung, eigens gezeichnet.
 * `stroke="currentColor"` erlaubt Einfärbung über die Karte.
 */
export const ICONS = {
  target: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round">
    <circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="11"/><circle cx="24" cy="24" r="3.4" fill="var(--accent)" stroke="none"/>
  </svg>`,

  players: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="17" cy="17" r="6.5"/><path d="M6 40c0-6.6 5-11 11-11s11 4.4 11 11"/>
    <circle cx="34" cy="20" r="5"/><path d="M30 40c0-5 3.4-8.5 8-8.5s6 3.5 6 8.5"/>
  </svg>`,

  course: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 38h32"/><path d="M14 38V12l16 5-16 5"/><circle cx="34" cy="34" r="3.6"/>
  </svg>`,

  code: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 15 9 24l9 9"/><path d="M30 15l9 9-9 9"/><path d="M26 11l-4 26"/>
  </svg>`,

  offline: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 39v-9"/><rect x="13" y="8" width="22" height="22" rx="4"/><path d="M18 39h12"/>
    <path d="M19 19l4 4 7-8"/>
  </svg>`,

  shield: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 6l14 5v12c0 9-6 15.5-14 19-8-3.5-14-10-14-19V11z"/><path d="M17 24l5 5 9-10"/>
  </svg>`,

  screens: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="10" width="26" height="18" rx="3"/><path d="M13 34h9"/>
    <rect x="33" y="18" width="11" height="20" rx="3"/>
  </svg>`,

  plug: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6v10"/><path d="M30 6v10"/><path d="M12 16h24v6a12 12 0 0 1-24 0z"/><path d="M24 34v8"/>
  </svg>`,

  bolt: `<svg viewBox="0 0 48 48" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M26 5 12 27h10l-2 16 16-24H26z"/>
  </svg>`,
};
