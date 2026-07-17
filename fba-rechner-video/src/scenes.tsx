/**
 * Die 8 Szenen des Erklärvideos (Storyboard-Reihenfolge).
 * Alle Frames sind relativ zur jeweiligen <Series.Sequence>.
 */
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { T, countUp, fmtEur, fmtInt, typed } from './theme';
import {
  BrandRow, Caption, Card, Field, Kpi, LogoMark, Pop, Scene, SliderRow,
} from './components/ui';

const Center: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 0 }) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap,
    }}
  >
    {children}
  </AbsoluteFill>
);

const StepBadge: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      alignSelf: 'center',
      background: T.accentSoft,
      color: T.accent,
      fontSize: 20,
      fontWeight: 700,
      borderRadius: 999,
      padding: '8px 22px',
      marginBottom: 22,
      letterSpacing: '0.02em',
    }}
  >
    {text}
  </div>
);

/* ================= Szene 1 — Willkommen (240) ================= */

export const S1Welcome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: frame - 8, fps, config: { damping: 12, mass: 0.9 } });
  return (
    <Scene duration={240}>
      <Center gap={38}>
        <div style={{ transform: `scale(${logoS}) rotate(${(1 - logoS) * -12}deg)` }}>
          <LogoMark size={150} />
        </div>
        <Pop delay={26}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              maxWidth: 1250,
              lineHeight: 1.15,
            }}
          >
            Willkommen beim Amazon FBA{' '}
            <span style={{ color: T.accent }}>Startkapital-Rechner</span>
          </div>
        </Pop>
        <Pop delay={46}>
          <div style={{ fontSize: 32, color: T.ink2 }}>
            Plane dein Business schon vor dem ersten Verkauf.
          </div>
        </Pop>
      </Center>
    </Scene>
  );
};

/* ================= Szene 2 — Produkt anlegen (300) ================= */

export const S2Product: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 300], [1, 1.045]);
  const name = typed(frame, 40, 'Edelstahl-Trinkflasche 750 ml', 0.9);
  const price = countUp(frame, 95, 40, 24.99);
  const buy = countUp(frame, 125, 40, 5.2);
  const qty = countUp(frame, 155, 35, 100);
  return (
    <Scene duration={300}>
      <Center>
        <StepBadge text="Schritt 1 · Produkt" />
        <div style={{ transform: `scale(${zoom})` }}>
          <Pop delay={12}>
            <Card title="1 · Produkt" sub="Basisdaten deines Produkts" width={820}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 26px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <Field
                    label="Produktname"
                    value={name}
                    focused={frame > 35 && frame < 90}
                    caret={frame > 35 && frame < 90}
                  />
                </div>
                <Field label="Verkaufspreis (€)" value={frame > 95 ? fmtEur(price).replace(' €', '') : ''} unit="€" focused={frame >= 95 && frame < 125} />
                <Field label="Einkaufspreis / Stück (€)" value={frame > 125 ? fmtEur(buy).replace(' €', '') : ''} unit="€" focused={frame >= 125 && frame < 155} />
                <Field label="Stückzahl (1. Bestellung)" value={frame > 155 ? fmtInt(qty) : ''} focused={frame >= 155 && frame < 185} />
                <Field label="Kategorie" value={frame > 185 ? 'Küche, Haushalt & Wohnen' : ''} unit="▾" focused={frame >= 185 && frame < 210} />
              </div>
            </Card>
          </Pop>
        </div>
        <Caption delay={200} text="Gib einfach die wichtigsten Produktdaten ein." />
      </Center>
    </Scene>
  );
};

/* ================= Szene 3 — Kosten erfassen (300) ================= */

