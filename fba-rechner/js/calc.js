/**
 * calc.js — Reiner Berechnungskern (keine DOM-Abhängigkeiten).
 *
 * Alle Funktionen sind pure functions: Eingaben rein, Ergebnis raus.
 * Dadurch später einfach erweiterbar (SP-API-Import, Zoll, Währung, …)
 * und unabhängig testbar.
 */

/** Amazon-Verkaufskategorien mit typischer Verkaufsprovision (Amazon.de, vereinfacht). */
export const CATEGORIES = [
  { id: 'misc',        label: 'Sonstiges / Allgemein',        referralPct: 15 },
  { id: 'electronics', label: 'Elektronik',                   referralPct: 7 },
  { id: 'accessories', label: 'Elektronik-Zubehör',           referralPct: 15 },
  { id: 'computer',    label: 'Computer & PC-Zubehör',        referralPct: 7 },
  { id: 'home',        label: 'Küche, Haushalt & Wohnen',     referralPct: 15 },
  { id: 'kitchen',     label: 'Küchengeräte (klein)',         referralPct: 15 },
  { id: 'drugstore',   label: 'Drogerie & Körperpflege',      referralPct: 15 },
  { id: 'beauty',      label: 'Beauty & Kosmetik',            referralPct: 15 },
  { id: 'grocery',     label: 'Lebensmittel & Getränke',      referralPct: 15 },
  { id: 'toys',        label: 'Spielzeug & Spiele',           referralPct: 15 },
  { id: 'sports',      label: 'Sport & Freizeit',             referralPct: 15 },
  { id: 'diy',         label: 'Baumarkt & Garten',            referralPct: 15 },
  { id: 'auto',        label: 'Auto & Motorrad',              referralPct: 15 },
  { id: 'clothing',    label: 'Kleidung & Schuhe',            referralPct: 15 },
  { id: 'jewelry',     label: 'Schmuck & Uhren',              referralPct: 20 },
  { id: 'pet',         label: 'Haustierbedarf',               referralPct: 15 },
  { id: 'baby',        label: 'Baby',                         referralPct: 15 },
  { id: 'office',      label: 'Bürobedarf & Schreibwaren',    referralPct: 15 },
];

export const MIN_REFERRAL_FEE = 0.30; // Amazon-Mindestprovision pro Stück (€)

const round2 = (v) => Math.round(v * 100) / 100;

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

/**
 * Schätzt die FBA-Versandgebühr pro Stück anhand der Größenklasse
 * (vereinfachte Amazon.de-Tarife, Stand 2025 — als Startwert gedacht,
 * jederzeit vom Nutzer überschreibbar).
 *
 * @param {{l:number,w:number,h:number}} dims Maße in cm
 * @param {number} weightG Gewicht in Gramm
 */
export function estimateFbaFee(dims, weightG) {
  const sides = [dims.l || 0, dims.w || 0, dims.h || 0].sort((a, b) => b - a);
  const [a, b, c] = sides;
  const kg = (weightG || 0) / 1000;

  if (a === 0 || kg === 0) return 3.90; // Keine Maße bekannt → Standardpaket-Mittelwert

  if (a <= 20 && b <= 15 && c <= 1 && kg <= 0.08) return 2.05;   // Kleiner Briefumschlag
  if (a <= 33 && b <= 23 && c <= 2.5 && kg <= 0.46) {            // Standard-Briefumschlag
    return kg <= 0.21 ? 2.25 : 2.55;
  }
  if (a <= 33 && b <= 23 && c <= 4 && kg <= 0.96) return 2.86;   // Großer Briefumschlag
  if (a <= 33 && b <= 23 && c <= 6 && kg <= 0.96) return 3.25;   // Extragroßer Briefumschlag
  if (a <= 35 && b <= 25 && c <= 12 && kg <= 3.9) {              // Kleines Paket
    if (kg <= 0.4) return 3.35;
    if (kg <= 0.9) return 3.65;
    return 4.05;
  }
  if (a <= 45 && b <= 34 && c <= 26 && kg <= 11.9) {             // Standardpaket
    if (kg <= 0.9) return 3.85;
    if (kg <= 1.9) return 4.45;
    if (kg <= 3.9) return 5.10;
    return 6.10;
  }
  if (a <= 61 && b <= 46 && c <= 46 && kg <= 15) return 7.20;    // Sperrgut klein
  return 9.50;                                                    // Sperrgut / Übergröße
}

