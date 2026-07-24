/**
 * DartGolf Bridge – Hintergrunddienst (EXPERIMENTELL)
 *
 * Leitet Wurfnachrichten vom Autodarts-Tab an alle offenen DartGolf-Tabs
 * weiter. Es wird nichts gespeichert und nichts an Dritte gesendet.
 */

const DARTGOLF_URL_PATTERN = 'https://dorfdulliracing.de/dartgolf/*';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'dartgolf-throw') return;

  chrome.tabs.query({ url: DARTGOLF_URL_PATTERN }, (tabs) => {
    for (const tab of tabs) {
      if (typeof tab.id !== 'number') continue;
      chrome.tabs.sendMessage(tab.id, {
        type: 'dartgolf-throw',
        payload: message.payload,
      }, () => {
        // Fehler (Tab ohne Content-Script) werden bewusst ignoriert.
        void chrome.runtime.lastError;
      });
    }
    sendResponse({ delivered: tabs.length });
  });

  return true; // Antwort erfolgt asynchron
});
