import { useEffect, useState } from 'react';

export interface Viewport {
  width: number;
  isMobile: boolean;   // < 768
  isTablet: boolean;   // 768-1280
  isCompact: boolean;  // mobile OU tablet (< 1280) — la sidebar passe en drawer
  isDesktop: boolean;  // >= 1280 — sidebar + panneau droit inline
}

// Sidebar gauche + panneau droit + main + paddings, ça pèse vite. On bascule
// la sidebar en drawer dès qu'on descend sous 1400 pour libérer 250 px.
const COMPACT_BREAKPOINT = 1400;
const MOBILE_BREAKPOINT = 768;

function compute(width: number): Viewport {
  return {
    width,
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < COMPACT_BREAKPOINT,
    isCompact: width < COMPACT_BREAKPOINT,
    isDesktop: width >= COMPACT_BREAKPOINT,
  };
}

export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(() =>
    typeof window === 'undefined' ? compute(1440) : compute(window.innerWidth)
  );
  useEffect(() => {
    const onResize = () => setVp(compute(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vp;
}
