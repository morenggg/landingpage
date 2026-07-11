/**
 * ============================================================================
 * Dorfdulli Racing – tracking.js
 * ============================================================================
 * Autonomes Visitor- & Session-Tracking auf Basis der Supabase REST API.
 *
 * Einbindung (auf jeder HTML-Seite, keine weiteren Änderungen nötig):
 *   <script src="tracking.js"></script>
 *
 * Eigenschaften:
 *  - Kein Supabase JS SDK, ausschließlich fetch() gegen die REST-Schnittstelle
 *  - Keine Frameworks, keine Build-Tools, läuft direkt im Browser
 *  - Alle Fehler werden abgefangen – das Script kann die Website niemals brechen
 *  - Persistente visitor_id (localStorage) + Session-gebundene session_id (sessionStorage)
 *  - Automatisches Anlegen eines page_views-Datensatzes pro Seitenaufruf
 *  - Heartbeat alle 10 Sekunden (nur last_heartbeat wird aktualisiert)
 *  - Sauberes Verlassen der Seite (beforeunload / pagehide / visibilitychange)
 *  - Vorbereitete, aber inaktive Event-Tracking-Funktionen für spätere Ausbaustufen
 *
 * Hinweis zu ip_country / ip_city:
 *  Diese Felder können clientseitig nicht zuverlässig und datenschutzkonform
 *  ermittelt werden. Sie werden bewusst NICHT vom Client gesetzt und sollten
 *  serverseitig (z. B. via Supabase Edge Function / Datenbank-Trigger anhand
 *  der eingehenden Request-IP) befüllt werden.
 * ============================================================================
 */
 
