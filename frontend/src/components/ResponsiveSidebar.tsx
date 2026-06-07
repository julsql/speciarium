import { useState } from 'react';
import { Tokens } from '../design/tokens';
import { IconBtn } from './atoms';
import { SidebarFilters, SidebarFiltersProps } from './SidebarFilters';
import { useViewport } from '../hooks/useViewport';

/**
 * Affiche la sidebar de filtres :
 * - inline à gauche en desktop (>= 1100px)
 * - en drawer (overlay coulissant) en compact, déclenchable via le bouton ⌕
 *   rendu en absolu en haut à gauche du contenu principal.
 */
export function ResponsiveSidebar(props: SidebarFiltersProps) {
  const { isCompact } = useViewport();
  const [open, setOpen] = useState(false);

  if (!isCompact) {
    return <SidebarFilters {...props} />;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Ouvrir les filtres" style={{
        position: 'fixed', bottom: 24, left: 16, zIndex: 90,
        width: 52, height: 52, borderRadius: '50%',
        background: Tokens.ink,
        color: Tokens.paperLight,
        border: `1px solid ${Tokens.inkSoft}`,
        cursor: 'pointer', fontSize: 22,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
      }}>⌕</button>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(28,18,8,0.55)',
          display: 'flex',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ height: '100%' }}>
            <SidebarFilters {...props} asDrawer onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
