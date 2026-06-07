import { Tokens } from '../design/tokens';
import { DoubleFrame, InkButton } from './atoms';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';

/**
 * Pastille de progression visible en permanence quand un upload est en cours
 * en arrière-plan. Cliquable pour ouvrir la modale de confirmation si on est
 * en stage='confirm'.
 */
export function UploadIndicator() {
  const { state, confirm, cancel, reset } = useBackgroundUpload();

  if (state.stage === 'idle') return null;

  const pct = state.total > 0 ? Math.min(100, (state.current / state.total) * 100) : 0;

  return (
    <>
      {/* Mini-pastille permanente dans le coin bas droit */}
      {(state.stage === 'scanning' || state.stage === 'uploading') && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
          width: 280,
          background: Tokens.paperLight,
          border: `1px solid ${Tokens.inkMuted}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          padding: 12,
        }}>
          <div style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 13, fontWeight: 600, color: Tokens.inkSoft,
            marginBottom: 4, display: 'flex', justifyContent: 'space-between',
          }}>
            <span>Import en cours…</span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 }}>
              {state.current}/{state.total}
            </span>
          </div>
          <div style={{ fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginBottom: 8 }}>
            {state.label}
          </div>
          <div style={{
            height: 6, background: Tokens.paperDark,
            border: `1px solid ${Tokens.inkLight}`,
          }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: Tokens.ink, transition: 'width 200ms',
            }} />
          </div>
        </div>
      )}

      {/* Modale de confirmation */}
      {state.stage === 'confirm' && state.pending && (
        <div onClick={cancel} style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(28,18,8,0.7)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
        }}>
          <div onClick={(e) => e.stopPropagation()}>
            <DoubleFrame padding={28} style={{
              background: Tokens.paperLight, minWidth: 420, maxWidth: 560,
            }}>
              <h2 style={{
                margin: 0, fontFamily: '"Cormorant Garamond", serif',
                fontSize: 22, fontWeight: 600, marginBottom: 14,
              }}>Confirmer l'import</h2>

              <p style={{ margin: '0 0 14px', color: Tokens.ink, fontSize: 14 }}>
                {confirmMessage(state.pending.summary, state.pending.rootCount)}
              </p>
              <p style={{
                margin: '0 0 14px', color: Tokens.inkMuted, fontSize: 12, fontStyle: 'italic',
              }}>
                L'import se fera en arrière-plan, tu peux continuer à naviguer.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <InkButton onClick={confirm}>Lancer l'import</InkButton>
                <InkButton variant="outline" onClick={cancel}>Annuler</InkButton>
              </div>
            </DoubleFrame>
          </div>
        </div>
      )}

      {/* Toast de fin */}
      {state.stage === 'done' && (
        <div onClick={reset} style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
          width: 280, padding: 12,
          background: Tokens.paperLight,
          border: `1px solid ${Tokens.forest}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}>
          <div style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 14, fontWeight: 600, color: Tokens.forest,
          }}>Import terminé ✦</div>
          <div style={{ fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 2 }}>
            {state.current} image{state.current > 1 ? 's' : ''} traitée{state.current > 1 ? 's' : ''}.
          </div>
        </div>
      )}

      {/* Toast d'erreur */}
      {state.stage === 'error' && (
        <div onClick={reset} style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
          width: 280, padding: 12,
          background: Tokens.paperLight,
          border: `1px solid ${Tokens.oxblood}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }}>
          <div style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 14, fontWeight: 600, color: Tokens.oxblood,
          }}>Erreur d'import</div>
          <div style={{ fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 2 }}>
            {state.error ?? 'Erreur inconnue'}
          </div>
        </div>
      )}
    </>
  );
}

function confirmMessage(summary: { added: number; changed: number; removed: number }, rootCount: number) {
  const parts: string[] = [];
  if (summary.added > 0) parts.push(`ajouter ${summary.added} nouvelle${summary.added > 1 ? 's' : ''} photo${summary.added > 1 ? 's' : ''}`);
  if (summary.changed > 0) parts.push(`modifier ${summary.changed} photo${summary.changed > 1 ? 's' : ''}`);
  if (summary.removed > 0) parts.push(`supprimer ${summary.removed} photo${summary.removed > 1 ? 's' : ''}`);
  let msg = parts.length === 1
    ? `Voulez-vous ${parts[0]} ?`
    : `Voulez-vous ${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]} ?`;
  if (rootCount > 0) {
    msg = `${rootCount} image${rootCount > 1 ? 's' : ''} à la racine ignorée${rootCount > 1 ? 's' : ''} (sous-dossier requis).\n\n${msg}`;
  }
  return msg;
}