/** Liefert den Namen der Größenklasse (für die UI). */
export function fbaSizeTierLabel(dims, weightG) {
  const sides = [dims.l || 0, dims.w || 0, dims.h || 0].sort((a, b) => b - a);
  const [a, b, c] = sides;
  const kg = (weightG || 0) / 1000;
  if (a === 0 || kg === 0) return 'Größenklasse unbekannt';
  if (a <= 20 && b <= 15 && c <= 1 && kg <= 0.08) return 'Kleiner Briefumschlag';
  if (a <= 33 && b <= 23 && c <= 2.5 && kg <= 0.46) return 'Standard-Briefumschlag';
  if (a <= 33 && b <= 23 && c <= 4 && kg <= 0.96) return 'Großer Briefumschlag';
  if (a <= 33 && b <= 23 && c <= 6 && kg <= 0.96) return 'Extragroßer Briefumschlag';
  if (a <= 35 && b <= 25 && c <= 12 && kg <= 3.9) return 'Kleines Paket';
  if (a <= 45 && b <= 34 && c <= 26 && kg <= 11.9) return 'Standardpaket';
  if (a <= 61 && b <= 46 && c <= 46 && kg <= 15) return 'Sperrgut (klein)';
  return 'Sperrgut / Übergröße';
}

/**
 * Automatische Kostenvorschläge aus den Produktdaten.
 * Jeder Wert ist nur ein Startpunkt und in der UI überschreibbar.
 */
export function suggestCosts(product) {
  const cat = categoryById(product.category);
  const kg = (product.weightG || 0) / 1000;
  const volM3 = ((product.dims.l || 0) * (product.dims.w || 0) * (product.dims.h || 0)) / 1e6;

  return {
    referralPct: cat.referralPct,
    fbaFee: round2(estimateFbaFee(product.dims, product.weightG)),
    // Fracht China/EU → Amazon-Lager, grob nach Gewicht
    inboundShipping: round2(Math.max(0.30, 0.40 + kg * 0.35)),
    packaging: 0.35,
    // PPC-Startbudget: ~10 % vom Verkaufspreis pro verkauftem Stück
    ppc: round2((product.salePrice || 0) * 0.10),
    returnsPct: 3,
    // Lagerkosten: ~26 €/m³/Monat, angenommene Lagerdauer 2 Monate
    storage: Math.max(0.01, round2(volM3 * 26 * 2)),
    other: 0,
  };
}

/**
 * Wendet die Risiko-Regler auf die Basiseingaben an und liefert
 * eine angepasste Kopie (Basis bleibt unverändert).
 */
export function applyRisk(inputs, risk) {
  const r = risk || {};
  return {
    ...inputs,
    buyPrice: (inputs.buyPrice || 0) * (1 + (r.buyUpPct || 0) / 100),
    salePrice: (inputs.salePrice || 0) * (1 - (r.saleDownPct || 0) / 100),
    costs: {
      ...inputs.costs,
      returnsPct: (inputs.costs.returnsPct || 0) + (r.returnsAddPct || 0),
      ppc: (inputs.costs.ppc || 0) * (1 + (r.ppcUpPct || 0) / 100),
      inboundShipping: (inputs.costs.inboundShipping || 0) * (1 + (r.shipUpPct || 0) / 100),
    },
  };
}

/**
 * Kernkalkulation: alle Kennzahlen pro Stück und gesamt.
 */
