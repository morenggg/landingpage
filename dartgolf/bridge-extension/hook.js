/**
 * DartGolf Bridge – Seiten-Kontext (EXPERIMENTELL, ungetestet)
 *
 * Läuft im Kontext der Autodarts-Seite und beobachtet ausschließlich
 * eingehende WebSocket-Nachrichten der bereits bestehenden, vom Nutzer selbst
 * geöffneten Sitzung.
 *
 * Bewusste Einschränkungen:
 *  - Es wird NICHTS gesendet, nichts verändert, nichts umgangen.
 *  - Es werden keine Verbindungsadressen weitergegeben (sie können Tokens
 *    in der Adresszeile enthalten).
 *  - Weitergegeben werden nur Nachrichten, die wie ein Wurfereignis aussehen.
 *  - Cookies, Speicher und Anmeldedaten werden nicht gelesen.
 */

(function () {
  const NativeWebSocket = window.WebSocket;
  if (!NativeWebSocket || window.__dartgolfBridgeInstalled) return;
  window.__dartgolfBridgeInstalled = true;

  /**
   * Grobe Vorauswahl: nur Nachrichten weiterreichen, die überhaupt
   * Wurfinformationen enthalten können. Die eigentliche Auswertung macht
   * der Normalizer in DartGolf.
   * @param {unknown} data
   * @returns {boolean}
   */
  function looksLikeThrow(data) {
    if (typeof data !== 'string') return false;
    if (data.length > 200000) return false; // sehr große Nachrichten ignorieren
    return data.includes('"segment"') || data.includes('"throws"') || data.includes('"bed"');
  }

  /**
   * Gibt eine Nachricht an das Content-Script weiter.
   * @param {string} payload
   */
  function forward(payload) {
    window.postMessage({
      source: 'dartgolf-bridge-page',
      version: 1,
      type: 'throw',
      payload,
    }, window.location.origin);
  }

  window.WebSocket = function PatchedWebSocket(...args) {
    const socket = new NativeWebSocket(...args);
    socket.addEventListener('message', (event) => {
      try {
        if (looksLikeThrow(event.data)) forward(event.data);
      } catch {
        // Ein Fehler hier darf die Autodarts-Seite niemals stören.
      }
    });
    return socket;
  };

  window.WebSocket.prototype = NativeWebSocket.prototype;
  Object.assign(window.WebSocket, NativeWebSocket);
}());
