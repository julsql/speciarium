import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paper, DoubleFrame, Divider, Logo, InkButton } from '../components/atoms';
import { Tokens } from '../design/tokens';
import { useAuth } from '../hooks/useAuth';

export function PageSignup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(username, email, password);
      navigate('/especes');
    } catch (err: any) {
      const code = err?.payload?.error;
      setError(code === 'username_taken' ? 'Ce nom est déjà pris.'
        : code === 'email_taken' ? 'Cet email est déjà utilisé.'
        : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper deep style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <DoubleFrame padding={36} style={{ width: 440, background: Tokens.paperLight }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Logo size="md" subtitle="Rejoindre le cabinet" />
        </div>
        <Divider glyph="❀" style={{ margin: '20px 0 24px' }} />
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nom d'utilisateur">
            <input value={username} onChange={(e) => setUsername(e.target.value)}
              required minLength={3} autoFocus style={inputStyle} />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required style={inputStyle} />
          </Field>
          <Field label="Mot de passe">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} style={inputStyle} />
          </Field>
          {error && (
            <div style={{ color: Tokens.oxblood, fontSize: 13, fontStyle: 'italic' }}>{error}</div>
          )}
          <button type="submit" disabled={busy} style={{
            marginTop: 6, padding: '10px 16px',
            background: Tokens.ink, color: Tokens.paperLight, border: 'none',
            cursor: 'pointer', fontFamily: '"EB Garamond", serif', fontSize: 15,
          }}>{busy ? 'création…' : 'Créer mon compte'}</button>
        </form>
        <Divider glyph="·" style={{ margin: '20px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 13 }}>
          <Link to="/login" style={{ color: Tokens.inkMuted }}>déjà membre ?</Link>
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
  background: 'transparent', border: 'none',
  borderBottom: `1px solid ${Tokens.inkMuted}`,
  fontFamily: '"EB Garamond", serif',
  fontSize: 16, padding: '6px 2px',
  color: Tokens.ink, outline: 'none',
};
