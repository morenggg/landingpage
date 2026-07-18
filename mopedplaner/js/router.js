/**
 * MopedPlaner – Hash-Router
 *
 * Minimaler Router ohne Abhängigkeiten. Routen werden als Muster registriert,
 * ':param' bindet Pfadsegmente, '*rest' fängt den Rest des Pfads ein
 * (z. B. für den beliebig tiefen Technik-Explorer).
 */

const routes = [];
let notFoundHandler = null;

export function route(pattern, handler) {
  const parts = pattern.split('/').filter(Boolean);
  routes.push({ parts, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  location.hash = '#/' + path.replace(/^#?\/?/, '');
}

/** Pfad ohne Query-Teil (#/garage?neu=1 → "garage"). */
export function currentPath() {
  return location.hash.replace(/^#\/?/, '').split('?')[0];
}

function match(pathParts, routeParts) {
  const params = {};
  let i = 0;
  for (; i < routeParts.length; i++) {
    const rp = routeParts[i];
    if (rp.startsWith('*')) {
      params[rp.slice(1)] = pathParts.slice(i);
      return params;
    }
    if (pathParts[i] === undefined) return null;
    if (rp.startsWith(':')) params[rp.slice(1)] = decodeURIComponent(pathParts[i]);
    else if (rp !== pathParts[i]) return null;
  }
  return i === pathParts.length ? params : null;
}

function dispatch() {
  const path = currentPath();
  const pathParts = path.split('/').filter(Boolean);
  for (const r of routes) {
    const params = match(pathParts, r.parts);
    if (params) {
      r.handler(params);
      return;
    }
  }
  if (notFoundHandler) notFoundHandler(path);
}

export function startRouter() {
  window.addEventListener('hashchange', dispatch);
  if (!location.hash) location.hash = '#/';
  dispatch();
}

/** Aktuelle Route neu rendern (nach Datenänderungen) – ohne Seiten-Reload. */
export function refresh() {
  dispatch();
}
