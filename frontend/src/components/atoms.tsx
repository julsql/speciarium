import { CSSProperties, ReactNode } from 'react';
import { PAPER_BG, PAPER_BG_DEEP, Tokens } from '../design/tokens';

export function Paper({ children, style = {}, deep = false }: {
  children: ReactNode;
  style?: CSSProperties;
  deep?: boolean;
}) {
  return (
    <div
      style={{
        background: `${deep ? PAPER_BG_DEEP : PAPER_BG}, ${deep ? Tokens.paperDark : Tokens.paper}`,
        color: Tokens.ink,
        fontFamily: '"EB Garamond", "Garamond", serif',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Divider({ glyph = '❦', color, style = {} }: {
  glyph?: string;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      color: color || Tokens.inkMuted, fontSize: 14, ...style,
    }}>
      <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
      <span style={{ fontSize: 18, opacity: 0.9 }}>{glyph}</span>
      <div style={{ flex: 1, height: 1, background: 'currentColor', opacity: 0.4 }} />
    </div>
  );
}

export function CornerFlourish({ corner = 'tl', size = 40, color }: {
  corner?: 'tl' | 'tr' | 'bl' | 'br';
  size?: number;
  color?: string;
}) {
  const isTop = corner.includes('t');
  const isLeft = corner.includes('l');
  const style: CSSProperties = {
    position: 'absolute',
    width: size, height: size,
    pointerEvents: 'none',
    borderTop: isTop ? `1px solid ${color || Tokens.inkMuted}` : undefined,
    borderBottom: !isTop ? `1px solid ${color || Tokens.inkMuted}` : undefined,
    borderLeft: isLeft ? `1px solid ${color || Tokens.inkMuted}` : undefined,
    borderRight: !isLeft ? `1px solid ${color || Tokens.inkMuted}` : undefined,
  };
  if (isTop) style.top = 6; else style.bottom = 6;
  if (isLeft) style.left = 6; else style.right = 6;
  return <div style={style} />;
}

export function DoubleFrame({ children, padding = 28, style = {}, accent }: {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
  accent?: string;
}) {
  return (
    <div style={{ border: `1.5px solid ${accent || Tokens.inkMuted}`, padding: 6, ...style }}>
      <div style={{
        border: `1px solid ${accent || Tokens.inkMuted}`,
        padding, height: '100%', boxSizing: 'border-box',
      }}>{children}</div>
    </div>
  );
}

export function Logo({ subtitle, size = 'lg' }: {
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ts = { sm: 32, md: 48, lg: 64 }[size];
  const ss = { sm: 12, md: 16, lg: 22 }[size];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <span style={{
        fontFamily: '"Italianno", cursive', fontSize: ts, color: Tokens.ink,
        letterSpacing: 0.5, lineHeight: 0.9,
      }}>Speciarium</span>
      {subtitle && (
        <span style={{
          fontFamily: '"EB Garamond", serif', fontWeight: 600, fontSize: ss,
          color: Tokens.ink, marginTop: size === 'lg' ? 2 : 1, letterSpacing: 0.3,
        }}>{subtitle}</span>
      )}
    </div>
  );
}

export function Engraving({ label = 'gravure', w = 56, h = 56, round = false, style = {} }: {
  label?: string; w?: number; h?: number; round?: boolean; style?: CSSProperties;
}) {
  return (
    <div style={{
      width: w, height: h,
      borderRadius: round ? '50%' : 0,
      background: `repeating-linear-gradient(135deg, ${Tokens.paperDark} 0 3px, transparent 3px 6px), ${Tokens.paperLight}`,
      border: `1px solid ${Tokens.inkLight}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: Tokens.inkMuted,
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 8, letterSpacing: 0.5, textAlign: 'center',
      flexShrink: 0, ...style,
    }}>{label}</div>
  );
}

export function Latin({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return <em style={{ fontStyle: 'italic', fontFamily: '"EB Garamond", serif', ...style }}>{children}</em>;
}

export function ChipBtn({ children, active = false, onClick, style = {} }: {
  children: ReactNode; active?: boolean; onClick?: () => void; style?: CSSProperties;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px',
      background: active ? Tokens.ink : 'transparent',
      color: active ? Tokens.paper : Tokens.ink,
      border: `1px solid ${active ? Tokens.ink : Tokens.inkMuted}`,
      borderRadius: 999,
      fontFamily: '"EB Garamond", serif',
      fontSize: 14, cursor: 'pointer', ...style,
    }}>{children}</button>
  );
}

export function InkButton({ children, variant = 'solid', icon, onClick, style = {} }: {
  children: ReactNode;
  variant?: 'solid' | 'outline';
  icon?: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const isSolid = variant === 'solid';
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px',
      background: isSolid ? Tokens.ink : 'transparent',
      color: isSolid ? Tokens.paperLight : Tokens.ink,
      border: isSolid ? 'none' : `1px solid ${Tokens.ink}`,
      borderRadius: 2,
      fontFamily: '"EB Garamond", serif', fontSize: 15,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 8, ...style,
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

export function CatalogTag({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
      letterSpacing: 1, color: Tokens.inkMuted,
      padding: '2px 6px', border: `1px solid ${Tokens.inkLight}`,
      textTransform: 'uppercase', ...style,
    }}>{children}</span>
  );
}

export function IconBtn({ children, badge, active, title, onClick }: {
  children: ReactNode; badge?: string; active?: boolean; title?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 34, height: 34, position: 'relative',
      background: active ? Tokens.ink : 'transparent',
      color: active ? Tokens.paper : Tokens.ink,
      border: `1px solid ${Tokens.inkMuted}`,
      cursor: 'pointer', fontSize: 15,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
      {badge && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: Tokens.oxblood, color: Tokens.paperLight,
          width: 16, height: 16, borderRadius: '50%',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}
