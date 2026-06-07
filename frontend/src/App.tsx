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

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <Paper style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} />
      <div style={{
        flex: 1, display: 'flex', minHeight: 0, minWidth: 0,
        overflow: 'hidden', position: 'relative',
      }}>{children}</div>
      <UploadIndicator />
    </Paper>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <Paper style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: Tokens.inkMuted, fontStyle: 'italic' }}>chargement…</span>
      </Paper>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <AuthProvider>
      <BackgroundUploadProvider>
        <Routes>
          <Route path="/login" element={<PageLogin />} />
          <Route path="/signup" element={<PageSignup />} />
          <Route path="/especes" element={<RequireAuth><PageEspeces /></RequireAuth>} />
          <Route path="/photos" element={<RequireAuth><PagePhotos /></RequireAuth>} />
          <Route path="/carte" element={<RequireAuth><PageCarte /></RequireAuth>} />
          <Route path="/profil" element={<RequireAuth><PageProfil /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/especes" replace />} />
        </Routes>
      </BackgroundUploadProvider>
    </AuthProvider>
  );
}
