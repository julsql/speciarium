import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tokens } from '../design/tokens';
import { Divider, DoubleFrame, InkButton } from './atoms';
export function HelpDialog({ onClose }) {
    return (_jsx("div", { onClick: onClose, style: {
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(28,18,8,0.7)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
        }, children: _jsx("div", { onClick: (e) => e.stopPropagation(), children: _jsxs(DoubleFrame, { padding: 32, style: { background: Tokens.paperLight, width: 560, maxWidth: '90vw' }, children: [_jsx("h2", { style: {
                            margin: 0, fontFamily: '"Cormorant Garamond", serif',
                            fontSize: 26, fontWeight: 600, marginBottom: 8,
                        }, children: "Aide \u2014 Speciarium" }), _jsx(Divider, { glyph: "\u2766", style: { margin: '14px 0 20px' } }), _jsxs(Section, { title: "Importer vos photos", children: ["Cliquez sur le bouton ", _jsx("strong", { children: "\u2191" }), " en haut. S\u00E9lectionnez un dossier dont les sous-dossiers sont organis\u00E9s en ", _jsx("code", { children: "Pays / R\u00E9gion / Genre esp\u00E8ce d\u00E9tails ID.jpg" }), ". Les m\u00E9tadonn\u00E9es (date, GPS) sont extraites automatiquement."] }), _jsx(Section, { title: "Filtrer le catalogue", children: "La sidebar de gauche permet de filtrer par recherche, r\u00E8gne, classe, ordre, continent, pays, ann\u00E9e. Les valeurs propos\u00E9es se restreignent \u00E0 la collection courante. Cliquez sur \u00AB + recherche avanc\u00E9e \u00BB pour les dates et le groupement." }), _jsx(Section, { title: "Esp\u00E8ces, photos et carte", children: _jsxs("ul", { style: { margin: '4px 0 0', paddingLeft: 18 }, children: [_jsxs("li", { children: [_jsx("strong", { children: "Mes esp\u00E8ces" }), " \u2014 un tableau d'esp\u00E8ces, panneau de droite avec la grille de photos"] }), _jsxs("li", { children: [_jsx("strong", { children: "Mes photos" }), " \u2014 toutes les photos, groupables par ann\u00E9e / esp\u00E8ce / lieu"] }), _jsxs("li", { children: [_jsx("strong", { children: "Ma carte" }), " \u2014 la collection g\u00E9olocalis\u00E9e sur Leaflet"] })] }) }), _jsx(Section, { title: "Collections", children: "Cliquez sur le titre de la collection sous le logo pour basculer. Dans votre profil, vous pouvez cr\u00E9er, renommer, partager (avec d'autres usagers de Speciarium) ou supprimer vos collections." }), _jsx("div", { style: { marginTop: 20, display: 'flex', justifyContent: 'flex-end' }, children: _jsx(InkButton, { onClick: onClose, children: "Fermer" }) })] }) }) }));
}
function Section({ title, children }) {
    return (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("h3", { style: {
                    margin: 0, marginBottom: 4,
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: 16, fontWeight: 600, color: Tokens.inkSoft,
                }, children: title }), _jsx("div", { style: { fontSize: 14, lineHeight: 1.45, color: Tokens.ink }, children: children })] }));
}
