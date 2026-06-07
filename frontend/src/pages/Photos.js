import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { Latin } from '../components/atoms';
import { PhotoThumb } from '../components/PhotoThumb';
import { Lightbox } from '../components/Lightbox';
import { ResponsiveSidebar } from '../components/ResponsiveSidebar';
import { Photos } from '../api/photos';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
import { formatDate } from '../design/format';
const SIZES = { sm: 80, md: 130, lg: 200 };
export function PagePhotos() {
    const [searchParams] = useSearchParams();
    const { dataVersion } = useBackgroundUpload();
    const { isMobile } = useViewport();
    const [items, setItems] = useState([]);
    const [size, setSize] = useState('md');
    const [grouping, setGrouping] = useState('year');
    const [lightbox, setLightbox] = useState(null);
    // Read all filters from URL — same as Espèces
    const filterKey = JSON.stringify({
        kingdom: searchParams.get('kingdom'),
        class: searchParams.get('class_field'),
        order: searchParams.get('order_field'),
        continent: searchParams.get('continent'),
        country: searchParams.get('country'),
        region: searchParams.get('region'),
        year: searchParams.get('year'),
    });
    useEffect(() => {
        const q = {
            kingdom: searchParams.get('kingdom') || undefined,
            class: searchParams.get('class_field') || undefined,
            order: searchParams.get('order_field') || undefined,
            continent: searchParams.get('continent') || undefined,
            country: searchParams.get('country') || undefined,
            region: searchParams.get('region') || undefined,
            year: searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : undefined,
        };
        Photos.list({ per_page: 2000, ...q }).then((r) => setItems(r.items));
    }, [filterKey, dataVersion]);
    const sections = useMemo(() => {
        const result = {};
        items.forEach((p) => {
            let key;
            if (grouping === 'year')
                key = p.year ? String(p.year) : 'Année inconnue';
            else if (grouping === 'species')
                key = `${p.latinName}${p.frenchName ? ' · ' + p.frenchName : ''}`;
            else if (grouping === 'place')
                key = `${p.country}${p.region ? ' · ' + p.region : ''}`;
            else
                key = '';
            (result[key] ||= []).push(p);
        });
        return result;
    }, [items, grouping]);
    const speciesCount = useMemo(() => new Set(items.map((p) => p.speciesId)).size, [items]);
    function openPhoto(photo, idxInSection, sectionPhotos) {
        // Navigation entre photos de la section affichée actuellement.
        setLightbox({
            items: sectionPhotos.map((p) => ({
                photo: p,
                latin: p.latinName,
                vernacular: p.frenchName || undefined,
            })),
            index: idxInSection,
        });
    }
    const h = SIZES[size];
    return (_jsxs("div", { style: { flex: 1, display: 'flex', minHeight: 0, height: '100%' }, children: [_jsx(ResponsiveSidebar, {}), _jsxs("main", { style: {
                    flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
                }, children: [_jsxs("div", { style: {
                            padding: isMobile ? '14px 16px' : '18px 32px',
                            borderBottom: `1px dotted ${Tokens.inkLight}`,
                            background: 'rgba(0,0,0,0.015)',
                            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                        }, children: [_jsxs("div", { children: [_jsx("h2", { style: {
                                            margin: 0, fontFamily: '"Cormorant Garamond", serif',
                                            fontSize: 28, fontWeight: 600,
                                        }, children: "Photographies" }), _jsxs("div", { style: {
                                            color: Tokens.inkMuted, fontSize: 13, marginTop: 2, fontStyle: 'italic',
                                        }, children: [items.length, " photographies sur ", speciesCount, " esp\u00E8ces"] })] }), _jsx("div", { style: { flex: 1 } }), _jsx("span", { style: { fontSize: 13, color: Tokens.inkMuted, fontStyle: 'italic' }, children: "Grouper\u00A0:" }), _jsx("div", { style: { display: 'flex', border: `1px solid ${Tokens.inkMuted}` }, children: [['year', 'Année'], ['species', 'Espèce'], ['place', 'Lieu']]
                                    .map(([k, l], i, arr) => (_jsx("button", { onClick: () => setGrouping(k), style: {
                                        padding: '6px 14px',
                                        background: grouping === k ? Tokens.ink : 'transparent',
                                        color: grouping === k ? Tokens.paperLight : Tokens.ink,
                                        border: 'none',
                                        borderRight: i < arr.length - 1 ? `1px solid ${Tokens.inkMuted}` : 'none',
                                        cursor: 'pointer',
                                        fontFamily: '"EB Garamond", serif', fontSize: 13,
                                    }, children: l }, k))) }), _jsx("div", { style: { display: 'flex', gap: 4 }, children: ['sm', 'md', 'lg'].map((k) => (_jsx("button", { onClick: () => setSize(k), style: {
                                        width: 32, height: 32,
                                        background: size === k ? Tokens.ink : 'transparent',
                                        color: size === k ? Tokens.paperLight : Tokens.ink,
                                        border: `1px solid ${Tokens.inkMuted}`,
                                        cursor: 'pointer', fontSize: 13,
                                    }, children: k === 'sm' ? '⊟' : k === 'md' ? '⊞' : '◰' }, k))) })] }), _jsxs("div", { style: {
                            flex: 1, overflow: 'auto',
                            padding: isMobile ? '18px 14px 100px' : '24px 32px',
                        }, children: [Object.entries(sections).map(([title, photos]) => (_jsxs("section", { style: { marginBottom: 36 }, children: [title && (_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }, children: [_jsx("h3", { style: {
                                                    margin: 0, fontFamily: '"Cormorant Garamond", serif',
                                                    fontSize: 22, fontWeight: 600,
                                                }, children: title }), _jsx("div", { style: { flex: 1, height: 1, background: Tokens.inkLight, opacity: 0.5 } }), _jsxs("span", { style: {
                                                    fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                                                    color: Tokens.inkMuted, letterSpacing: 1,
                                                }, children: [photos.length, " photo", photos.length > 1 ? 's' : ''] })] })), _jsx("div", { style: {
                                            display: 'grid', gap: 10,
                                            gridTemplateColumns: `repeat(auto-fill, minmax(${h + 20}px, 1fr))`,
                                        }, children: photos.map((p, i) => (_jsxs("div", { onClick: () => openPhoto(p, i, photos), style: {
                                                background: Tokens.paperLight, padding: 4,
                                                border: `1px solid ${Tokens.inkMuted}`, cursor: 'pointer',
                                            }, children: [_jsx(PhotoThumb, { photo: p, h: h }), _jsxs("div", { style: { padding: '5px 4px 2px', fontSize: 11.5, lineHeight: 1.25 }, children: [_jsx(Latin, { children: p.latinName }), _jsxs("div", { style: { color: Tokens.inkMuted, fontSize: 11 }, children: [p.country, p.date ? ' · ' + formatDate(p.date) : ''] }), p.details && (_jsxs("div", { style: {
                                                                color: Tokens.inkSoft, fontSize: 11, fontStyle: 'italic',
                                                                marginTop: 2,
                                                            }, children: ["\u00AB ", p.details, " \u00BB"] }))] })] }, p.id))) })] }, title || '__flat'))), items.length === 0 && (_jsx("div", { style: {
                                    padding: 50, textAlign: 'center', fontStyle: 'italic', color: Tokens.inkMuted,
                                }, children: "Aucune photo dans cette collection." }))] })] }), _jsx(Lightbox, { open: !!lightbox, data: lightbox, onClose: () => setLightbox(null), onChange: (i) => setLightbox(lightbox ? { ...lightbox, index: i } : null) })] }));
}