export const S3Costs: React.FC = () => {
  const frame = useCurrentFrame();
  const costs: Array<[string, number, string, number]> = [
    // label, Zielwert, Einheit, Delay
    ['Amazon Verkaufsprovision', 15, '%', 30],
    ['FBA-Gebühren', 3.35, '€/Stück', 55],
    ['Versand zum Amazon-Lager', 0.52, '€/Stück', 80],
    ['Werbekosten (PPC)', 2.5, '€/Stück', 105],
    ['Verpackung', 0.35, '€/Stück', 130],
    ['Sonstige Kosten', 0, '€/Stück', 155],
  ];
  // Ab Frame 190 wird PPC "manuell überschrieben"
  const ppcOverride = frame > 190;
  const ppcValue = ppcOverride ? countUp(frame, 190, 25, 3.2, 2.5) : 0;
  return (
    <Scene duration={300}>
      <Center>
        <StepBadge text="Schritt 2 · Kosten" />
        <Pop delay={10}>
          <Card
            title="2 · Kosten"
            sub="Automatisch vorgeschlagen — jederzeit überschreibbar"
            width={960}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 26px' }}>
              {costs.map(([label, target, unit, delay], i) => {
                const isPpc = label === 'Werbekosten (PPC)';
                const v = isPpc && ppcOverride ? ppcValue : countUp(frame, delay, 30, target);
                const shown = frame > delay;
                return (
                  <Pop key={label} delay={delay - 8} slide={14}>
                    <Field
                      label={label}
                      value={shown ? (unit === '%' ? fmtInt(v) : fmtEur(v).replace(' €', '')) : ''}
                      unit={unit}
                      focused={isPpc && ppcOverride && frame < 240}
                      tag={
                        !shown ? undefined
                          : isPpc && ppcOverride ? 'manuell angepasst'
                          : 'automatischer Vorschlag'
                      }
                      tagTone={isPpc && ppcOverride ? 'custom' : 'auto'}
                    />
                  </Pop>
                );
              })}
            </div>
          </Card>
        </Pop>
        <Caption delay={205} text="Passe alle Kosten individuell an oder nutze die vorgeschlagenen Werte." />
      </Center>
    </Scene>
  );
};

/* ================= Szene 4 — Sofortige Berechnung (300) ================= */

