# Klänge

Dieser Ordner ist bewusst leer.

DartGolf erzeugt alle Klänge zur Laufzeit selbst über die Web Audio API
(`src/audio/sound-manager.js`). Damit gibt es keine fremden Audiodateien im
Repository und keine offenen Lizenzfragen.

Wer eigene Aufnahmen verwenden möchte, legt sie hier ab und erweitert den
`SoundManager` um das Abspielen von Dateien. Die Ereignisnamen stehen in
`src/config.js` unter `SOUND_EVENTS`:

```
dart, hit, wall, hazard, holed, playerChange, holeComplete, gameComplete
```

Bitte nur eigene oder nachweislich frei lizenzierte Dateien verwenden.
Audio darf erst nach einer Nutzerinteraktion starten – der `SoundManager`
hält das bereits ein (`unlock()`).
