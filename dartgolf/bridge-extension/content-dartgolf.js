/**
 * DartGolf Bridge – Content-Script auf der DartGolf-Seite (EXPERIMENTELL)
 *
 * Nimmt Wurfnachrichten vom Hintergrunddienst entgegen und gibt sie in dem
 * Format an die Seite weiter, das der AutodartsProvider erwartet:
 *
 *   { source: 'dartgolf-bridge', version: 1, type: 'throw'|'status', payload }
 *
 * Der Provider prüft Herkunft (gleiches Fenster, gleicher Origin), Quelle und
 * Protokollversion, bevor er etwas auswertet.
 */

const PROTOCOL_VERSION = 1;

/** Meldet der Seite, dass eine Bridge vorhanden ist. */
function announce() {
  window.postMessage({
    source: 'dartgolf-bridge',
    version: PROTOCOL_VERSION,
    type: 'status',
    payload: { bridge: 'extension', ready: true },
  }, window.location.origin);
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'dartgolf-throw') return;
  window.postMessage({
    source: 'dartgolf-bridge',
    version: PROTOCOL_VERSION,
    type: 'throw',
    payload: message.payload,
  }, window.location.origin);
});

// Fragt die Seite per "hello", meldet sich die Bridge erneut.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (data && data.source === 'dartgolf' && data.type === 'hello') announce();
});

announce();
