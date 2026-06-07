import { useEffect, useState } from 'react';
// Sidebar gauche + panneau droit + main + paddings, ça pèse vite. On bascule
// la sidebar en drawer dès qu'on descend sous 1400 pour libérer 250 px.
const COMPACT_BREAKPOINT = 1400;
const MOBILE_BREAKPOINT = 768;
function compute(width) {
    return {
        width,
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < COMPACT_BREAKPOINT,
        isCompact: width < COMPACT_BREAKPOINT,
        isDesktop: width >= COMPACT_BREAKPOINT,
    };
}
export function useViewport() {
    const [vp, setVp] = useState(() => typeof window === 'undefined' ? compute(1440) : compute(window.innerWidth));
    useEffect(() => {
        const onResize = () => setVp(compute(window.innerWidth));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return vp;
}
