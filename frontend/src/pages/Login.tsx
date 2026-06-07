import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paper, DoubleFrame, Divider, Logo } from '../components/atoms';
import { Tokens } from '../design/tokens';
import { useAuth } from '../hooks/useAuth';

export function PageLogin() {
  const { login, demo } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/especes');
    } catch {
      setError('Identifiants invalides.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper deep style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <DoubleFrame padding={36} style={{ width: 420, background: Tokens.paperLight }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Logo size="md" />
        </div>
        <Divider glyph="❦" style={{ margin: '20px 0 24px' }} />
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nom d'utilisateur">
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              required autoFocus style={inputStyle} />
          </Field>
          <Field label="Mot de passe">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required style={inputStyle} />
          </Field>
          {error && (
            <div style={{ color: Tokens.oxblood, fontSize: 13, fontStyle: 'italic' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={busy} style={{
            marginTop: 6, padding: '10px 16px',
            background: Tokens.ink, color: Tokens.paperLight, border: 'none',
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: '"EB Garamond", serif', fontSize: 15,
          }}>{busy ? 'connexion…' : 'Entrer'}</button>
        </form>
        <Divider glyph="·" style={{ margin: '20px 0' }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', fontSize: 13,
          color: Tokens.inkMuted,
        }}>
          <button onClick={() => demo().then(() => navigate('/especes'))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            mode démo
          </button>
          <Link to="/signup" style={{ color: Tokens.inkMuted }}>créer un compte →</Link>
        </div>
      </DoubleFrame>
    </Paper>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontFamily: '"Cormorant Garamond", serif', fontSize: 13,
        letterSpacing: 1.2, textTransform: 'uppercase', color: Tokens.inkMuted,
      }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${Tokens.inkMuted}`,
  fontFamily: '"EB Garamond", serif',
  fontSize: 16, padding: '6px 2px',
  color: Tokens.ink, outline: 'none',
};