(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Konfiguration
  // --------------------------------------------------------------------------

  var CONFIG = {
    SUPABASE_URL: 'https://morrzzgbyowlauhkfmdg.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcnJ6emdieW93bGF1aGtmbWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDgwNDYsImV4cCI6MjA5MTMyNDA0Nn0.tZRm3ODKVByB2RXQt8cfjqJ8JjF-QoqN-6zFdG6QLAU',
    TABLE_PAGE_VIEWS: 'page_views',
    // Für zukünftige Event-Erweiterungen (siehe "Erweiterbarkeit" unten).
    // Tabelle existiert aktuell noch nicht und muss vor Aktivierung angelegt werden.
    TABLE_EVENTS: 'tracking_events',
    HEARTBEAT_INTERVAL_MS: 10000,
    STORAGE_KEY_VISITOR: 'dorfdulli_visitor_id',
    STORAGE_KEY_SESSION: 'dorfdulli_session_id'
  };

  var REST_PAGE_VIEWS_URL = CONFIG.SUPABASE_URL + '/rest/v1/' + CONFIG.TABLE_PAGE_VIEWS;
  var REST_EVENTS_URL = CONFIG.SUPABASE_URL + '/rest/v1/' + CONFIG.TABLE_EVENTS;

  // --------------------------------------------------------------------------
  // Interner State (kapselt alles, keine globalen Variablen)
  // --------------------------------------------------------------------------

  var state = {
    visitorId: null,
    sessionId: null,
    recordId: null,
    enteredAtMs: null,
    heartbeatTimer: null,
    isHidden: false,
    leaveSent: false,
    eventTrackingEnabled: false
  };

  // --------------------------------------------------------------------------
  // Hilfsfunktionen: Fehlerbehandlung
  // --------------------------------------------------------------------------

  /**
   * Führt eine Funktion sicher aus. Fängt alle Fehler ab und gibt lediglich
   * eine Konsolen-Warnung aus. Wirft niemals eine Exception nach außen.
   */
  function safeRun(fn, context) {
    try {
      return fn();
    } catch (err) {
      console.warn('[DorfdulliTracking] Fehler in "' + context + '":', err);
      return null;
    }
  }

  /**
   * Wrapper um fetch(), der niemals eine unbehandelte Promise-Rejection erzeugt.
   */
  function safeFetch(url, options, context) {
    try {
      return fetch(url, options).catch(function (err) {
        console.warn('[DorfdulliTracking] Netzwerkfehler in "' + context + '":', err);
        return null;
      });
    } catch (err) {
      console.warn('[DorfdulliTracking] Fehler in "' + context + '":', err);
      return Promise.resolve(null);
    }
  }

  // --------------------------------------------------------------------------
  // Hilfsfunktionen: IDs
  // --------------------------------------------------------------------------

  function generateUUID() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    // Fallback für ältere Browser ohne crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Liefert die dauerhafte Besucher-ID aus localStorage.
   * Wird einmalig erzeugt und bleibt über alle zukünftigen Besuche erhalten.
   */
  function getVisitorId() {
    return safeRun(function () {
      var id = localStorage.getItem(CONFIG.STORAGE_KEY_VISITOR);
      if (!id) {
        id = generateUUID();
        localStorage.setItem(CONFIG.STORAGE_KEY_VISITOR, id);
      }
      return id;
    }, 'getVisitorId') || generateUUID();
  }

  /**
   * Liefert die Session-ID aus sessionStorage.
   * Gilt nur solange der Browser-Tab/das Fenster geöffnet ist.
   */
  function getSessionId() {
    return safeRun(function () {
      var id = sessionStorage.getItem(CONFIG.STORAGE_KEY_SESSION);
      if (!id) {
        id = generateUUID();
        sessionStorage.setItem(CONFIG.STORAGE_KEY_SESSION, id);
      }
      return id;
    }, 'getSessionId') || generateUUID();
  }

  // --------------------------------------------------------------------------
  // Geräteerkennung (Desktop / Tablet / Handy)
  // --------------------------------------------------------------------------

  function detectDevice(ua) {
    var isIPadOS13Plus =
      /Macintosh/i.test(ua) &&
      typeof navigator.maxTouchPoints === 'number' &&
      navigator.maxTouchPoints > 1;

    var isTablet =
      /iPad/i.test(ua) ||
      isIPadOS13Plus ||
      /Tablet|PlayBook|Kindle|Silk/i.test(ua) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua));

    if (isTablet) {
      return 'Tablet';
    }

    var isMobile = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|BB10|IEMobile/i.test(ua);

    if (isMobile) {
      return 'Handy';
    }

    return 'Desktop';
  }

  // --------------------------------------------------------------------------
  // Betriebssystemerkennung
  // --------------------------------------------------------------------------

  function detectOperatingSystem(ua) {
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return 'iOS';
    }
    if (/Android/i.test(ua)) {
      return 'Android';
    }
    if (/CrOS/i.test(ua)) {
      return 'ChromeOS';
    }
    if (/Windows NT/i.test(ua)) {
      return 'Windows';
    }
    if (/Macintosh|Mac OS X/i.test(ua)) {
      return 'macOS';
    }
    if (/Linux/i.test(ua)) {
      return 'Linux';
    }
    return 'Unbekannt';
  }

  // --------------------------------------------------------------------------
  // Browsererkennung
  // --------------------------------------------------------------------------

  function detectBrowser(ua) {
    // Reihenfolge ist entscheidend: viele Browser tarnen sich in der UA als Chrome/Safari.
    if (/DuckDuckGo/i.test(ua)) {
      return 'DuckDuckGo';
    }
    if (typeof navigator.brave !== 'undefined') {
      return 'Brave';
    }
    if (/\bArc\//i.test(ua)) {
      return 'Arc';
    }
    if (/SamsungBrowser/i.test(ua)) {
      return 'Samsung Browser';
    }
    if (/Edg\//i.test(ua) || /EdgA\//i.test(ua) || /EdgiOS\//i.test(ua)) {
      return 'Edge';
    }
    if (/OPR\//i.test(ua) || /Opera/i.test(ua) || /OPiOS\//i.test(ua)) {
      return 'Opera';
    }
    if (/Vivaldi/i.test(ua)) {
      return 'Vivaldi';
    }
    if (/YaBrowser/i.test(ua)) {
      return 'Yandex Browser';
    }
    if (/UCBrowser/i.test(ua)) {
      return 'UC Browser';
    }
    if (/FxiOS\//i.test(ua) || (/Firefox\//i.test(ua) && !/Seamonkey/i.test(ua))) {
      return 'Firefox';
    }
    if (/CriOS\//i.test(ua)) {
      return 'Chrome';
    }
    if (/Chromium\//i.test(ua)) {
      return 'Chromium';
    }
    if (/Chrome\//i.test(ua) && !/Edg|OPR|Brave/i.test(ua)) {
      return 'Chrome';
    }
    if (/Safari\//i.test(ua) && !/Chrome|Chromium|CriOS/i.test(ua)) {
      return 'Safari';
    }
    if (/MSIE|Trident\//i.test(ua)) {
      return 'Internet Explorer';
    }
    return 'Unbekannt';
  }

  // --------------------------------------------------------------------------
  // Kontext-Erfassung (Gerät, Bildschirm, Sprache, Zeitzone, URL, Referrer)
  // --------------------------------------------------------------------------

  function collectContext() {
    var ua = navigator.userAgent || '';

    var timezone = safeRun(function () {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }, 'collectContext:timezone') || null;

    return {
      page: location.pathname || '/',
      current_url: location.href,
      referrer: document.referrer || null,
      device: detectDevice(ua),
      browser: detectBrowser(ua),
      operating_system: detectOperatingSystem(ua),
      screen_width: window.screen ? window.screen.width : null,
      screen_height: window.screen ? window.screen.height : null,
      language: navigator.language || navigator.userLanguage || null,
      timezone: timezone,
      user_agent: ua
    };
  }

  // --------------------------------------------------------------------------
  // Supabase REST-Kommunikation
  // --------------------------------------------------------------------------

  function buildHeaders(extra) {
    var headers = {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) {
          headers[key] = extra[key];
        }
      }
    }
    return headers;
  }

  /**
   * Legt beim Laden der Seite einen neuen page_views-Datensatz an.
   */
  function createPageViewRecord() {
    var context = collectContext();
    var nowIso = new Date().toISOString();
    state.enteredAtMs = Date.now();

    var payload = {
      page: context.page,
      session_id: state.sessionId,
      visitor_id: state.visitorId,
      entered_at: nowIso,
      last_heartbeat: nowIso,
      is_online: true,
      device: context.device,
      browser: context.browser,
      operating_system: context.operating_system,
      screen_width: context.screen_width,
      screen_height: context.screen_height,
      language: context.language,
      timezone: context.timezone,
      referrer: context.referrer,
      current_url: context.current_url,
      user_agent: context.user_agent
    };

    return safeFetch(
      REST_PAGE_VIEWS_URL,
      {
        method: 'POST',
        headers: buildHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify(payload)
      },
      'createPageViewRecord'
    ).then(function (response) {
      if (!response || !response.ok) {
        console.warn('[DorfdulliTracking] Datensatz konnte nicht angelegt werden.');
        return;
      }
      return response.json().then(function (rows) {
        if (Array.isArray(rows) && rows.length > 0 && rows[0].id) {
          state.recordId = rows[0].id;
          startHeartbeat();
        }
      });
    });
  }

  /**
   * Aktualisiert den bestehenden Datensatz per PATCH (id=eq.<recordId>).
   */
  function updatePageViewRecord(fields, useKeepalive) {
    if (!state.recordId) {
      return Promise.resolve(null);
    }
    var url = REST_PAGE_VIEWS_URL + '?id=eq.' + encodeURIComponent(state.recordId);

    return safeFetch(
      url,
      {
        method: 'PATCH',
        headers: buildHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify(fields),
        keepalive: !!useKeepalive
      },
      'updatePageViewRecord'
    );
  }

  // --------------------------------------------------------------------------
  // Heartbeat: aktualisiert ausschließlich last_heartbeat, erzeugt keine neuen Zeilen
  // --------------------------------------------------------------------------

  function sendHeartbeat() {
    updatePageViewRecord({
      last_heartbeat: new Date().toISOString(),
      is_online: true
    });
  }

  function startHeartbeat() {
    stopHeartbeat();
    state.heartbeatTimer = window.setInterval(function () {
      safeRun(sendHeartbeat, 'startHeartbeat:interval');
    }, CONFIG.HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (state.heartbeatTimer) {
      window.clearInterval(state.heartbeatTimer);
      state.heartbeatTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Seite verlassen / wieder aktivieren
  // --------------------------------------------------------------------------

  /**
   * Wird beim endgültigen Verlassen der Seite bzw. beim Verstecken des Tabs
   * aufgerufen. Schreibt left_at, duration_seconds und is_online = false.
   */
  function handleLeave(useKeepalive) {
    if (state.leaveSent || !state.recordId) {
      return;
    }
    state.leaveSent = true;
    stopHeartbeat();

    var durationSeconds = state.enteredAtMs
      ? Math.max(0, Math.round((Date.now() - state.enteredAtMs) / 1000))
      : 0;

    updatePageViewRecord(
      {
        left_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        is_online: false
      },
      useKeepalive
    );
  }

  /**
   * Wird aufgerufen, wenn der Tab wieder sichtbar wird, nachdem er zuvor nur
   * versteckt (nicht geschlossen) wurde. Es wird KEIN neuer Datensatz erzeugt,
   * sondern der bestehende reaktiviert.
   */
  function handleResume() {
    if (!state.recordId || !state.isHidden) {
      return;
    }
    state.isHidden = false;
    state.leaveSent = false;

    updatePageViewRecord({
      is_online: true,
      last_heartbeat: new Date().toISOString()
    });

    startHeartbeat();
  }

  function registerLifecycleListeners() {
    window.addEventListener('beforeunload', function () {
      safeRun(function () {
        handleLeave(true);
      }, 'beforeunload');
    });

    window.addEventListener('pagehide', function () {
      safeRun(function () {
        handleLeave(true);
      }, 'pagehide');
    });

    document.addEventListener('visibilitychange', function () {
      safeRun(function () {
        if (document.visibilityState === 'hidden') {
          state.isHidden = true;
          handleLeave(true);
        } else if (document.visibilityState === 'visible') {
          handleResume();
        }
      }, 'visibilitychange');
    });
  }

  // --------------------------------------------------------------------------
  // Erweiterbarkeit: vorbereitete Event-Tracking-Funktionen
  // --------------------------------------------------------------------------
  // Diese Funktionen sind vollständig implementiert, aber standardmäßig
  // INAKTIV. Sie senden Daten an eine zukünftige Tabelle (CONFIG.TABLE_EVENTS),
  // die vor Aktivierung in Supabase angelegt werden muss. Aktivierung erfolgt
  // zentral über window.DorfdulliTracking.enableEventTracking().
  // --------------------------------------------------------------------------

  function sendEvent(eventType, eventData) {
    if (!state.eventTrackingEnabled) {
      return;
    }
    var payload = {
      event_type: eventType,
      event_data: eventData || {},
      page: location.pathname || '/',
      current_url: location.href,
      visitor_id: state.visitorId,
      session_id: state.sessionId,
      created_at: new Date().toISOString()
    };

    safeFetch(
      REST_EVENTS_URL,
      {
        method: 'POST',
        headers: buildHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify(payload)
      },
      'sendEvent:' + eventType
    );
  }

  function trackClick(elementLabel, meta) {
    safeRun(function () {
      sendEvent('click', Object.assign({ label: elementLabel }, meta || {}));
    }, 'trackClick');
  }

  function trackDownload(fileUrl, meta) {
    safeRun(function () {
      sendEvent('download', Object.assign({ file_url: fileUrl }, meta || {}));
    }, 'trackDownload');
  }

  function trackUpload(fileName, meta) {
    safeRun(function () {
      sendEvent('upload', Object.assign({ file_name: fileName }, meta || {}));
    }, 'trackUpload');
  }

  function trackLogin(userId, meta) {
    safeRun(function () {
      sendEvent('login', Object.assign({ user_id: userId }, meta || {}));
    }, 'trackLogin');
  }

  function trackLogout(userId, meta) {
    safeRun(function () {
      sendEvent('logout', Object.assign({ user_id: userId }, meta || {}));
    }, 'trackLogout');
  }

  function trackTournament(tournamentId, meta) {
    safeRun(function () {
      sendEvent('tournament', Object.assign({ tournament_id: tournamentId }, meta || {}));
    }, 'trackTournament');
  }

  function trackGallery(itemId, meta) {
    safeRun(function () {
      sendEvent('gallery', Object.assign({ item_id: itemId }, meta || {}));
    }, 'trackGallery');
  }

  function trackVideo(videoId, meta) {
    safeRun(function () {
      sendEvent('video', Object.assign({ video_id: videoId }, meta || {}));
    }, 'trackVideo');
  }

  function trackButton(buttonLabel, meta) {
    safeRun(function () {
      sendEvent('button', Object.assign({ label: buttonLabel }, meta || {}));
    }, 'trackButton');
  }

  /**
   * Aktiviert das Event-Tracking global. Ab diesem Aufruf senden alle
   * trackXYZ()-Funktionen tatsächlich Daten an Supabase. Vor dem Aufruf
   * sind sie no-ops (sicher, ohne Nebenwirkungen).
   */
  function enableEventTracking() {
    state.eventTrackingEnabled = true;
  }

  // --------------------------------------------------------------------------
  // Initialisierung
  // --------------------------------------------------------------------------

  function init() {
    state.visitorId = getVisitorId();
    state.sessionId = getSessionId();

    registerLifecycleListeners();

    safeRun(function () {
      createPageViewRecord();
    }, 'init:createPageViewRecord');
  }

  // Öffentliche, bewusst minimale Schnittstelle für spätere Erweiterungen
  // (Dashboard-Zugriff, Aktivierung des Event-Trackings). Kein weiterer
  // globaler State wird preisgegeben.
  window.DorfdulliTracking = {
    trackClick: trackClick,
    trackDownload: trackDownload,
    trackUpload: trackUpload,
    trackLogin: trackLogin,
    trackLogout: trackLogout,
    trackTournament: trackTournament,
    trackGallery: trackGallery,
    trackVideo: trackVideo,
    trackButton: trackButton,
    enableEventTracking: enableEventTracking
  };

  // Start: läuft sofort, benötigt kein DOMContentLoaded, da ausschließlich
  // navigator/location/screen APIs verwendet werden.
  safeRun(init, 'init');
})();
