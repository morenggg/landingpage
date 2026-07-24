/**
 * DartGolf – kleine DOM-Hilfsfunktionen
 *
 * Bewusst ohne Framework. Alle Inhalte werden über `textContent` gesetzt,
 * niemals über `innerHTML` – damit kann kein empfangenes Ereignis Markup
 * in die Seite bringen.
 */

/**
 * Erzeugt ein Element.
 * @param {string} tag
 * @param {Object} [props] Attribute; `class`, `text`, `dataset`, `on*` werden gesondert behandelt
 * @param {Array<Node|string>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        node.dataset[dataKey] = String(dataValue);
      });
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return node;
}

/**
 * Kurzform für querySelector.
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement|null}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Kurzform für querySelectorAll als Array.
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement[]}
 */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** Entfernt alle Kindknoten. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Setzt Kindknoten neu (ersetzt den bisherigen Inhalt). */
export function replaceChildren(node, children) {
  clear(node);
  children.forEach((child) => {
    if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
}

/** Blendet ein Element ein oder aus (über das hidden-Attribut). */
export function setHidden(node, hidden) {
  if (!node) return;
  if (hidden) node.setAttribute('hidden', '');
  else node.removeAttribute('hidden');
}

/**
 * Setzt Text nur, wenn er sich geändert hat (vermeidet unnötige Layouts).
 * @param {HTMLElement|null} node
 * @param {string|number} value
 */
export function setText(node, value) {
  if (!node) return;
  const text = String(value);
  if (node.textContent !== text) node.textContent = text;
}
