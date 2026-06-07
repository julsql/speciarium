import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { CornerFlourish, Divider, InkButton } from '../components/atoms';
import { Collections } from '../api/collections';
import { Themes, MapTiles } from '../api/themes';
import { Profile } from '../api/profile';
import { Species } from '../api/species';
import { Photos } from '../api/photos';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
export function PageProfil() {
    const { user, refresh, logout } = useAuth();
    const { dataVersion } = useBackgroundUpload();
    const { isCompact, isMobile } = useViewport();
    const navigate = useNavigate();
    const [collections, setCollections] = useState([]);
    const [themes, setThemes] = useState([]);
    const [mapTiles, setMapTiles] = useState([]);
    const [uploads, setUploads] = useState([]);
    const [species, setSpecies] = useState([]);
    const [photos, setPhotos] = useState([]);
    useEffect(() => {
        Collections.list().then(setCollections);
        Themes.list().then(setThemes);
        MapTiles.list().then(setMapTiles);
        Profile.uploads().then(setUploads);
        Species.list({ per_page: 1000 }).then((r) => setSpecies(r.items));
        Photos.list({ per_page: 2000 }).then((r) => setPhotos(r.items));
    }, [dataVersion]);
    const stats = useMemo(() => {
        const countries = new Set(photos.map((p) => p.country).filter(Boolean));
        return {
            species: species.length,
            photos: photos.length,
            countries: countries.size,
        };
    }, [photos, species]);
    const classStats = useMemo(() => {
        const map = {};
        species.forEach((s) => {
            const key = s.classField || 'Non classé';
            map[key] = (map[key] ?? 0) + 1;
        });
        return map;
    }, [species]);
    const maxClass = Math.max(1, ...Object.values(classStats));
    // "Membre depuis" approximée par la création de la plus ancienne collection
    const memberSince = useMemo(() => {
        if (collections.length === 0)
            return null;
        const dates = collections.map((c) => new Date(c.createdAt).getTime());
        return new Date(Math.min(...dates)).getFullYear();
    }, [collections]);
    async function reloadCollections() {
        setCollections(await Collections.list());
    }
    return (_jsx("div", { style: {
            flex: 1, overflow: 'auto',
            padding: isMobile ? '16px 14px' : isCompact ? '20px 24px' : '24px 48px',
        }, children: _jsxs("div", { style: { maxWidth: 1100, margin: '0 auto' }, children: [_jsxs("div", { style: {
                        display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24,
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                    }, children: [_jsx("div", { style: {
                                width: 96, height: 96, borderRadius: '50%',
                                background: Tokens.ink, color: Tokens.paperLight,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: '"Italianno", cursive', fontSize: 50,
                                border: `3px solid ${Tokens.paper}`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            }, children: user?.username[0]?.toUpperCase() ?? '?' }), _jsxs("div", { children: [_jsx("h1", { style: {
                                        margin: 0, fontFamily: '"Cormorant Garamond", serif',
                                        fontSize: 30, fontWeight: 600,
                                    }, children: user?.username }), _jsx("div", { style: { color: Tokens.inkMuted, fontSize: 14, fontStyle: 'italic' }, children: user?.email })] }), _jsx("div", { style: { flex: 1 } }), _jsx(InkButton, { variant: "outline", icon: "\u21A9", onClick: () => logout().then(() => navigate('/login')), children: "D\u00E9connexion" })] }), _jsxs("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                        gap: 14, marginBottom: 32,
                    }, children: [_jsx(StatCard, { n: stats.species.toString(), label: "Esp\u00E8ces" }), _jsx(StatCard, { n: stats.photos.toString(), label: "Photographies" }), _jsx(StatCard, { n: stats.countries.toString(), label: "Pays parcourus" }), _jsx(StatCard, { n: memberSince?.toString() ?? '—', label: "Membre depuis", small: true })] }), _jsxs("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr',
                        gap: 24, marginBottom: 32,
                    }, children: [_jsx(CollectionsPanel, { collections: collections, currentId: user?.currentCollectionId, ownerId: user?.id, onChange: reloadCollections, onSelect: async (id) => {
                                await Collections.select(id);
                                await refresh();
                            } }), _jsxs("section", { children: [_jsx(SectionTitle, { children: "Activit\u00E9 r\u00E9cente" }), _jsxs("div", { style: {
                                        background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`,
                                        maxHeight: 480, overflowY: 'auto', overflowX: 'hidden',
                                    }, children: [uploads.length === 0 && (_jsx("div", { style: {
                                                padding: 16, fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13,
                                            }, children: "Aucun upload pour le moment." })), uploads.map((u, i) => (_jsxs("div", { style: {
                                                display: 'flex', gap: 12, padding: '12px 14px',
                                                borderBottom: i < uploads.length - 1 ? `1px dotted ${Tokens.inkLight}` : 'none',
                                            }, children: [_jsx("div", { style: {
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        border: `1px solid ${Tokens.inkMuted}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0, color: Tokens.inkSoft, fontSize: 12,
                                                    }, children: "+" }), _jsxs("div", { style: { flex: 1, fontSize: 13.5 }, children: [_jsxs("div", { children: [_jsx("strong", { children: u.imagesUploaded }), " ajout\u00E9e", u.imagesUploaded > 1 ? 's' : '', u.imagesChanged > 0 && _jsxs(_Fragment, { children: [", ", _jsx("strong", { children: u.imagesChanged }), " modifi\u00E9e", u.imagesChanged > 1 ? 's' : ''] }), u.imagesDeleted > 0 && _jsxs(_Fragment, { children: [", ", _jsx("strong", { children: u.imagesDeleted }), " supprim\u00E9e", u.imagesDeleted > 1 ? 's' : ''] }), ' ', "\u00E0 ", _jsxs("em", { style: { fontWeight: 500 }, children: ["\u00A9", u.collectionTitle] })] }), _jsx("div", { style: {
                                                                fontSize: 11.5, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 1,
                                                            }, children: new Date(u.createdAt).toLocaleString('fr-FR') })] })] }, u.uploadId)))] }), _jsx(SectionTitle, { style: { marginTop: 24 }, children: "R\u00E9partition par classe" }), _jsxs("div", { style: {
                                        background: Tokens.paperLight,
                                        border: `1px solid ${Tokens.inkLight}`,
                                        padding: '14px 16px',
                                    }, children: [Object.entries(classStats).sort((a, b) => b[1] - a[1]).map(([cls, n]) => (_jsxs("div", { style: { marginBottom: 8 }, children: [_jsxs("div", { style: {
                                                        display: 'flex', justifyContent: 'space-between',
                                                        fontSize: 13, marginBottom: 3,
                                                    }, children: [_jsx("span", { style: {
                                                                fontFamily: '"Cormorant Garamond", serif', fontWeight: 500,
                                                            }, children: cls }), _jsx("span", { style: {
                                                                fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                                                                color: Tokens.inkMuted,
                                                            }, children: n })] }), _jsx("div", { style: { height: 6, background: Tokens.paperDark }, children: _jsx("div", { style: {
                                                            width: `${(n / maxClass) * 100}%`, height: '100%', background: Tokens.ink,
                                                        } }) })] }, cls))), Object.keys(classStats).length === 0 && (_jsx("div", { style: { fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13 }, children: "Aucune donn\u00E9e." }))] })] })] }), _jsxs("div", { style: {
                        display: 'grid',
                        gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr',
                        gap: 24, marginBottom: 32,
                    }, children: [_jsx(PickerPanel, { title: "Th\u00E8me", items: themes, onPick: async (id) => { await Themes.select(id); setThemes(await Themes.list()); await refresh(); } }), _jsx(PickerPanel, { title: "Fond de carte", items: mapTiles, onPick: async (id) => { await MapTiles.select(id); setMapTiles(await MapTiles.list()); await refresh(); } })] }), !user?.isDemo && _jsx(AccountSettings, {})] }) }));
}
function StatCard({ n, label, small }) {
    return (_jsxs("div", { style: {
            background: Tokens.paperLight,
            border: `1px solid ${Tokens.inkMuted}`,
            padding: '18px 20px', textAlign: 'center',
            position: 'relative',
        }, children: [_jsx(CornerFlourish, { corner: "tl", size: 20 }), _jsx(CornerFlourish, { corner: "tr", size: 20 }), _jsx(CornerFlourish, { corner: "bl", size: 20 }), _jsx(CornerFlourish, { corner: "br", size: 20 }), _jsx("div", { style: {
                    fontFamily: '"Cormorant Garamond", serif',
                    fontSize: small ? 30 : 40, fontWeight: 600,
                    color: Tokens.ink, lineHeight: 1,
                }, children: n }), _jsx("div", { style: {
                    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                    color: Tokens.inkMuted, marginTop: 6,
                    fontFamily: '"Cormorant Garamond", serif',
                }, children: label })] }));
}
function SectionTitle({ children, style = {} }) {
    return (_jsx("h3", { style: {
            margin: 0, marginBottom: 10,
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 18, fontWeight: 600,
            paddingBottom: 6,
            borderBottom: `1px solid ${Tokens.inkLight}`,
            ...style,
        }, children: children }));
}
function CollectionsPanel({ collections, currentId, ownerId, onChange, onSelect }) {
    const mine = collections.filter((c) => c.ownerId === ownerId);
    const shared = collections.filter((c) => c.ownerId !== ownerId);
    return (_jsxs("section", { children: [_jsx(SectionTitle, { children: "Mes collections" }), _jsxs("div", { style: {
                    background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`, padding: 14,
                }, children: [mine.length === 0 && (_jsx("div", { style: { fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13 }, children: "Aucune collection \u00E0 toi." })), mine.map((c) => (_jsx(CollectionRow, { c: c, active: c.id === currentId, owned: true, onSelect: () => onSelect(c.id), onChange: onChange }, c.id))), _jsx("button", { onClick: async () => {
                            const title = window.prompt('Nom de la nouvelle collection ?');
                            if (title) {
                                await Collections.create(title);
                                onChange();
                            }
                        }, style: {
                            width: '100%', padding: '8px', marginTop: 8,
                            background: 'transparent',
                            border: `1px dashed ${Tokens.inkMuted}`,
                            color: Tokens.inkMuted,
                            fontFamily: '"EB Garamond", serif', fontSize: 14,
                            fontStyle: 'italic', cursor: 'pointer',
                        }, children: "+ nouvelle collection" }), shared.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Divider, { glyph: "\u00B7", style: { margin: '16px 0' } }), _jsx("div", { style: {
                                    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                                    color: Tokens.inkMuted, marginBottom: 6,
                                    fontFamily: '"Cormorant Garamond", serif',
                                }, children: "Partag\u00E9es avec moi" }), shared.map((c) => (_jsx(CollectionRow, { c: c, active: c.id === currentId, owned: false, onSelect: () => onSelect(c.id), onChange: onChange }, c.id)))] }))] })] }));
}
function CollectionRow({ c, active, owned, onSelect, onChange }) {
    return (_jsxs("div", { style: {
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0', borderBottom: `1px dotted ${Tokens.inkLight}`,
            fontSize: 14,
        }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { fontFamily: '"Cormorant Garamond", serif', fontWeight: active ? 700 : 500 }, children: [c.title, active && _jsx("span", { style: { marginLeft: 8, fontSize: 10, color: Tokens.oxblood, letterSpacing: 1 }, children: "ACTIVE" }), !owned && c.ownerUsername && (_jsxs("span", { style: { marginLeft: 8, fontSize: 11, color: Tokens.inkMuted, fontStyle: 'italic' }, children: ["par @", c.ownerUsername] }))] }), _jsxs("div", { style: { fontSize: 11.5, color: Tokens.inkMuted }, children: [c.speciesCount, " esp\u00E8ces \u00B7 ", c.photoCount, " photos"] })] }), !active && _jsx(ButtonLink, { onClick: onSelect, children: "Voir" }), owned && (_jsxs(_Fragment, { children: [_jsx(ButtonLink, { onClick: async () => {
                            const next = window.prompt('Nouveau nom ?', c.title);
                            if (next && next !== c.title) {
                                await Collections.rename(c.id, next);
                                onChange();
                            }
                        }, children: "Renommer" }), _jsx(ButtonLink, { onClick: async () => {
                            const username = window.prompt('Username à inviter ?');
                            if (username) {
                                await Collections.share(c.id, username);
                                onChange();
                            }
                        }, children: "Partager" }), c.photoCount === 0 && (_jsx(ButtonLink, { onClick: async () => {
                            if (window.confirm('Supprimer cette collection ?')) {
                                await Collections.remove(c.id);
                                onChange();
                            }
                        }, children: "Supprimer" }))] }))] }));
}
function ButtonLink({ children, onClick }) {
    return (_jsx("button", { onClick: onClick, style: {
            background: 'transparent', border: 'none',
            color: Tokens.inkSoft, fontStyle: 'italic', fontSize: 12,
            cursor: 'pointer', textDecoration: 'underline',
        }, children: children }));
}
function PickerPanel({ title, items, onPick, }) {
    return (_jsxs("section", { children: [_jsx(SectionTitle, { children: title }), _jsx("div", { style: {
                    background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`,
                }, children: items.map((it) => (_jsxs("label", { style: {
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderBottom: `1px dotted ${Tokens.inkLight}`,
                        cursor: it.active ? 'default' : 'pointer',
                        background: it.active ? Tokens.paperDark : 'transparent',
                    }, children: [_jsx("input", { type: "radio", checked: it.active, onChange: () => !it.active && onPick(it.id), style: { accentColor: Tokens.ink } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }, children: it.name }), _jsx("div", { style: { fontSize: 11.5, color: Tokens.inkMuted, fontStyle: 'italic' }, children: it.description })] })] }, it.id))) })] }));
}
function AccountSettings() {
    const { user, refresh } = useAuth();
    const { isCompact } = useViewport();
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [deletePwd, setDeletePwd] = useState('');
    const [showDelete, setShowDelete] = useState(false);
    const [msg, setMsg] = useState(null);
    const navigate = useNavigate();
    async function trySave(fn, success) {
        try {
            await fn();
            setMsg({ type: 'ok', text: success });
            await refresh();
        }
        catch (e) {
            const code = e?.payload?.error ?? 'unknown';
            setMsg({ type: 'err', text: code === 'username_taken' ? 'Nom déjà pris.'
                    : code === 'email_taken' ? 'Email déjà utilisé.'
                        : code === 'wrong_password' ? 'Mot de passe incorrect.'
                            : code === 'password_too_short' ? 'Mot de passe trop court (min 8).'
                                : 'Erreur.' });
        }
    }
    return (_jsxs("section", { style: { marginBottom: 40 }, children: [_jsx(SectionTitle, { children: "Param\u00E8tres du compte" }), _jsxs("div", { style: {
                    background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`,
                    padding: 20, display: 'grid',
                    gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: 20,
                }, children: [_jsxs("div", { children: [_jsxs(Label, { children: ["Nom d'utilisateur (", user?.username, ")"] }), _jsx("input", { type: "text", value: newUsername, placeholder: "nouveau pseudo", onChange: (e) => setNewUsername(e.target.value), style: input }), _jsx(SmallBtn, { onClick: () => trySave(() => Profile.updateUsername(newUsername), 'Pseudo mis à jour.'), children: "Mettre \u00E0 jour" })] }), _jsxs("div", { children: [_jsxs(Label, { children: ["Email (", user?.email, ")"] }), _jsx("input", { type: "email", value: newEmail, placeholder: "nouvel email", onChange: (e) => setNewEmail(e.target.value), style: input }), _jsx(SmallBtn, { onClick: () => trySave(() => Profile.updateEmail(newEmail), 'Email mis à jour.'), children: "Mettre \u00E0 jour" })] }), _jsxs("div", { style: { gridColumn: '1 / -1' }, children: [_jsx(Label, { children: "Changer le mot de passe" }), _jsx("input", { type: "password", placeholder: "mot de passe actuel", value: oldPwd, onChange: (e) => setOldPwd(e.target.value), style: input }), _jsx("input", { type: "password", placeholder: "nouveau (min 8 caract\u00E8res)", value: newPwd, onChange: (e) => setNewPwd(e.target.value), style: input }), _jsx("input", { type: "password", placeholder: "confirmation", value: confirmPwd, onChange: (e) => setConfirmPwd(e.target.value), style: input }), _jsx(SmallBtn, { onClick: () => {
                                    if (newPwd !== confirmPwd) {
                                        setMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' });
                                        return;
                                    }
                                    trySave(() => Profile.updatePassword(oldPwd, newPwd), 'Mot de passe mis à jour.');
                                }, children: "Changer le mot de passe" })] }), msg && (_jsx("div", { style: {
                            gridColumn: '1 / -1',
                            fontSize: 13, fontStyle: 'italic',
                            color: msg.type === 'ok' ? Tokens.forest : Tokens.oxblood,
                        }, children: msg.text })), _jsxs("div", { style: {
                            gridColumn: '1 / -1',
                            borderTop: `1px solid ${Tokens.oxblood}33`, paddingTop: 14, marginTop: 4,
                        }, children: [_jsx(Label, { style: { color: Tokens.oxblood }, children: "Zone dangereuse" }), !showDelete ? (_jsx("button", { onClick: () => setShowDelete(true), style: {
                                    ...smallBtn, color: Tokens.oxblood, borderColor: Tokens.oxblood,
                                }, children: "Supprimer mon compte" })) : (_jsxs(_Fragment, { children: [_jsx("input", { type: "password", placeholder: "mot de passe", value: deletePwd, onChange: (e) => setDeletePwd(e.target.value), style: input }), _jsx("button", { onClick: async () => {
                                            if (!window.confirm('Suppression définitive ?'))
                                                return;
                                            try {
                                                await Profile.deleteAccount(deletePwd);
                                                navigate('/login');
                                            }
                                            catch (e) {
                                                setMsg({ type: 'err', text: e?.payload?.error === 'wrong_password'
                                                        ? 'Mot de passe incorrect.' : 'Erreur.' });
                                            }
                                        }, style: { ...smallBtn, color: Tokens.paperLight, background: Tokens.oxblood, borderColor: Tokens.oxblood }, children: "Confirmer la suppression" }), _jsx("button", { onClick: () => setShowDelete(false), style: smallBtn, children: "Annuler" })] }))] })] })] }));
}
function Label({ children, style = {} }) {
    return _jsx("div", { style: {
            fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase',
            color: Tokens.inkMuted, marginBottom: 6,
            fontFamily: '"Cormorant Garamond", serif', ...style,
        }, children: children });
}
function SmallBtn({ children, onClick }) {
    return _jsx("button", { onClick: onClick, style: smallBtn, children: children });
}
const input = {
    width: '100%', background: 'transparent',
    border: 'none', borderBottom: `1px solid ${Tokens.inkMuted}`,
    fontFamily: 'inherit', fontSize: 14, padding: '6px 2px',
    marginBottom: 8, outline: 'none',
};
const smallBtn = {
    marginTop: 4, marginRight: 6,
    padding: '6px 14px', fontSize: 13,
    background: 'transparent',
    border: `1px solid ${Tokens.inkMuted}`,
    color: Tokens.ink, cursor: 'pointer',
    fontFamily: 'inherit',
};
