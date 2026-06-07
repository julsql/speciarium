import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paper, DoubleFrame, Divider, Logo } from '../components/atoms';
import { Tokens } from '../design/tokens';
import { useAuth } from '../hooks/useAuth';
export function PageLogin() {
    const { login, demo } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await login(username, password);
            navigate('/especes');
        }
        catch {
            setError('Identifiants invalides.');
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx(Paper, { deep: true, style: {
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsxs(DoubleFrame, { padding: 36, style: { width: 420, background: Tokens.paperLight }, children: [_jsx("div", { style: { textAlign: 'center', marginBottom: 16 }, children: _jsx(Logo, { size: "md" }) }), _jsx(Divider, { glyph: "\u2766", style: { margin: '20px 0 24px' } }), _jsxs("form", { onSubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: [_jsx(Field, { label: "Nom d'utilisateur", children: _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), required: true, autoFocus: true, style: inputStyle }) }), _jsx(Field, { label: "Mot de passe", children: _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, style: inputStyle }) }), error && (_jsx("div", { style: { color: Tokens.oxblood, fontSize: 13, fontStyle: 'italic' }, children: error })), _jsx("button", { type: "submit", disabled: busy, style: {
                                marginTop: 6, padding: '10px 16px',
                                background: Tokens.ink, color: Tokens.paperLight, border: 'none',
                                cursor: busy ? 'wait' : 'pointer',
                                fontFamily: '"EB Garamond", serif', fontSize: 15,
                            }, children: busy ? 'connexion…' : 'Entrer' })] }), _jsx(Divider, { glyph: "\u00B7", style: { margin: '20px 0' } }), _jsxs("div", { style: {
                        display: 'flex', justifyContent: 'space-between', fontSize: 13,
                        color: Tokens.inkMuted,
                    }, children: [_jsx("button", { onClick: () => demo().then(() => navigate('/especes')), style: { background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }, children: "mode d\u00E9mo" }), _jsx(Link, { to: "/signup", style: { color: Tokens.inkMuted }, children: "cr\u00E9er un compte \u2192" })] })] }) }));
}
function Field({ label, children }) {
    return (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("span", { style: {
                    fontFamily: '"Cormorant Garamond", serif', fontSize: 13,
                    letterSpacing: 1.2, textTransform: 'uppercase', color: Tokens.inkMuted,
                }, children: label }), children] }));
}
const inputStyle = {
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${Tokens.inkMuted}`,
    fontFamily: '"EB Garamond", serif',
    fontSize: 16, padding: '6px 2px',
    color: Tokens.ink, outline: 'none',
};
