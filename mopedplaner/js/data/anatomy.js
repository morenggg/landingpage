/**
 * MopedPlaner – Fahrzeug-Anatomie (digitaler Zwilling)
 *
 * Diese Schicht ist bewusst von Wissen (components.js), Teilen und Modellen
 * getrennt. Sie beschreibt NUR, wie ein Fahrzeug als interaktive
 * Explosions-/Prinzipzeichnung dargestellt wird und wo die Baugruppen
 * sitzen (Hotspots). Die Hotspots verweisen über `componentId` auf die
 * Baugruppen im COMPONENT_TREE – die eigentlichen Inhalte (Defekte,
 * Drehmomente, Teile) leben dort.
 *
 * Austauschbarkeit (Entwicklungsprototyp):
 *   - `BLUEPRINTS`  Prinzipzeichnungen (SVG). Später ersetzbar durch echte,
 *                   lizenzierte Explosionszeichnungen je Modell/Baugruppe.
 *   - `HOTSPOTS`    Positionskarten je Blueprint. Reine Daten.
 *   - Views lesen ausschließlich `getAnatomy()` – nie das SVG direkt.
 *
 * Die Zeichnungen sind schematische Seitenansichten (Entwicklungsstand),
 * keine originalen Werksunterlagen.
 */

/* ── Prinzipzeichnung: Seitenansicht (Blickrichtung nach rechts) ──
   Rückrad links (cx 72), Vorderrad rechts (cx 250). viewBox 320×176. */

