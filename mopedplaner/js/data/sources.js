/**
 * MopedPlaner – Quellen & Datenqualität
 *
 * Zentrales Verifikationssystem für alle technischen Stammdaten.
 * Jeder Datensatz der Wissensdatenbank trägt einen `verificationStatus`
 * und optional `sourceIds`, die auf diese Quellenliste verweisen.
 *
 * Grundsatz: Lieber ehrlich „ungeprüft" als falsche Sicherheit.
 */

export const VERIFICATION_STATUS = {
  verified: { id: 'verified', label: 'Verifiziert', short: 'Verifiziert', tone: 'ok' },
  'partially-verified': { id: 'partially-verified', label: 'Teilweise geprüft', short: 'Teilw. geprüft', tone: 'warn' },
  unverified: { id: 'unverified', label: 'Ungeprüft', short: 'Ungeprüft', tone: 'muted' },
  disputed: { id: 'disputed', label: 'Umstritten', short: 'Umstritten', tone: 'danger' },
  demo: { id: 'demo', label: 'Demo-Datensatz', short: 'Demo', tone: 'demo' },
};

export function verificationInfo(status) {
  return VERIFICATION_STATUS[status] || VERIFICATION_STATUS.unverified;
}

/** Hinweistext für alles unterhalb von „verified". */
export const UNVERIFIED_HINT = 'Technische Angaben noch nicht vollständig verifiziert.';

export const SOURCES = [
  {
    id: 'source-manual-s51',
    title: 'Original Simson Reparaturanleitung S51/S70',
    type: 'manual',
    publisher: 'VEB Fahrzeug- und Jagdwaffenwerk Suhl',
    year: '',
    url: '',
    notes: 'Primärquelle. Noch nicht Seite für Seite in die Datenbasis eingepflegt – Werte, die hierauf verweisen, wurden aus gängiger Werkstattliteratur übernommen.',
    verificationLevel: 'primary',
  },
  {
    id: 'source-manual-schwalbe',
    title: 'Original Reparaturanleitung KR51/2 Schwalbe',
    type: 'manual',
    publisher: 'VEB Fahrzeug- und Jagdwaffenwerk Suhl',
    year: '',
    url: '',
    notes: 'Primärquelle, noch nicht eingepflegt.',
    verificationLevel: 'primary',
  },
  {
    id: 'source-community',
    title: 'Gängige Werkstattliteratur & Schrauber-Erfahrungswissen',
    type: 'community',
    publisher: '',
    year: '',
    url: '',
    notes: 'Sekundärquelle: allgemein verbreitete Richtwerte und Erfahrungswerte der Simson-Szene. Für sicherheitsrelevante Arbeiten immer mit der Original-Reparaturanleitung abgleichen.',
    verificationLevel: 'secondary',
  },
];

export function getSource(id) {
  return SOURCES.find((s) => s.id === id) || null;
}
