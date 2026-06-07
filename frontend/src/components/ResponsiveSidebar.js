import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Tokens } from '../design/tokens';
import { SidebarFilters } from './SidebarFilters';
import { useViewport } from '../hooks/useViewport';
/**
 * Affiche la sidebar de filtres :
 * - inline à gauche en desktop (>= 1100px)
 * - en drawer (overlay coulissant) en compact, déclenchable via le bouton ⌕
 *   rendu en absolu en haut à gauche du contenu principal.
 */
export function ResponsiveSidebar(props) {
    const { isCompact } = useViewport();
    const [open, setOpen] = useState(false);
    if (!isCompact) {
        return _jsx(SidebarFilters, { ...props });
    }
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setOpen(true), "aria-label": "Ouvrir les filtres", style: {
                    position: 'fixed', bottom: 24, left: 16, zIndex: 90,
                    width: 52, height: 52, borderRadius: '50%',
                    background: Tokens.ink,
                    color: Tokens.paperLight,
                    border: `1px solid ${Tokens.inkSoft}`,
                    cursor: 'pointer', fontSize: 22,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                }, children: "\u2315" }), open && (_jsx("div", { onClick: () => setOpen(false), style: {
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(28,18,8,0.55)',
                    display: 'flex',
                }, children: _jsx("div", { onClick: (e) => e.stopPropagation(), style: { height: '100%' }, children: _jsx(SidebarFilters, { ...props, asDrawer: true, onClose: () => setOpen(false) }) }) }))] }));
}
