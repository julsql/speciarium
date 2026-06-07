import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Tokens } from '../design/tokens';
export function PhotoThumb({ photo, w = '100%', h = 100, onClick, caption, style = {}, alt }) {
    return (_jsxs("div", { onClick: onClick, style: {
            width: w, height: h,
            border: `1px solid ${Tokens.inkLight}`,
            cursor: onClick ? 'pointer' : 'default',
            position: 'relative', overflow: 'hidden',
            flexShrink: 0,
            background: Tokens.paperDark,
            ...style,
        }, children: [_jsx("img", { src: photo.thumbnail || photo.photo, alt: alt || photo.latinName || '', loading: "lazy", style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }), caption && (_jsx("div", { style: {
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '14px 10px 8px',
                    background: 'linear-gradient(transparent, rgba(40,25,10,0.55))',
                    color: Tokens.paperLight,
                    fontFamily: '"Italianno", cursive',
                    fontSize: 18, lineHeight: 1,
                }, children: caption }))] }));
}
export function PhotoGrid({ photos, onOpen }) {
    // Index de la photo affichée en hero. Au clic sur une vignette → on la
    // remonte ici ; au clic sur la hero → on ouvre la lightbox.
    const [heroIndex, setHeroIndex] = useState(0);
    // Si la liste change (collection rechargée, espèce différente), on remet à 0.
    useEffect(() => { setHeroIndex(0); }, [photos.map((p) => p.id).join(',')]);
    if (photos.length === 0) {
        return (_jsx("div", { style: {
                padding: 20, textAlign: 'center', fontStyle: 'italic',
                color: Tokens.inkMuted, fontSize: 13,
            }, children: "aucune photographie pour cette esp\u00E8ce" }));
    }
    if (photos.length === 1) {
        return (_jsx("div", { style: { border: `1.5px solid ${Tokens.inkMuted}`, padding: 6, background: Tokens.paperLight }, children: _jsx("div", { style: { border: `1px solid ${Tokens.inkMuted}`, padding: 6 }, children: _jsx(PhotoThumb, { photo: photos[0], h: 200, onClick: () => onOpen(0) }) }) }));
    }
    if (photos.length === 2) {
        // Deux photos : on garde la grille 2-col, clic sur l'une → lightbox direct.
        return (_jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }, children: photos.map((p, i) => (_jsx(PhotoThumb, { photo: p, h: 120, onClick: () => onOpen(i) }, p.id))) }));
    }
    // 3+ photos : hero swap-able + bande de vignettes.
    const safeIndex = Math.min(heroIndex, photos.length - 1);
    const hero = photos[safeIndex];
    // Les vignettes : on prend tout sauf la hero, puis on coupe à 4.
    const others = photos.filter((_, i) => i !== safeIndex);
    const thumbs = others.slice(0, 4);
    const extra = Math.max(0, others.length - 4);
    return (_jsxs("div", { children: [_jsx("div", { style: { border: `1.5px solid ${Tokens.inkMuted}`, padding: 6, background: Tokens.paperLight }, children: _jsx("div", { style: { border: `1px solid ${Tokens.inkMuted}`, padding: 6 }, children: _jsx(PhotoThumb, { photo: hero, h: 180, onClick: () => onOpen(safeIndex) }) }) }), _jsx("div", { style: {
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginTop: 6,
                }, children: thumbs.map((p, i) => {
                    // Index réel de cette photo dans la liste d'origine
                    const origIdx = photos.findIndex((x) => x.id === p.id);
                    return (_jsxs("div", { style: { position: 'relative' }, children: [_jsx(PhotoThumb, { photo: p, h: 56, onClick: () => setHeroIndex(origIdx) }), i === thumbs.length - 1 && extra > 0 && (_jsxs("div", { onClick: () => onOpen(safeIndex), style: {
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(28, 18, 8, 0.62)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: Tokens.paperLight,
                                    fontFamily: '"Cormorant Garamond", serif',
                                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                                }, children: ["+", extra] }))] }, p.id));
                }) })] }));
}
