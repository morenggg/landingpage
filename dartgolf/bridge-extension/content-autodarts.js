/**
 * DartGolf Bridge – Content-Script auf der Autodarts-Seite (EXPERIMENTELL)
 *
 * Aufgaben:
 *  1. hook.js in den Seiten-Kontext einfügen (nur so ist die WebSocket-
 *     Beobachtung möglich – Content-Scripts sehen den Seiten-WebSocket nicht),
 *  2. dessen Nachrichten entgegennehmen,
 *  3. an den Hintergrunddienst weitergeben.
 *
 * Es werden keine Zugangsdaten gelesen oder übertragen.
 */

(function () {
  // hook.js als Datei einbinden – kein eval, kein Inline-Code.
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('hook.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.source !== 'dartgolf-bridge-page' || data.type !== 'throw') return;

    try {
      chrome.runtime.sendMessage({ type: 'dartgolf-throw', payload: data.payload });
    } catch {
      // Ist die Erweiterung gerade neu geladen worden, schlägt das fehl –
      // das ist unkritisch.
    }
  });
}());