export function computeResults(inputs) {
  const qty = Math.max(0, Math.floor(inputs.qty || 0));
  const price = inputs.salePrice || 0;
  const c = inputs.costs;

  const referralFee = price > 0 ? Math.max(MIN_REFERRAL_FEE, price * (c.referralPct || 0) / 100) : 0;
  const returnsCost = price * (c.returnsPct || 0) / 100;

  const perUnit = {
    buy: inputs.buyPrice || 0,
    referral: referralFee,
    fba: c.fbaFee || 0,
    inboundShipping: c.inboundShipping || 0,
    packaging: c.packaging || 0,
    ppc: c.ppc || 0,
    returns: returnsCost,
    storage: c.storage || 0,
    other: c.other || 0,
  };

  const totalCostPerUnit = Object.values(perUnit).reduce((s, v) => s + v, 0);
  const profitPerUnit = price - totalCostPerUnit;

  // Kapital, das vor dem ersten Verkauf gebunden ist (Ware + Fracht + Verpackung)
  const upfrontPerUnit = perUnit.buy + perUnit.inboundShipping + perUnit.packaging;
  const boundCapital = upfrontPerUnit * qty;

  const revenue = price * qty;
  const totalProfit = profitPerUnit * qty;
  const totalCost = totalCostPerUnit * qty;

  return {
    qty,
    price,
    perUnit,
    totalCostPerUnit,
    profitPerUnit,
    upfrontPerUnit,
    boundCapital,
    revenue,
    totalCost,
    totalProfit,
    marginPct: price > 0 ? (profitPerUnit / price) * 100 : 0,
    roiPct: boundCapital > 0 ? (totalProfit / boundCapital) * 100 : 0,
    // Gewinnquote: Gewinn je eingesetztem Euro Gesamtkosten
    profitRatioPct: totalCost > 0 ? (totalProfit / totalCost) * 100 : 0,
  };
}

/**
 * Startkapitalrechner — das Hauptfeature.
 *
 * Frage: Wie viel Geld brauche ich, um die erste Bestellung zu bezahlen,
 * alle Kosten zu decken und nach dem Abverkauf dieselbe Menge erneut
 * bestellen zu können?
 */
export function computeStartCapital(inputs, results) {
  const bufferPct = inputs.bufferPct ?? 10;
  const qty = results.qty;

  const goods = results.perUnit.buy * qty;
  const shipping = results.perUnit.inboundShipping * qty;
  const packaging = results.perUnit.packaging * qty;
  const base = goods + shipping + packaging;
  const buffer = base * (bufferPct / 100);
  const startCapital = base + buffer;

  // Nach vollständigem Abverkauf: Startkapital − Ausgaben + Einnahmen
  // = Startkapital + Gesamtgewinn (alle laufenden Kosten sind im Gewinn enthalten)
  const capitalAfterCycle = startCapital + results.totalProfit;
  const reorderCost = base;
  const surplus = capitalAfterCycle - reorderCost;
  const selfSustaining = qty > 0 && capitalAfterCycle >= reorderCost;

  // Optional: Was schafft der Nutzer mit seinem tatsächlich verfügbaren Kapital?
  const available = inputs.availableCapital;
  let userCapital = null;
  if (available != null && available > 0 && results.upfrontPerUnit > 0) {
    const affordableQty = Math.floor(available / (results.upfrontPerUnit * (1 + bufferPct / 100)));
    const capitalAfter = available + results.profitPerUnit * affordableQty;
    const reorder = results.upfrontPerUnit * affordableQty;
    userCapital = {
      available,
      affordableQty,
      capitalAfter,
      selfSustaining: affordableQty > 0 && capitalAfter >= reorder,
      shortfall: Math.max(0, startCapital - available),
    };
  }

  return {
    bufferPct, goods, shipping, packaging, buffer, base,
    startCapital, capitalAfterCycle, reorderCost, surplus, selfSustaining,
    userCapital,
  };
}

/**
 * Liquiditätssimulation über mehrere Verkaufszyklen.
 * Voller Gewinn wird reinvestiert; pro Zyklus wird die maximal
 * finanzierbare Stückzahl bestellt.
 */
export function simulate(inputs, results, startCapital, cycles = 12, maxQtyPerCycle = Infinity) {
  const out = [];
  if (results.upfrontPerUnit <= 0) return out;

  let capital = startCapital;
  for (let i = 1; i <= cycles; i++) {
    const orderQty = Math.min(maxQtyPerCycle, Math.floor(capital / results.upfrontPerUnit));
    if (orderQty <= 0) {
      out.push({ cycle: i, capitalStart: capital, orderQty: 0, revenue: 0, profit: 0, capitalEnd: capital, stalled: true });
      break;
    }
    const revenue = orderQty * results.price;
    const profit = orderQty * results.profitPerUnit;
    const capitalEnd = capital + profit;
    out.push({ cycle: i, capitalStart: capital, orderQty, revenue, profit, capitalEnd, stalled: false });
    if (capitalEnd <= 0) break;
    capital = capitalEnd;
  }
  return out;
}