export const S4Results: React.FC = () => {
  const frame = useCurrentFrame();
  const kpis: Array<[string, (v: number) => string, number, number, 'pos' | 'plain']> = [
    ['Gewinn pro Stück', (v) => fmtEur(v), 8.48, 30, 'pos'],
    ['Gewinn gesamt', (v) => fmtEur(v), 848.18, 45, 'pos'],
    ['ROI', (v) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`, 139.7, 60, 'pos'],
    ['Marge', (v) => `${v.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`, 33.9, 75, 'pos'],
    ['Umsatz', (v) => fmtEur(v), 2499, 90, 'plain'],
    ['Kapitalbindung', (v) => fmtEur(v), 607, 105, 'plain'],
  ];
  return (
    <Scene duration={300}>
      <Center>
        <StepBadge text="Schritt 3 · Ergebnisse" />
        <Pop delay={8}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 40 }}>
            Alle Kennzahlen — <span style={{ color: T.accent }}>sofort berechnet</span>
          </div>
        </Pop>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 350px)',
            gap: 24,
          }}
        >
          {kpis.map(([label, fmt, target, delay, tone]) => (
            <Pop key={label} delay={delay} slide={30}>
              <Kpi label={label} value={fmt(countUp(frame, delay, 45, target))} tone={tone} big />
            </Pop>
          ))}
        </div>
        <Caption delay={185} text="Der Rechner berechnet deine Wirtschaftlichkeit automatisch." />
      </Center>
    </Scene>
  );
};

/* ================= Szene 5 — Startkapital (390) ================= */

export const S5StartCapital: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const capital = countUp(frame, 30, 70, 667.7);
  // Sanftes Pulsieren des Scheins um die Karte
  const glow = 0.35 + 0.25 * Math.sin(frame / 14);
  const partB = frame >= 195;
  const nodes = [
    { label: '1. Bestellung', sub: '100 Stück', delay: 210 },
    { label: 'Vollständiger Abverkauf', sub: '+ 848 € Gewinn', delay: 245 },
    { label: '2. Bestellung finanziert', sub: '✓ + 909 € Überschuss', delay: 280 },
  ];
  return (
    <Scene duration={390}>
      <Center gap={30}>
        {!partB ? (
          <>
            <Pop delay={8}>
              <Card
                title="Startkapitalrechner"
                sub="Wie viel Geld brauchst du wirklich?"
                width={860}
                style={{
                  boxShadow: `0 0 ${90 * glow}px rgba(57,135,229,${glow}), 0 24px 60px rgba(0,0,0,0.45)`,
                  border: `1px solid rgba(57,135,229,0.45)`,
                }}
              >
                <div
                  style={{
                    fontSize: 108,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: T.accent,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtEur(capital)}
                </div>
                <div style={{ fontSize: 24, color: T.muted, marginTop: 6 }}>
                  empfohlenes Startkapital inkl. Sicherheitspuffer
                </div>
              </Card>
            </Pop>
            <Caption delay={110} text="Erfahre sofort, wie viel Startkapital du wirklich benötigst." />
          </>
        ) : (
          <>
            <Pop delay={200}>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 30 }}>
                Der Kreislauf trägt sich <span style={{ color: T.good }}>selbst</span>
              </div>
            </Pop>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {nodes.map((n, i) => {
                const s = spring({ frame: frame - n.delay, fps, config: { damping: 14 } });
                const arrowW = interpolate(frame, [n.delay + 8, n.delay + 30], [0, 90], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                const last = i === nodes.length - 1;
                return (
                  <React.Fragment key={n.label}>
                    <div
                      style={{
                        opacity: Math.min(1, s * 1.4),
                        transform: `scale(${0.9 + s * 0.1})`,
                        background: last ? 'rgba(12,163,12,0.12)' : T.surface,
                        border: `2px solid ${last ? T.good : T.border}`,
                        borderRadius: 22,
                        padding: '28px 34px',
                        textAlign: 'center',
                        minWidth: 320,
                        boxShadow: '0 16px 44px rgba(0,0,0,0.45)',
                      }}
                    >
                      <div style={{ fontSize: 27, fontWeight: 700 }}>{n.label}</div>
                      <div
                        style={{
                          fontSize: 22,
                          marginTop: 6,
                          color: last ? T.good : T.ink2,
                          fontWeight: last ? 700 : 400,
                        }}
                      >
                        {n.sub}
                      </div>
                    </div>
                    {!last ? (
                      <div
                        style={{
                          width: arrowW,
                          height: 4,
                          background: T.accent,
                          position: 'relative',
                          margin: '0 6px',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            right: -2,
                            top: -8,
                            borderLeft: `16px solid ${T.accent}`,
                            borderTop: '10px solid transparent',
                            borderBottom: '10px solid transparent',
                            opacity: arrowW > 60 ? 1 : 0,
                          }}
                        />
                      </div>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </div>
            <Caption
              delay={300}
              text="Nach dem ersten vollständigen Verkauf kann die nächste Bestellung direkt finanziert werden."
            />
          </>
        )}
      </Center>
    </Scene>
  );
};

/* ================= Szene 6 — Wachstum (300) ================= */

// Reale Werte aus der Liquiditätssimulation des Demo-Produkts (Zyklus 1–8)
const SIM_CAPITAL = [668, 1601, 3831, 9183, 22008, 52754, 126470, 303188];
const SIM_QTY = [110, 263, 631, 1512, 3625, 8691, 20835, 49948];

export const S6Growth: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [25, 190], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const W = 1000;
  const H = 460;
  const PAD = 30;
  // Potenz-Skala: das exponentielle Wachstum bleibt als ansteigende Kurve
  // sichtbar (linear wäre zu flach, logarithmisch eine Gerade)
  const scale = (v: number) => Math.pow(v, 0.42);
  const sMin = scale(SIM_CAPITAL[0]);
  const sMax = scale(SIM_CAPITAL[SIM_CAPITAL.length - 1]);
  const pts = SIM_CAPITAL.map((v, i) => {
    const x = PAD + (i / (SIM_CAPITAL.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((scale(v) - sMin) / (sMax - sMin)) * (H - PAD * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join('');
  const area = `${line}L${pts[pts.length - 1][0]},${H - PAD}L${pts[0][0]},${H - PAD}Z`;
  const idx = progress * (SIM_CAPITAL.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(SIM_CAPITAL.length - 1, lo + 1);
  const mix = idx - lo;
  const capitalNow = SIM_CAPITAL[lo] + (SIM_CAPITAL[hi] - SIM_CAPITAL[lo]) * mix;
  const qtyNow = SIM_QTY[lo] + (SIM_QTY[hi] - SIM_QTY[lo]) * mix;
  return (
    <Scene duration={300}>
      <Center>
        <StepBadge text="Liquiditätssimulation" />
        <Pop delay={8}>
          <Card width={1120} title="Kapitalentwicklung über Verkaufszyklen">
            <div style={{ display: 'flex', gap: 30, marginBottom: 18 }}>
              <Kpi label="Kapital" value={fmtEur(capitalNow, 0)} tone="pos" />
              <Kpi label="Bestellmenge" value={`${fmtInt(qtyNow)} Stück`} tone="plain" />
              <Kpi label="Zyklus" value={`${Math.max(1, Math.round(idx + 1))} / 8`} tone="plain" />
            </div>
            <svg width={W} height={H} style={{ display: 'block' }}>
              {[0.25, 0.5, 0.75].map((g) => (
                <line
                  key={g}
                  x1={PAD}
                  x2={W - PAD}
                  y1={PAD + g * (H - PAD * 2)}
                  y2={PAD + g * (H - PAD * 2)}
                  stroke={T.grid}
                />
              ))}
              <path d={area} fill="rgba(57,135,229,0.14)" opacity={progress} />
              <path
                d={line}
                fill="none"
                stroke={T.accent}
                strokeWidth={5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - progress}
              />
              {pts[Math.round(idx)] ? (
                <circle
                  cx={pts[0][0] + progress * (pts[pts.length - 1][0] - pts[0][0])}
                  cy={(() => {
                    const x = pts[0][0] + progress * (pts[pts.length - 1][0] - pts[0][0]);
                    // y auf der Kurve interpolieren
                    for (let i = 0; i < pts.length - 1; i++) {
                      if (x >= pts[i][0] && x <= pts[i + 1][0]) {
                        const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
                        return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
                      }
                    }
                    return pts[pts.length - 1][1];
                  })()}
                  r={11}
                  fill={T.accent}
                  stroke={T.surface}
                  strokeWidth={4}
                />
              ) : null}
            </svg>
          </Card>
        </Pop>
        <Caption delay={195} text="Simuliere mehrere Verkaufszyklen und beobachte dein Wachstum." />
      </Center>
    </Scene>
  );
};

/* ================= Szene 7 — Risikoanalyse (300) ================= */

export const S7Risk: React.FC = () => {
  const frame = useCurrentFrame();
  const slide1 = interpolate(frame, [50, 110], [0, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const slide2 = interpolate(frame, [130, 185], [0, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const saleDown = Math.round(slide1 * 30); // 0 → −15 %
  const returnsUp = Math.round(slide2 * 20); // 0 → +8 Pkt.
  // Gewinn reagiert live (echte Werte der Website-Kalkulation)
  const profit = 8.48 - (slide1 * 30 * 0.25) - (slide2 * 20 * 0.2);
  const active = saleDown > 0 || returnsUp > 0;
  return (
    <Scene duration={300}>
      <Center>
        <StepBadge text="Risikoanalyse" />
        <Pop delay={10}>
          <Card width={1150} title="Was passiert, wenn sich die Bedingungen verschlechtern?">
            <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
                <SliderRow
                  label="Verkaufspreis sinkt"
                  valueLabel={`−${saleDown} %`}
                  progress={slide1}
                  active={saleDown > 0}
                />
                <SliderRow
                  label="Retourenquote"
                  valueLabel={`+${returnsUp} Pkt.`}
                  progress={slide2}
                  active={returnsUp > 0}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {active ? (
                  <Pop delay={55} slide={10}>
                    <div
                      style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(250,178,25,0.14)',
                        color: T.warn,
                        borderRadius: 999,
                        fontSize: 19,
                        fontWeight: 700,
                        padding: '8px 20px',
                      }}
                    >
                      Risikoszenario aktiv
                    </div>
                  </Pop>
                ) : (
                  <div style={{ height: 41 }} />
                )}
                <Kpi
                  label="Gewinn pro Stück"
                  value={fmtEur(profit)}
                  tone={profit > 4 ? 'pos' : 'plain'}
                  big
                />
                <div style={{ fontSize: 19, color: T.muted, maxWidth: 330 }}>
                  Alle Kennzahlen, die Simulation und die Bewertung reagieren sofort.
                </div>
              </div>
            </div>
          </Card>
        </Pop>
        <Caption delay={210} text="Teste verschiedene Szenarien mit wenigen Klicks." />
      </Center>
    </Scene>
  );
};

/* ================= Szene 8 — Abschluss (240) ================= */

export const S8Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaS = spring({ frame: frame - 95, fps, config: { damping: 13 } });
  const lines = ['Plane smarter.', 'Starte sicher.', 'Wachse schneller.'];
  return (
    <Scene duration={240}>
      <Center gap={30}>
        <Pop delay={8}>
          <BrandRow size={72} />
        </Pop>
        <div style={{ display: 'flex', gap: 26 }}>
          {lines.map((l, i) => (
            <Pop key={l} delay={28 + i * 18}>
              <span
                style={{
                  fontSize: 62,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: i === 2 ? T.accent : T.ink,
                }}
              >
                {l}
              </span>
            </Pop>
          ))}
        </div>
        <div
          style={{
            transform: `scale(${ctaS})`,
            opacity: Math.min(1, ctaS * 1.3),
            background: T.accent,
            borderRadius: 18,
            padding: '24px 52px',
            fontSize: 33,
            fontWeight: 700,
            color: '#fff',
            boxShadow: `0 20px 60px ${T.accentSoft}`,
          }}
        >
          Berechne jetzt dein Amazon-FBA-Startkapital
        </div>
        <Pop delay={130}>
          <div style={{ fontSize: 23, color: T.muted }}>
            Kostenlos · ohne Amazon-Konto · direkt im Browser
          </div>
        </Pop>
      </Center>
    </Scene>
  );
};
