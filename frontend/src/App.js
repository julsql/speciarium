import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Paper } from './components/atoms';
import { Header } from './components/Header';
import { UploadIndicator } from './components/UploadIndicator';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BackgroundUploadProvider } from './hooks/useBackgroundUpload';
import { PageLogin } from './pages/Login';
import { PageSignup } from './pages/Signup';
import { PageEspeces } from './pages/Especes';
import { PagePhotos } from './pages/Photos';
import { PageCarte } from './pages/Carte';
import { PageProfil } from './pages/Profil';
import { Tokens } from './design/tokens';
function Shell({ children }) {
    const { user } = useAuth();
    return (_jsxs(Paper, { style: { height: '100vh', display: 'flex', flexDirection: 'column' }, children: [_jsx(Header, { user: user }), _jsx("div", { style: {
                    flex: 1, display: 'flex', minHeight: 0, minWidth: 0,
                    overflow: 'hidden', position: 'relative',
                }, children: children }), _jsx(UploadIndicator, {})] }));
}
function RequireAuth({ children }) {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading) {
        return (_jsx(Paper, { style: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx("span", { style: { color: Tokens.inkMuted, fontStyle: 'italic' }, children: "chargement\u2026" }) }));
    }
    if (!user)
        return _jsx(Navigate, { to: "/login", state: { from: loc }, replace: true });
    return _jsx(Shell, { children: children });
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BackgroundUploadProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(PageLogin, {}) }), _jsx(Route, { path: "/signup", element: _jsx(PageSignup, {}) }), _jsx(Route, { path: "/especes", element: _jsx(RequireAuth, { children: _jsx(PageEspeces, {}) }) }), _jsx(Route, { path: "/photos", element: _jsx(RequireAuth, { children: _jsx(PagePhotos, {}) }) }), _jsx(Route, { path: "/carte", element: _jsx(RequireAuth, { children: _jsx(PageCarte, {}) }) }), _jsx(Route, { path: "/profil", element: _jsx(RequireAuth, { children: _jsx(PageProfil, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/especes", replace: true }) })] }) }) }));
}
