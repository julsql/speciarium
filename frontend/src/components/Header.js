import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { IconBtn } from './atoms';
import { Notifications } from '../api/notifications';
import { Collections } from '../api/collections';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
import { HelpDialog } from './HelpDialog';
const NAVS = [
    { to: '/especes', label: 'Mes espèces', short: 'Espèces', icon: '☘' },
    { to: '/photos', label: 'Mes photos', short: 'Photos', icon: '◌' },
    { to: '/carte', label: 'Ma carte', short: 'Carte', icon: '✦' },
];
export function Header({ user }) {
    const navigate = useNavigate();
    const { logout, refresh } = useAuth();
    const [notifs, setNotifs] = useState([]);
    const [collections, setCollections] = useState([]);
    const [openNotif, setOpenNotif] = useState(false);
    const [openCol, setOpenCol] = useState(false);
    const [userHover, setUserHover] = useState(false);
    const [openHelp, setOpenHelp] = useState(false);
    const { pickFolder, state: uploadState } = useBackgroundUpload();
    const { isMobile, isCompact } = useViewport();
    const root = useRef(null);
    useEffect(() => {
        if (!user)
            return;
        Notifications.list().then(setNotifs).catch(() => { });
        Collections.list().then(setCollections).catch(() => { });
        const id = window.setInterval(() => {
            Notifications.list().then(setNotifs).catch(() => { });
        }, 60_000);
        return () => window.clearInterval(id);
    }, [user]);
    useEffect(() => {
        function onClick(e) {
            if (root.current && !root.current.contains(e.target)) {
                setOpenNotif(false);
                setOpenCol(false);
            }
        }
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);
    const unseenCount = notifs.filter((n) => !n.seen).length;
    const currentCollection = collections.find((c) => c.id === user?.currentCollectionId);
    const ownsCollection = currentCollection && currentCollection.ownerId === user?.id;
    async function selectCollection(id) {
        await Collections.select(id);
        setOpenCol(false);
        await refresh();
        window.location.reload();
    }
    return (_jsxs(_Fragment, { children: [_jsxs("header", { ref: root, style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8,
                    padding: isMobile ? '8px 12px' : '12px 28px',
                    borderBottom: `1px solid ${Tokens.inkLight}`,
                    background: Tokens.paper, flexShrink: 0,
                    position: 'relative',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }, children: [_jsxs("div", { onClick: () => navigate('/especes'), style: {
                                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                                }, children: [_jsx("img", { src: "/images/papillon.png", alt: "papillon", style: {
                                            width: isMobile ? 34 : 42, height: isMobile ? 34 : 42, objectFit: 'contain',
                                            filter: 'sepia(0.3)',
                                        } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', lineHeight: 1 }, children: [_jsx("span", { style: {
                                                    fontFamily: '"Italianno", cursive', fontSize: isMobile ? 26 : 32,
                                                    color: Tokens.ink, lineHeight: 0.9,
                                                }, children: "Speciarium" }), currentCollection ? (_jsxs("button", { onClick: (e) => { e.stopPropagation(); setOpenCol(!openCol); }, style: {
                                                    background: 'transparent', border: 'none', padding: 0,
                                                    fontFamily: '"EB Garamond", serif',
                                                    fontSize: isMobile ? 11 : 13, color: Tokens.inkSoft,
                                                    fontWeight: 600, letterSpacing: 0.3,
                                                    cursor: 'pointer', marginTop: 2, textAlign: 'left',
                                                    maxWidth: isMobile ? 130 : 240,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }, children: ["\u00A9 ", currentCollection.title, " ", _jsx("span", { style: { opacity: 0.5, fontSize: 10 }, children: "\u25BC" })] })) : null] })] }), openCol && currentCollection && (_jsx("div", { onClick: (e) => e.stopPropagation(), style: {
                                    position: 'absolute', top: '100%', left: 60, marginTop: 4,
                                    minWidth: 240, padding: 8,
                                    background: Tokens.paperLight,
                                    border: `1px solid ${Tokens.inkMuted}`,
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)', zIndex: 50,
                                }, children: collections.map((c) => (_jsxs("div", { onClick: () => selectCollection(c.id), style: {
                                        padding: '6px 10px', fontSize: 13, cursor: 'pointer',
                                        background: c.id === user?.currentCollectionId ? Tokens.paperDark : 'transparent',
                                        fontWeight: c.id === user?.currentCollectionId ? 600 : 400,
                                    }, children: [c.title, c.ownerId !== user?.id && c.ownerUsername && (_jsxs("span", { style: { marginLeft: 6, fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 11 }, children: ["par @", c.ownerUsername] }))] }, c.id))) }))] }), _jsx("nav", { style: { display: 'flex', gap: 2 }, children: NAVS.map((n) => (_jsx(NavLink, { to: n.to, style: ({ isActive }) => ({
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: isMobile ? '8px 8px' : '8px 14px',
                                borderBottom: isActive ? `2px solid ${Tokens.ink}` : '2px solid transparent',
                                fontFamily: '"EB Garamond", serif', fontSize: isMobile ? 18 : 15,
                                color: isActive ? Tokens.ink : Tokens.inkMuted,
                                fontWeight: isActive ? 600 : 400,
                                textDecoration: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                            }), title: n.label, children: isMobile ? n.icon : (isCompact ? n.short : n.label) }, n.to))) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [user && ownsCollection && !user.isDemo && user.currentCollectionId != null && (_jsx(IconBtn, { title: uploadState.stage !== 'idle'
                                    ? 'un import est déjà en cours'
                                    : 'importer un dossier de photos', active: uploadState.stage !== 'idle', onClick: () => uploadState.stage === 'idle' && pickFolder(user.currentCollectionId), children: "\u2191" })), _jsx(IconBtn, { title: "aide", onClick: () => setOpenHelp(true), children: "?" }), user && (_jsxs("div", { style: { position: 'relative' }, children: [_jsx(IconBtn, { title: "notifications", badge: unseenCount > 0 ? String(unseenCount) : undefined, onClick: () => setOpenNotif(!openNotif), children: "\u25D4" }), openNotif && (_jsxs("div", { style: {
                                            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                                            width: 340, maxHeight: 400, overflow: 'auto',
                                            background: Tokens.paperLight,
                                            border: `1px solid ${Tokens.inkMuted}`,
                                            boxShadow: '0 6px 20px rgba(0,0,0,0.15)', zIndex: 50,
                                        }, children: [notifs.length === 0 && (_jsx("div", { style: {
                                                    padding: 14, fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13,
                                                }, children: "Pas de nouvelles notifications." })), notifs.map((n) => (_jsxs("div", { onClick: async () => {
                                                    if (!n.seen) {
                                                        await Notifications.markSeen(n.uploadId);
                                                        setNotifs(notifs.map((x) => x.uploadId === n.uploadId ? { ...x, seen: true } : x));
                                                    }
                                                    await Collections.select(n.collectionId);
                                                    await refresh();
                                                    navigate(`/photos?upload_action_id=${n.uploadId}`);
                                                    setOpenNotif(false);
                                                }, style: {
                                                    padding: '10px 14px', borderBottom: `1px dotted ${Tokens.inkLight}`,
                                                    cursor: 'pointer', fontSize: 13,
                                                    background: n.seen ? 'transparent' : `${Tokens.paperDark}66`,
                                                }, children: [_jsx("div", { style: {
                                                            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                                                            color: Tokens.inkMuted, letterSpacing: 0.5,
                                                        }, children: new Date(n.createdAt).toLocaleString('fr-FR') }), _jsxs("div", { children: [_jsxs("strong", { children: ["@", n.username] }), " a ajout\u00E9 ", n.imagesUploaded, " photo", n.imagesUploaded > 1 ? 's' : '', ' ', "\u00E0 ", _jsxs("em", { children: ["\u00A9", n.collectionTitle] })] })] }, n.uploadId)))] }))] })), user && (_jsxs("div", { style: { position: 'relative' }, onMouseEnter: () => setUserHover(true), onMouseLeave: () => setUserHover(false), children: [_jsxs("button", { onClick: () => navigate('/profil'), style: {
                                            display: 'inline-flex', alignItems: 'center', gap: 8,
                                            padding: isMobile ? 2 : '4px 4px 4px 12px',
                                            background: userHover ? Tokens.paperDark : 'transparent',
                                            border: `1px solid ${Tokens.inkMuted}`,
                                            borderRadius: 999, cursor: 'pointer',
                                            fontFamily: '"EB Garamond", serif', fontSize: 14,
                                            color: Tokens.ink,
                                        }, title: `@${user.username}`, children: [!isMobile && _jsxs("span", { children: ["@", user.username] }), _jsx("div", { style: {
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: Tokens.ink, color: Tokens.paperLight,
                                                    fontSize: 11, fontWeight: 600,
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                }, children: user.username.slice(0, 2).toUpperCase() })] }), userHover && (_jsx("div", { style: {
                                            position: 'absolute', top: '100%', right: 0,
                                            paddingTop: 6, zIndex: 50,
                                        }, children: _jsx("div", { style: {
                                                width: 180, padding: 6,
                                                background: Tokens.paperLight,
                                                border: `1px solid ${Tokens.inkMuted}`,
                                                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                                            }, children: _jsx("button", { onClick: () => logout().then(() => navigate('/login')), style: {
                                                    width: '100%', textAlign: 'left',
                                                    padding: '8px 12px', cursor: 'pointer', fontSize: 14,
                                                    background: 'transparent', border: 'none',
                                                    fontFamily: 'inherit', color: Tokens.ink,
                                                }, onMouseEnter: (e) => (e.currentTarget.style.background = Tokens.paperDark), onMouseLeave: (e) => (e.currentTarget.style.background = 'transparent'), children: "Se d\u00E9connecter" }) }) }))] }))] })] }), openHelp && _jsx(HelpDialog, { onClose: () => setOpenHelp(false) })] }));
}
