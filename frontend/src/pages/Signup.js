import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paper, DoubleFrame, Divider, Logo } from '../components/atoms';
import { Tokens } from '../design/tokens';
import { useAuth } from '../hooks/useAuth';
export function PageSignup() {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await signup(username, email, password);
            navigate('/especes');
        }
        catch (err) {
            const code = err?.payload?.error;
            setError(code === 'username_taken' ? 'Ce nom est déjà pris.'
                : code === 'email_taken' ? 'Cet email est déjà utilisé.'
                    : 'Inscription impossible.');
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsx(Paper, { deep: true, style: {
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }, children: _jsxs(DoubleFrame, { padding: 36, style: { width: 440, background: Tokens.paperLight }, children: [_jsx("div", { style: { textAlign: 'center', marginBottom: 16 }, children: _jsx(Logo, { size: "md", subtitle: "Rejoindre le cabinet" }) }), _jsx(Divider, { glyph: "\u2740", style: { margin: '20px 0 24px' } }), _jsxs("form", { onSubmit: submit, style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: [_jsx(Field, { label: "Nom d'utilisateur", children: _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), required: true, minLength: 3, autoFocus: true, style: inputStyle }) }), _jsx(Field, { label: "Email", children: _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, style: inputStyle }) }), _jsx(Field, { label: "Mot de passe", children: _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 8, style: inputStyle }) }), error && (_jsx("div", { style: { color: Tokens.oxblood, fontSize: 13, fontStyle: 'italic' }, children: error })), _jsx("button", { type: "submit", disabled: busy, style: {
                                marginTop: 6, padding: '10px 16px',
                                background: Tokens.ink, color: Tokens.paperLight, border: 'none',
                                cursor: 'pointer', fontFamily: '"EB Garamond", serif', fontSize: 15,
                            }, children: busy ? 'création…' : 'Créer mon compte' })] }), _jsx(Divider, { glyph: "\u00B7", style: { margin: '20px 0' } }), _jsx("div", { style: { textAlign: 'center', fontSize: 13 }, children: _jsx(Link, { to: "/login", style: { color: Tokens.inkMuted }, children: "d\u00E9j\u00E0 membre ?" }) })] }) }));
}
function Field({ label, children }) {
    return (_jsxs("label", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsx("span", { style: {
                    fontFamily: '"Cormorant Garamond", serif', fontSize: 13,
                    letterSpacing: 1.2, textTransform: 'uppercase', color: Tokens.inkMuted,
                }, children: label }), children] }));
}
const inputStyle = {
    background: 'transparent', border: 'none',
    borderBottom: `1px solid ${Tokens.inkMuted}`,
    fontFamily: '"EB Garamond", serif',
    fontSize: 16, padding: '6px 2px',
    color: Tokens.ink, outline: 'none',
};