/**
 * Intelligente Bewertung: fasst die Kennzahlen zu einer Ampel
 * mit konkreten Begründungen zusammen.
 *
 * @returns {{level:'good'|'medium'|'bad', title:string, points:Array<{tone:string,text:string}>}}
 */
export function rateProduct(results, capital) {
  const points = [];
  const m = results.marginPct;
  const roi = results.roiPct;
  const de = (v, digits = 1) => v.toLocaleString('de-DE', { maximumFractionDigits: digits });

  if (results.qty <= 0 || results.price <= 0) {
    return { level: 'medium', title: 'Eingaben unvollständig', points: [
      { tone: 'warn', text: 'Bitte Verkaufspreis und Stückzahl eingeben, um eine Bewertung zu erhalten.' },
    ] };
  }

  // Marge
  if (m >= 25) points.push({ tone: 'good', text: `Starke Marge von ${de(m)} % — deutlich über der üblichen 20-%-Zielmarke.` });
  else if (m >= 15) points.push({ tone: 'warn', text: `Solide, aber nicht üppige Marge von ${de(m)} % (sehr gut wären mind. 25 %).` });
  else if (m > 0) points.push({ tone: 'bad', text: `Sehr dünne Marge von ${de(m)} % — wenig Puffer für Preisdruck oder steigende Kosten.` });
  else points.push({ tone: 'bad', text: `Negative Marge (${de(m)} %) — jedes verkaufte Stück macht Verlust.` });

  // ROI
  if (roi >= 50) points.push({ tone: 'good', text: `Hervorragender ROI von ${de(roi, 0)} % auf das eingesetzte Kapital.` });
  else if (roi >= 25) points.push({ tone: 'warn', text: `Akzeptabler ROI von ${de(roi, 0)} % (Ziel: mind. 30–50 %).` });
  else points.push({ tone: 'bad', text: `Niedriger ROI von ${de(roi, 0)} % — das Kapital arbeitet zu langsam.` });

  // Selbsttragender zweiter Zyklus
  if (capital.selfSustaining) {
    points.push({ tone: 'good', text: 'Nach dem ersten Abverkauf finanziert sich die nächste Bestellung von selbst.' });
  } else {
    points.push({ tone: 'bad', text: 'Der Erlös des ersten Zyklus reicht nicht für eine erneute Bestellung derselben Menge.' });
  }

  // Verfügbares Kapital des Nutzers
  if (capital.userCapital) {
    const u = capital.userCapital;
    if (u.shortfall > 0 && !u.selfSustaining) {
      points.push({ tone: 'bad', text: 'Mit deinem aktuellen Kapital reicht es nicht für einen selbsttragenden zweiten Bestellzyklus.' });
    } else if (u.shortfall > 0) {
      points.push({ tone: 'warn', text: `Dein Kapital liegt unter dem empfohlenen Startkapital — es reicht für ${u.affordableQty} statt ${results.qty} Stück.` });
    } else {
      points.push({ tone: 'good', text: 'Dein verfügbares Kapital deckt das empfohlene Startkapital vollständig ab.' });
    }
  }

  // Gesamturteil
  const badCount = points.filter((p) => p.tone === 'bad').length;
  let level, title;
  if (results.profitPerUnit <= 0) {
    level = 'bad'; title = 'Verlustgeschäft — nicht empfehlenswert';
  } else if (badCount === 0 && m >= 20 && roi >= 30 && capital.selfSustaining) {
    level = 'good'; title = 'Sehr gutes Produkt';
  } else if (badCount === 0) {
    level = 'good'; title = 'Gutes Produkt mit kleinen Schwächen';
  } else if (m < 10 && m > 0) {
    level = 'bad'; title = 'Zu wenig Gewinn';
  } else if (badCount >= 2) {
    level = 'bad'; title = 'Hohes Risiko';
  } else {
    level = 'medium'; title = 'Mittleres Risiko';
  }

  return { level, title, points };
}