function wheel(cx, cy, r) {
  let spokes = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x2 = (cx + (r - 8) * Math.cos(a)).toFixed(1);
    const y2 = (cy + (r - 8) * Math.sin(a)).toFixed(1);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}"/>`;
  }
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r - 11}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="4"/>${spokes}`
  );
}

/** Baugruppen bekommen eine data-part-Marke, damit der Zwilling einzelne
 *  Bereiche hervorheben kann, ohne das SVG zu kennen. */
const MOPED_SVG = `
  <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <g data-part="antrieb">${wheel(72, 120, 34)}</g>
    <g data-part="bremsen">${wheel(250, 120, 34)}</g>
    <g data-part="fahrwerk">
      <path d="M40 96 Q56 78 96 84"/>
      <path d="M214 96 Q232 78 274 86"/>
    </g>
    <g data-part="rahmen">
      <path d="M72 120 L104 120 L120 82 L188 82"/>
      <path d="M120 120 L150 120"/>
      <path d="M150 120 L166 84"/>
      <path d="M188 82 L214 70 L250 120"/>
    </g>
    <g data-part="sitz"><path d="M108 82 Q104 74 116 72 L150 72 Q156 72 156 80"/></g>
    <g data-part="kraftstoff"><path d="M156 66 Q190 56 214 66 L220 82 L172 84 Q160 84 156 96 Z"/></g>
    <g data-part="motor">
      <rect x="108" y="94" width="46" height="30" rx="5"/>
      <line x1="116" y1="94" x2="116" y2="124"/>
      <line x1="124" y1="94" x2="124" y2="124"/>
      <line x1="132" y1="94" x2="132" y2="124"/>
      <line x1="140" y1="94" x2="140" y2="124"/>
    </g>
    <g data-part="vergaser"><rect x="154" y="92" width="16" height="18" rx="3"/></g>
    <g data-part="elektrik"><path d="M214 66 L238 54 L226 54"/><circle cx="240" cy="78" r="9"/></g>
    <g data-part="auspuff"><path d="M150 122 Q186 132 214 122 Q236 114 236 128"/></g>
    <g data-part="zuendung"><circle cx="104" cy="109" r="9"/></g>
    <line data-part="ground" x1="18" y1="160" x2="302" y2="160" stroke-dasharray="2 7"/>
  </g>`;

/**
 * Blueprint-Katalog. Jede Variante: schematische Seitenansicht + Hotspots.
 * Die Hotspot-Koordinaten sind Prozentwerte des Anzeige-Rahmens (0–100),
 * damit sie unabhängig von der Pixelgröße überlagert werden können.
 *
 * Aktueller Entwicklungsstand: eine gut ausgearbeitete Moped-Ansicht, die
 * für alle Baureihen als Platzhalter dient. Schwalbe/Roller sind als eigene
 * Varianten vorgesehen und können ohne View-Änderung ergänzt werden.
 */
export const BLUEPRINTS = {
  moped: {
    id: 'moped',
    label: 'Moped / Mokick (S-Reihe)',
    viewBox: '0 0 320 176',
    svg: MOPED_SVG,
    hotspots: [
      { componentId: 'motor',      label: 'Motor',            x: 40, y: 60 },
      { componentId: 'vergaser',   label: 'Vergaser',         x: 52, y: 55 },
      { componentId: 'zuendung',   label: 'Zündung',          x: 32, y: 62 },
      { componentId: 'kraftstoff', label: 'Tank & Kraftstoff', x: 59, y: 41 },
      { componentId: 'auspuff',    label: 'Auspuff',          x: 47, y: 74 },
      { componentId: 'antrieb',    label: 'Kette & Antrieb',  x: 29, y: 68 },
      { componentId: 'bremsen',    label: 'Bremsen',          x: 78, y: 68 },
      { componentId: 'fahrwerk',   label: 'Fahrwerk',         x: 73, y: 50 },
      { componentId: 'elektrik',   label: 'Elektrik & Licht', x: 76, y: 44 },
    ],
  },
};

/* Modellkategorie → Blueprint-Variante. Fällt sauber auf 'moped' zurück,
   solange spezifische Varianten (schwalbe, roller) noch nicht gezeichnet sind. */
const CATEGORY_BLUEPRINT = {
  moped: 'moped',
  vogel: 'moped',
  schwalbe: 'moped',
  roller: 'moped',
  duo: 'moped',
  klassik: 'moped',
  sonder: 'moped',
};

/**
 * Liefert die Anatomie für ein Fahrzeug: die passende Prinzipzeichnung
 * und die Hotspot-Liste. `model` ist optional (aus getModel()).
 */
export function getAnatomy(vehicle, model = null) {
  const cat = model?.category;
  const blueprintId = (cat && CATEGORY_BLUEPRINT[cat]) || 'moped';
  const blueprint = BLUEPRINTS[blueprintId] || BLUEPRINTS.moped;
  return {
    blueprintId: blueprint.id,
    viewBox: blueprint.viewBox,
    svg: blueprint.svg,
    hotspots: blueprint.hotspots,
    approximate: blueprintId === 'moped' && cat && cat !== 'moped',
  };
}

/* ── Aufmerksamkeit je Baugruppe aus freiem Text ableiten ──
   Damit „glüht" im Zwilling die Baugruppe, zu der eine offene Aufgabe passt –
   ganz ohne dass Aufgaben schon strukturiert verschlagwortet sein müssen.
   Reine Heuristik für den Prototyp; echte Zuordnung folgt über componentId. */
const ASSEMBLY_KEYWORDS = {
  motor: ['motor', 'kolben', 'zylinder', 'kurbel', 'lager', 'simmerring', 'dichtsatz', 'kupplung', 'getriebe', 'lamelle'],
  vergaser: ['vergaser', 'düse', 'duese', 'bedüsung', 'beduesung', 'schwimmer', 'leerlauf', 'luftfilter', 'gemisch'],
  zuendung: ['zündung', 'zuendung', 'unterbrecher', 'kondensator', 'kerze', 'polrad', 'vape', 'zündspule', 'zuendspule', 'grundplatte'],
  kraftstoff: ['tank', 'benzin', 'sprit', 'benzinhahn', 'kraftstoff', 'schlauch'],
  auspuff: ['auspuff', 'krümmer', 'kruemmer', 'schalldämpfer', 'schalldaempfer', 'endtopf'],
  elektrik: ['elektrik', 'licht', 'scheinwerfer', 'blinker', 'hupe', 'kabel', 'batterie', 'lampe', 'rücklicht', 'ruecklicht', 'schalter'],
  fahrwerk: ['gabel', 'federbein', 'lenkkopf', 'schwinge', 'rahmen', 'fahrwerk', 'reifen', 'felge'],
  bremsen: ['bremse', 'bremsbacke', 'bremszug', 'trommel', 'belag'],
  antrieb: ['kette', 'ritzel', 'kettenrad', 'antrieb', 'kettenspanner'],
};

/** Findet die wahrscheinlichste Baugruppe zu einem freien Text (oder null). */
export function assemblyForText(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  for (const [assembly, words] of Object.entries(ASSEMBLY_KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return assembly;
  }
  return null;
}

/**
 * Baut aus offenen Aufgaben (und optional Logbuch) eine Menge von
 * Baugruppen-IDs, die im Zwilling Aufmerksamkeit signalisieren sollen.
 */
export function attentionAssemblies(tasks = []) {
  const set = new Set();
  for (const t of tasks) {
    if (t.done) continue;
    const a = t.componentId || assemblyForText(t.title);
    if (a) set.add(a);
  }
  return set;
}
