import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { PAPER_BG_DEEP, Tokens } from '../design/tokens';
import { PhotoThumb } from './PhotoThumb';
import { MiniLocator } from './MiniLocator';
import { useViewport } from '../hooks/useViewport';
import { formatDate } from '../design/format';
// Couleurs spécifiques au cadre « planche de Buffon » (anciens tokens Django).
const BUFFON_MAT = '#dde5c0'; // vert pâle du tapis sous la photo
const BUFFON_BORDER = '#615447'; // brun foncé du double trait
export function Lightbox({ open, data, onClose, onChange }) {
    const { isCompact, isMobile } = useViewport();
    useEffect(() => {
        if (!open || !data)
            return;
        const onKey = (e) => {
            if (e.key === 'Escape')
                onClose();
            if (e.key === 'ArrowLeft')
                onChange(Math.max(0, data.index - 1));
            if (e.key === 'ArrowRight')
                onChange(Math.min(data.items.length - 1, data.index + 1));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, data, onChange, onClose]);
    if (!open || !data)
        return null;
    const { items, index } = data;
    const item = items[index];
    if (!item)
        return null;
    const photo = item.photo;
    const dateStr = formatDate(photo.date);
    return (_jsxs("div", { onClick: onClose, style: {
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(28, 18, 8, 0.86)',
            backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? 12 : 40,
        }, children: [_jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                    position: 'absolute', top: 20, left: 24, right: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: Tokens.paperLight, zIndex: 1,
                }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 20 }, children: item.latin }), _jsxs("div", { style: { fontSize: 13, opacity: 0.7, marginTop: 2 }, children: [item.vernacular ? item.vernacular + ' · ' : '', photo.country, photo.region ? `, ${photo.region}` : '', " \u00B7 ", dateStr] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, alignItems: 'center' }, children: [_jsxs("span", { style: {
                                    fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                                    opacity: 0.7, letterSpacing: 1,
                                }, children: [index + 1, " / ", items.length] }), _jsx("button", { onClick: onClose, style: {
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'transparent', color: Tokens.paperLight,
                                    border: `1px solid rgba(255,250,238,0.4)`, cursor: 'pointer', fontSize: 18,
                                }, children: "\u00D7" })] })] }), index > 0 && (_jsx("button", { onClick: (e) => { e.stopPropagation(); onChange(index - 1); }, style: navBtnStyle('left'), children: "\u2039" })), _jsxs("div", { onClick: (e) => e.stopPropagation(), style: {
                    display: 'flex',
                    flexDirection: isCompact ? 'column' : 'row',
                    alignItems: isCompact ? 'center' : 'flex-start',
                    gap: isCompact ? 10 : 16,
                    maxWidth: isCompact ? '100%' : '90vw',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                }, children: [_jsxs("div", { style: {
                            background: `${PAPER_BG_DEEP}, ${Tokens.paperDark}`,
                            padding: isMobile ? 18 : 30,
                            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
                        }, children: [_jsx("div", { style: {
                                    background: BUFFON_MAT,
                                    border: `1px solid ${BUFFON_BORDER}`,
                                    padding: 8,
                                }, children: _jsx("div", { style: {
                                        margin: 10,
                                        outline: `2px solid ${BUFFON_BORDER}`,
                                        outlineOffset: 4,
                                        display: 'flex', flexDirection: 'column',
                                    }, children: _jsx(ProgressiveImage, { thumbnail: photo.thumbnail, fullSrc: photo.photo || photo.thumbnail, alt: item.latin, maxWidth: isCompact ? '82vw' : '68vw', maxHeight: isMobile ? '50vh' : '60vh' }) }) }), _jsxs("div", { style: {
                                    marginTop: 14, padding: '0 4px',
                                    textAlign: 'center',
                                    fontFamily: '"EB Garamond", serif',
                                    color: BUFFON_BORDER,
                                }, children: [_jsxs("div", { style: { fontStyle: 'italic', fontSize: 20, marginBottom: 2 }, children: [item.vernacular && (_jsxs("span", { style: { fontStyle: 'normal', marginRight: 8 }, children: [item.vernacular, " \u2014"] })), item.latin] }), (photo.details || photo.country) && (_jsxs("div", { style: { fontSize: 14, opacity: 0.85 }, children: ["Photo prise le ", dateStr, " en ", photo.country, photo.region ? ` (${photo.region})` : '', photo.details ? `. ${photo.details}` : '.'] })), _jsxs("div", { style: {
                                            marginTop: 6,
                                            display: 'flex', justifyContent: 'space-between',
                                            fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                                            fontFamily: '"Cormorant Garamond", serif',
                                            color: BUFFON_BORDER, opacity: 0.7,
                                        }, children: [_jsx("span", { children: photo.numberPicture || `P-${photo.id}` }), _jsx("span", { children: dateStr })] })] })] }), photo.latitude != null && photo.longitude != null && (_jsx("div", { style: { flexShrink: 0 }, children: _jsx(MiniLocator, { country: photo.country, region: photo.region, lat: photo.latitude, lng: photo.longitude }) }))] }), index < items.length - 1 && (_jsx("button", { onClick: (e) => { e.stopPropagation(); onChange(index + 1); }, style: navBtnStyle('right'), children: "\u203A" })), _jsx("div", { onClick: (e) => e.stopPropagation(), style: {
                    position: 'absolute', bottom: 24, left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex', gap: 6, padding: 6,
                    background: 'rgba(28,18,8,0.5)',
                    border: `1px solid rgba(255,250,238,0.2)`,
                    maxWidth: '90vw', overflowX: 'auto',
                }, children: items.map((it, i) => (_jsx("div", { onClick: () => onChange(i), style: {
                        width: 52, height: 40,
                        border: i === index ? `2px solid ${Tokens.paperLight}` : '2px solid transparent',
                        cursor: 'pointer', overflow: 'hidden', opacity: i === index ? 1 : 0.6,
                        flexShrink: 0,
                    }, children: _jsx(PhotoThumb, { photo: it.photo, w: "100%", h: "100%" }) }, `${it.photo.id}-${i}`))) })] }));
}
/**
 * Affiche la grande image, en utilisant la miniature comme placeholder flou
 * pendant le téléchargement. Dès que la grande est chargée, elle se substitue.
 * Le `key` sur les <img> + le `cachedFullSrcs` garantissent qu'on ne ré-affiche
 * pas la mini si la grande est déjà en cache (cas du re-clic).
 */
