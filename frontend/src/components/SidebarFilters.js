import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { ChipBtn, Divider } from './atoms';
import { Filters } from '../api/filters';
import { Collections } from '../api/collections';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
const GROUP_OPTIONS = ['', 'Espèce', 'Pays', 'Continent', 'Région', 'Année', 'Règne', 'Classe', 'Ordre', 'Famille'];
export function SidebarFilters({ showGroupBy = true, asDrawer = false, onClose }) {
    const { user } = useAuth();
    const { dataVersion } = useBackgroundUpload();
    const [searchParams, setSearchParams] = useSearchParams();
    const [otherCollections, setOtherCollections] = useState([]);
    const [continentOpts, setContinentOpts] = useState([]);
    const [countryOpts, setCountryOpts] = useState([]);
    const [regionOpts, setRegionOpts] = useState([]);
    const [yearOpts, setYearOpts] = useState([]);
    const [kingdomOpts, setKingdomOpts] = useState([]);
    const [classOpts, setClassOpts] = useState([]);
    const [orderOpts, setOrderOpts] = useState([]);
    const [familyOpts, setFamilyOpts] = useState([]);
    const filterKey = JSON.stringify({
        continent: searchParams.get('continent') ?? '',
        country: searchParams.get('country') ?? '',
        region: searchParams.get('region') ?? '',
        year: searchParams.get('year') ?? '',
        kingdom: searchParams.get('kingdom') ?? '',
        class_field: searchParams.get('class_field') ?? '',
        order_field: searchParams.get('order_field') ?? '',
        family: searchParams.get('family') ?? '',
        collection: user?.currentCollectionId,
    });
    useEffect(() => {
        const ctx = {
            continent: searchParams.get('continent') || undefined,
            country: searchParams.get('country') || undefined,
            region: searchParams.get('region') || undefined,
            year: searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : undefined,
            kingdom: searchParams.get('kingdom') || undefined,
            class: searchParams.get('class_field') || undefined,
            order: searchParams.get('order_field') || undefined,
        };
        Filters.options({ field: 'kingdom', ...ctx }).then((r) => setKingdomOpts(r.options));
        Filters.options({ field: 'class', ...ctx }).then((r) => setClassOpts(r.options));
        Filters.options({ field: 'order', ...ctx }).then((r) => setOrderOpts(r.options));
        Filters.options({ field: 'family', ...ctx }).then((r) => setFamilyOpts(r.options));
        Filters.options({ field: 'continent', ...ctx }).then((r) => setContinentOpts(r.options));
        Filters.options({ field: 'country', ...ctx }).then((r) => setCountryOpts(r.options));
        Filters.options({ field: 'region', ...ctx }).then((r) => setRegionOpts(r.options));
        Filters.options({ field: 'year', ...ctx }).then((r) => setYearOpts(r.options));
    }, [filterKey, dataVersion]);
    useEffect(() => {
        if (!user)
            return;
        Collections.list().then((all) => {
            setOtherCollections(all.filter((c) => c.id !== user.currentCollectionId));
        }).catch(() => { });
    }, [user?.currentCollectionId, dataVersion]);
    const v = {
        search: searchParams.get('search') ?? '',
        french_name: searchParams.get('french_name') ?? '',
        kingdom: searchParams.get('kingdom') ?? '',
        class_field: searchParams.get('class_field') ?? '',
        order_field: searchParams.get('order_field') ?? '',
        family: searchParams.get('family') ?? '',
        continent: searchParams.get('continent') ?? '',
        country: searchParams.get('country') ?? '',
        region: searchParams.get('region') ?? '',
        year: searchParams.get('year') ?? '',
        start_date: searchParams.get('start_date') ?? '',
        end_date: searchParams.get('end_date') ?? '',
        group_by: searchParams.get('group_by') ?? '',
        compare_with: searchParams.get('compare_with') ?? '',
    };
    const compareIds = v.compare_with
        ? v.compare_with.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
        : [];
    function update(patch) {
        const next = new URLSearchParams(searchParams);
        for (const [k, val] of Object.entries(patch)) {
            if (!val)
                next.delete(k);
            else
                next.set(k, val);
        }
        next.delete('page');
        setSearchParams(next, { replace: true });
    }
    function clearAll() { setSearchParams(new URLSearchParams(), { replace: true }); }
    // Règnes affichés : ceux réellement présents dans la collection (+ le règne
    // actif s'il n'apparaît plus dans les options à cause d'autres filtres).
    const kingdomChoices = Array.from(new Set([
        ...(v.kingdom ? [v.kingdom] : []),
        ...kingdomOpts,
    ]));
    const asideStyle = asDrawer
        ? {
            width: 'min(320px, 90vw)', padding: '20px 22px',
            background: Tokens.paperLight,
            overflowY: 'auto', overflowX: 'hidden',
            height: '100%',
            boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        }
        : {
            flex: '0 1 250px',
            minWidth: 210,
            maxWidth: 280,
            padding: '20px 22px',
            borderRight: `1px solid ${Tokens.inkLight}`,
            background: 'rgba(0,0,0,0.02)',
            overflowY: 'auto', overflowX: 'hidden',
            alignSelf: 'stretch',
            height: '100%', maxHeight: '100%',
        };
    return (_jsxs("aside", { style: asideStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }, children: [_jsx("h3", { style: {
                            margin: 0, fontFamily: '"Cormorant Garamond", serif',
                            fontSize: 20, fontWeight: 600,
                        }, children: "Filtres" }), _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'baseline' }, children: [_jsx("span", { onClick: clearAll, style: { fontSize: 12, color: Tokens.inkMuted, cursor: 'pointer' }, children: "tout vider" }), asDrawer && (_jsx("button", { onClick: onClose, style: {
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    fontSize: 20, color: Tokens.inkMuted, padding: 0, lineHeight: 1,
                                }, children: "\u00D7" }))] })] }), _jsx(Divider, { glyph: "\u2726", style: { margin: '12px 0 18px' } }), _jsx(FilterBlock, { label: "Recherche", children: _jsx(SearchInput, { value: v.search, placeholder: "papilio, m\u00E9sange, France\u2026", onChange: (val) => update({ search: val }) }) }), kingdomChoices.length > 0 && (_jsx(FilterBlock, { label: "R\u00E8gne", children: _jsx("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: kingdomChoices.map((k) => (_jsx(ChipBtn, { active: v.kingdom === k, onClick: () => update({ kingdom: v.kingdom === k ? '' : k }), children: k }, k))) }) })), _jsx(FilterBlock, { label: "Nom vernaculaire", children: _jsx(DatalistInput, { value: v.french_name, onChange: (val) => update({ french_name: val }) }) }), _jsx(FilterBlock, { label: "Classe", children: _jsx(DatalistInput, { value: v.class_field, options: classOpts, onChange: (val) => update({ class_field: val }), italic: true }) }), _jsx(FilterBlock, { label: "Ordre", children: _jsx(DatalistInput, { value: v.order_field, options: orderOpts, onChange: (val) => update({ order_field: val }), italic: true }) }), _jsx(FilterBlock, { label: "Famille", children: _jsx(DatalistInput, { value: v.family, options: familyOpts, onChange: (val) => update({ family: val }), italic: true }) }), _jsx(FilterBlock, { label: "Continent", children: _jsx(DatalistInput, { value: v.continent, options: continentOpts, onChange: (val) => update({ continent: val }) }) }), _jsx(FilterBlock, { label: "Pays", children: _jsx(DatalistInput, { value: v.country, options: countryOpts, onChange: (val) => update({ country: val }) }) }), _jsx(FilterBlock, { label: "R\u00E9gion", children: _jsx(DatalistInput, { value: v.region, options: regionOpts, onChange: (val) => update({ region: val }) }) }), _jsx(FilterBlock, { label: "Ann\u00E9e", children: _jsx(DatalistInput, { value: v.year, options: yearOpts, type: "number", onChange: (val) => update({ year: val }) }) }), _jsx(FilterBlock, { label: "Du", children: _jsx("input", { type: "date", value: v.start_date, onChange: (e) => update({ start_date: e.target.value }), style: inputUnderline }) }), _jsx(FilterBlock, { label: "Au", children: _jsx("input", { type: "date", value: v.end_date, onChange: (e) => update({ end_date: e.target.value }), style: inputUnderline }) }), showGroupBy && (_jsxs(_Fragment, { children: [_jsx(FilterBlock, { label: "Grouper par", children: _jsx("select", { value: v.group_by, onChange: (e) => {
                                const next = e.target.value;
                                update({ group_by: next, compare_with: next ? v.compare_with : '' });
                            }, style: inputUnderline, children: GROUP_OPTIONS.map((g) => _jsx("option", { value: g, children: g || '—' }, g)) }) }), v.group_by && otherCollections.length > 0 && (_jsx(FilterBlock, { label: "Comparer avec", children: _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: otherCollections.map((c) => {
                                const checked = compareIds.includes(c.id);
                                const label = c.ownerId !== user?.id && c.ownerUsername
                                    ? `${c.title} (@${c.ownerUsername})`
                                    : c.title;
                                return (_jsxs("label", { style: {
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        fontSize: 13, cursor: 'pointer',
                                    }, children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => {
                                                const next = e.target.checked
                                                    ? [...compareIds, c.id]
                                                    : compareIds.filter((id) => id !== c.id);
                                                update({ compare_with: next.length > 0 ? next.join(',') : '' });
                                            }, style: { accentColor: Tokens.ink } }), label] }, c.id));
                            }) }) }))] }))] }));
}
function FilterBlock({ label, children }) {
    return (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("label", { style: {
                    display: 'block', marginBottom: 6,
                    fontFamily: '"Cormorant Garamond", serif', fontSize: 14,
                    color: Tokens.inkSoft, fontWeight: 600,
                }, children: label }), children] }));
}
function SearchInput({ value, placeholder, onChange }) {
    return (_jsxs("div", { style: {
            display: 'flex', alignItems: 'center', gap: 6,
            borderBottom: `1px solid ${Tokens.inkMuted}`, padding: '4px 0',
        }, children: [_jsx("span", { style: { color: Tokens.inkMuted, fontSize: 14 }, children: "\u2315" }), _jsx("input", { value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, style: {
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: '"EB Garamond", serif', fontSize: 14, color: Tokens.ink, minWidth: 0,
                } }), value && (_jsx("span", { onClick: () => onChange(''), style: {
                    cursor: 'pointer', color: Tokens.inkMuted, fontSize: 12,
                }, children: "\u00D7" }))] }));
}
function DatalistInput({ value, options, onChange, italic, type }) {
    const listId = options && options.length ? 'dl-' + Math.random().toString(36).slice(2, 8) : undefined;
    return (_jsxs("div", { style: {
            display: 'flex', alignItems: 'center', gap: 6,
            borderBottom: `1px solid ${Tokens.inkMuted}`, padding: '4px 0',
        }, children: [_jsx("input", { type: type || 'text', value: value, list: listId, onChange: (e) => onChange(e.target.value), style: {
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: '"EB Garamond", serif', fontSize: 14, color: Tokens.ink, minWidth: 0,
                    fontStyle: italic ? 'italic' : 'normal',
                } }), value && (_jsx("span", { onClick: () => onChange(''), style: {
                    cursor: 'pointer', color: Tokens.inkMuted, fontSize: 12,
                }, children: "\u00D7" })), listId && (_jsx("datalist", { id: listId, children: options.map((o) => _jsx("option", { value: o }, o)) }))] }));
}
const inputUnderline = {
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: `1px solid ${Tokens.inkMuted}`,
    fontFamily: '"EB Garamond", serif', fontSize: 14,
    padding: '4px 0', color: Tokens.ink, outline: 'none',
};
