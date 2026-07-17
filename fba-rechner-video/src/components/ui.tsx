/**
 * Wiederverwendbare UI-Bausteine, die die echten Komponenten der Website
 * (Karten, Eingabefelder, KPI-Kacheln, Slider) originalgetreu nachbilden.
 */
import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { T } from '../theme';

/* ---------- Szenen-Rahmen mit Ein-/Ausblendung ---------- */

export const Scene: React.FC<{
  duration: number;
  children: React.ReactNode;
}> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 12, duration - 12, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: T.bg,
        fontFamily: T.font,
        color: T.ink,
        opacity,
      }}
    >
      {/* Dezenter Akzent-Schein wie im Hero der Website */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 500px at 30% -10%, ${T.accentSoft}, transparent 70%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/* ---------- Spring-Einblendung (Pop + Slide) ---------- */

export const Pop: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  slide?: number;
}> = ({ delay, children, style, slide = 24 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.7 } });
  return (
    <div
      style={{
        opacity: Math.min(1, s * 1.4),
        transform: `translateY(${(1 - s) * slide}px) scale(${0.96 + s * 0.04})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ---------- Untertitel-Leiste (Caption) ---------- */

export const Caption: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 20,
}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 64,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <Pop delay={delay}>
      <div
        style={{
          background: 'rgba(26,26,25,0.92)',
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: '20px 40px',
          fontSize: 34,
          fontWeight: 600,
          color: T.ink,
          boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {text}
      </div>
    </Pop>
  </div>
);

/* ---------- Karte im Website-Stil ---------- */

export const Card: React.FC<{
  title?: string;
  sub?: string;
  width?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ title, sub, width, style, children }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      boxShadow: '0 2px 4px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.45)',
      padding: 36,
      width,
      ...style,
    }}
  >
    {title ? (
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
        {sub ? (
          <div style={{ fontSize: 19, color: T.muted, marginTop: 4 }}>{sub}</div>
        ) : null}
      </div>
    ) : null}
    {children}
  </div>
);

/* ---------- Eingabefeld wie auf der Website ---------- */

export const Field: React.FC<{
  label: string;
  value: string;
  unit?: string;
  tag?: string;
  tagTone?: 'auto' | 'custom';
  focused?: boolean;
  caret?: boolean;
}> = ({ label, value, unit, tag, tagTone = 'auto', focused, caret }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
    <span style={{ fontSize: 18, fontWeight: 600, color: T.ink2 }}>{label}</span>
    <div
      style={{
        position: 'relative',
        background: focused ? T.surface : T.surface2,
        border: `2px solid ${focused ? T.accent : T.border}`,
        boxShadow: focused ? `0 0 0 5px ${T.accentSoft}` : 'none',
        borderRadius: 15,
        padding: '14px 18px',
        fontSize: 22,
        minHeight: 58,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {value}
      {caret ? (
        <span style={{ borderLeft: `2px solid ${T.accent}`, marginLeft: 2 }} />
      ) : null}
      {unit ? (
        <span
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            color: T.muted,
            fontSize: 18,
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
    {tag ? (
      <span
        style={{
          fontSize: 15,
          color: tagTone === 'custom' ? T.warn : T.muted,
          fontWeight: tagTone === 'custom' ? 600 : 400,
        }}
      >
        {tag}
      </span>
    ) : null}
  </div>
);

/* ---------- KPI-Kachel ---------- */

export const Kpi: React.FC<{
  label: string;
  value: string;
  tone?: 'pos' | 'neg' | 'plain';
  big?: boolean;
}> = ({ label, value, tone = 'plain', big }) => (
  <div
    style={{
      background: T.surface2,
      borderRadius: 18,
      padding: '22px 26px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 250,
    }}
  >
    <span style={{ fontSize: 18, color: T.muted, fontWeight: 600 }}>{label}</span>
    <span
      style={{
        fontSize: big ? 44 : 36,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        color: tone === 'pos' ? T.good : tone === 'neg' ? T.bad : T.ink,
      }}
    >
      {value}
    </span>
  </div>
);

/* ---------- Schieberegler wie in der Risikoanalyse ---------- */

export const SliderRow: React.FC<{
  label: string;
  valueLabel: string;
  progress: number; // 0..1 Thumb-Position
  active?: boolean;
  width?: number;
}> = ({ label, valueLabel, progress, active, width = 560 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 21, fontWeight: 600 }}>
      <span style={{ color: T.ink2 }}>{label}</span>
      <span style={{ color: active ? T.warn : T.accent, fontVariantNumeric: 'tabular-nums' }}>
        {valueLabel}
      </span>
    </div>
    <div style={{ position: 'relative', height: 10, borderRadius: 5, background: T.surface2 }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${progress * 100}%`,
          borderRadius: 5,
          background: active ? T.warn : T.accent,
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(${progress * 100}% - 14px)`,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: active ? T.warn : T.accent,
          border: `4px solid ${T.surface}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  </div>
);

/* ---------- Logo (wie die Marke im Topbar der Website) ---------- */

export const LogoMark: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: T.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 20px 60px ${T.accentSoft}, 0 8px 24px rgba(0,0,0,0.5)`,
    }}
  >
    {/* ◨-Glyphe des Website-Logos, als Grafik nachgebaut */}
    <div
      style={{
        width: size * 0.46,
        height: size * 0.46,
        border: `${Math.max(3, size * 0.045)}px solid #fff`,
        borderRadius: size * 0.08,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <div style={{ width: '50%', background: '#fff' }} />
    </div>
  </div>
);

/* ---------- Brand-Zeile ---------- */

export const BrandRow: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
    <LogoMark size={size} />
    <div>
      <div style={{ fontSize: size * 0.42, fontWeight: 700 }}>FBA&nbsp;Kapital</div>
      <div style={{ fontSize: size * 0.26, color: T.muted }}>
        Startkapital- &amp; Liquiditätsrechner
      </div>
    </div>
  </div>
);