const cachedFullSrcs = new Set();
function ProgressiveImage({ thumbnail, fullSrc, alt, maxWidth, maxHeight }) {
    const [fullLoaded, setFullLoaded] = useState(() => cachedFullSrcs.has(fullSrc));
    // Reset quand on change de photo
    useEffect(() => {
        if (cachedFullSrcs.has(fullSrc)) {
            setFullLoaded(true);
            return;
        }
        setFullLoaded(false);
        // Précharge en background : si l'image est déjà dans le cache HTTP
        // browser, onload se déclenche immédiatement.
        const img = new Image();
        img.onload = () => {
            cachedFullSrcs.add(fullSrc);
            setFullLoaded(true);
        };
        img.src = fullSrc;
        return () => {
            img.onload = null;
        };
    }, [fullSrc]);
    const baseStyle = {
        maxWidth, maxHeight,
        objectFit: 'contain', display: 'block',
        border: `1px solid ${BUFFON_BORDER}`,
        background: '#000',
    };
    return (_jsxs("div", { style: { position: 'relative', display: 'inline-block', lineHeight: 0 }, children: [!fullLoaded && (_jsx("img", { src: thumbnail, alt: alt, style: {
                    ...baseStyle,
                    filter: 'blur(6px)',
                    transform: 'scale(1.02)', // évite que le blur déborde du cadre
                } })), _jsx("img", { src: fullSrc, alt: alt, style: {
                    ...baseStyle,
                    position: fullLoaded ? 'static' : 'absolute',
                    inset: fullLoaded ? undefined : 0,
                    opacity: fullLoaded ? 1 : 0,
                    transition: 'opacity 200ms ease-out',
                }, onLoad: () => {
                    cachedFullSrcs.add(fullSrc);
                    setFullLoaded(true);
                } }, fullSrc)] }));
}
function navBtnStyle(side) {
    return {
        position: 'absolute', [side]: 24, top: '50%',
        transform: 'translateY(-50%)',
        width: 48, height: 48, borderRadius: '50%',
        background: 'rgba(255,250,238,0.1)',
        color: Tokens.paperLight,
        border: `1px solid rgba(255,250,238,0.4)`,
        cursor: 'pointer', fontSize: 28, lineHeight: 1,
        fontFamily: '"EB Garamond", serif',
    };
}
