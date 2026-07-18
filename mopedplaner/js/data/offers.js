/**
 * MopedPlaner – Händlerangebote (Vorbereitung)
 *
 * Strikt getrennt von den technischen Ersatzteilen (js/data/parts.js):
 * Ein Ersatzteil ist eine technische Tatsache – ein Angebot ist ein
 * kommerzielles Ereignis (Händler, Preis, Verfügbarkeit, Link).
 *
 * AKTUELL: ausschließlich Demo-Datensätze zur Strukturvalidierung.
 * Keine echten Händler, keine echten Preise, keine echten Links.
 * Alle Demo-Einträge tragen demo: true und active: false und werden
 * in der UI nur als klar gekennzeichnete Beispiele angezeigt.
 *
 * Spätere echte Anbindung:
 *  1. Seller in SELLERS eintragen (inkl. Affiliate-Kennzeichnung)
 *  2. Angebote mit partId auf den Teilekatalog mappen
 *  3. active: true setzen, lastCheckedAt pflegen
 *  4. Preisvergleich = alle aktiven Offers je partId sortiert nach Gesamtpreis
 */

export const SELLERS = [
  {
    id: 'seller-demo',
    name: 'Beispiel-Händler (Demo)',
    url: '',
    affiliateProgram: false,
    notes: 'Platzhalter zur Strukturvalidierung – kein realer Händler.',
    demo: true,
  },
];

export const OFFERS = [
  {
    id: 'offer-demo-001',
    partId: 'part-lamellensatz-m500',
    sellerId: 'seller-demo',
    productName: 'Kupplungslamellen-Satz S51 (Demo-Angebot)',
    productUrl: '',
    price: null,
    currency: 'EUR',
    shippingCost: null,
    availability: 'unknown',
    qualityLevel: 'nachbau-standard',
    manufacturer: '',
    manufacturerPartNumber: '',
    lastCheckedAt: null,
    affiliate: false,
    active: false,
    demo: true,
  },
  {
    id: 'offer-demo-002',
    partId: 'part-vape-anlage',
    sellerId: 'seller-demo',
    productName: 'VAPE-Zündanlage komplett (Demo-Angebot)',
    productUrl: '',
    price: null,
    currency: 'EUR',
    shippingCost: null,
    availability: 'unknown',
    qualityLevel: 'nachbau-premium',
    manufacturer: '',
    manufacturerPartNumber: '',
    lastCheckedAt: null,
    affiliate: false,
    active: false,
    demo: true,
  },
];

export function offersForPart(partId, { includeDemo = false } = {}) {
  return OFFERS.filter((o) => o.partId === partId && (o.active || (includeDemo && o.demo)));
}

export function getSeller(id) {
  return SELLERS.find((s) => s.id === id) || null;
}
