import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PAPER_BG, PAPER_BG_DEEP, Tokens } from '../design/tokens';
export function Paper({ children, style = {}, deep = false }) {
    return (_jsx("div", { style: {
            background: `${deep ? PAPER_BG_DEEP : PAPER_BG}, ${deep ? Tokens.paperDark : Tokens.paper}`,
            color: Tokens.ink,
            fontFamily: '"EB Garamond", "Garamond", serif',
            position: 'relative',
            ...style,
        }, children: children }));
}
export function Divider({ glyph = '❦', color, style = {} }) {
    return (_jsxs("div", { style: {
            display: 'flex', alignItems: 'center', gap: 14,
            color: color || Tokens.inkMuted, fontSize: 14, ...style,
        }, children: [_jsx("div", { style: { flex: 1, height: 1, background: 'currentColor', opacity: 0.4 } }), _jsx("span", { style: { fontSize: 18, opacity: 0.9 }, children: glyph }), _jsx("div", { style: { flex: 1, height: 1, background: 'currentColor', opacity: 0.4 } })] }));
}
export function CornerFlourish({ corner = 'tl', size = 40, color }) {
    const isTop = corner.includes('t');
    const isLeft = corner.includes('l');
    const style = {
        position: 'absolute',
        width: size, height: size,
        pointerEvents: 'none',
        borderTop: isTop ? `1px solid ${color || Tokens.inkMuted}` : undefined,
        borderBottom: !isTop ? `1px solid ${color || Tokens.inkMuted}` : undefined,
        borderLeft: isLeft ? `1px solid ${color || Tokens.inkMuted}` : undefined,
        borderRight: !isLeft ? `1px solid ${color || Tokens.inkMuted}` : undefined,
    };
    if (isTop)
        style.top = 6;
    else
        style.bottom = 6;
    if (isLeft)
        style.left = 6;
    else
        style.right = 6;
    return _jsx("div", { style: style });
}
export function DoubleFrame({ children, padding = 28, style = {}, accent }) {
    return (_jsx("div", { style: { border: `1.5px solid ${accent || Tokens.inkMuted}`, padding: 6, ...style }, children: _jsx("div", { style: {
                border: `1px solid ${accent || Tokens.inkMuted}`,
                padding, height: '100%', boxSizing: 'border-box',
            }, children: children }) }));
}
export function Logo({ subtitle, size = 'lg' }) {
    const ts = { sm: 32, md: 48, lg: 64 }[size];
    const ss = { sm: 12, md: 16, lg: 22 }[size];
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', lineHeight: 1 }, children: [_jsx("span", { style: {
                    fontFamily: '"Italianno", cursive', fontSize: ts, color: Tokens.ink,
                    letterSpacing: 0.5, lineHeight: 0.9,
                }, children: "Speciarium" }), subtitle && (_jsx("span", { style: {
                    fontFamily: '"EB Garamond", serif', fontWeight: 600, fontSize: ss,
                    color: Tokens.ink, marginTop: size === 'lg' ? 2 : 1, letterSpacing: 0.3,
                }, children: subtitle }))] }));
}
export function Engraving({ label = 'gravure', w = 56, h = 56, round = false, style = {} }) {
    return (_jsx("div", { style: {
            width: w, height: h,
            borderRadius: round ? '50%' : 0,
            background: `repeating-linear-gradient(135deg, ${Tokens.paperDark} 0 3px, transparent 3px 6px), ${Tokens.paperLight}`,
            border: `1px solid ${Tokens.inkLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: Tokens.inkMuted,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 8, letterSpacing: 0.5, textAlign: 'center',
            flexShrink: 0, ...style,
        }, children: label }));
}
export function Latin({ children, style = {} }) {
    return _jsx("em", { style: { fontStyle: 'italic', fontFamily: '"EB Garamond", serif', ...style }, children: children });
}
export function ChipBtn({ children, active = false, onClick, style = {} }) {
    return (_jsx("button", { onClick: onClick, style: {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: active ? Tokens.ink : 'transparent',
            color: active ? Tokens.paper : Tokens.ink,
            border: `1px solid ${active ? Tokens.ink : Tokens.inkMuted}`,
            borderRadius: 999,
            fontFamily: '"EB Garamond", serif',
            fontSize: 14, cursor: 'pointer', ...style,
        }, children: children }));
}
export function InkButton({ children, variant = 'solid', icon, onClick, style = {} }) {
    const isSolid = variant === 'solid';
    return (_jsxs("button", { onClick: onClick, style: {
            padding: '8px 16px',
            background: isSolid ? Tokens.ink : 'transparent',
            color: isSolid ? Tokens.paperLight : Tokens.ink,
            border: isSolid ? 'none' : `1px solid ${Tokens.ink}`,
            borderRadius: 2,
            fontFamily: '"EB Garamond", serif', fontSize: 15,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8, ...style,
        }, children: [icon && _jsx("span", { children: icon }), children] }));
}
export function CatalogTag({ children, style = {} }) {
    return (_jsx("span", { style: {
            display: 'inline-block',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            letterSpacing: 1, color: Tokens.inkMuted,
            padding: '2px 6px', border: `1px solid ${Tokens.inkLight}`,
            textTransform: 'uppercase', ...style,
        }, children: children }));
}
export function IconBtn({ children, badge, active, title, onClick }) {
    return (_jsxs("button", { onClick: onClick, title: title, style: {
            width: 34, height: 34, position: 'relative',
            background: active ? Tokens.ink : 'transparent',
            color: active ? Tokens.paper : Tokens.ink,
            border: `1px solid ${Tokens.inkMuted}`,
            cursor: 'pointer', fontSize: 15,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }, children: [children, badge && (_jsx("span", { style: {
                    position: 'absolute', top: -4, right: -4,
                    background: Tokens.oxblood, color: Tokens.paperLight,
                    width: 16, height: 16, borderRadius: '50%',
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 9, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }, children: badge }))] }));
}
