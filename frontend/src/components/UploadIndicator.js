import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    if (state.stage === 'idle')
        return null;
    const pct = state.total > 0 ? Math.min(100, (state.current / state.total) * 100) : 0;
    return (_jsxs(_Fragment, { children: [(state.stage === 'scanning' || state.stage === 'uploading') && (_jsxs("div", { style: {
                    position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
                    width: 280,
                    background: Tokens.paperLight,
                    border: `1px solid ${Tokens.inkMuted}`,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                    padding: 12,
                }, children: [_jsxs("div", { style: {
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: 13, fontWeight: 600, color: Tokens.inkSoft,
                            marginBottom: 4, display: 'flex', justifyContent: 'space-between',
                        }, children: [_jsx("span", { children: "Import en cours\u2026" }), _jsxs("span", { style: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 400 }, children: [state.current, "/", state.total] })] }), _jsx("div", { style: { fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginBottom: 8 }, children: state.label }), _jsx("div", { style: {
                            height: 6, background: Tokens.paperDark,
                            border: `1px solid ${Tokens.inkLight}`,
                        }, children: _jsx("div", { style: {
                                width: `${pct}%`, height: '100%',
                                background: Tokens.ink, transition: 'width 200ms',
                            } }) })] })), state.stage === 'confirm' && state.pending && (_jsx("div", { onClick: cancel, style: {
                    position: 'fixed', inset: 0, zIndex: 1100,
                    background: 'rgba(28,18,8,0.7)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
                }, children: _jsx("div", { onClick: (e) => e.stopPropagation(), children: _jsxs(DoubleFrame, { padding: 28, style: {
                            background: Tokens.paperLight, minWidth: 420, maxWidth: 560,
                        }, children: [_jsx("h2", { style: {
                                    margin: 0, fontFamily: '"Cormorant Garamond", serif',
                                    fontSize: 22, fontWeight: 600, marginBottom: 14,
                                }, children: "Confirmer l'import" }), _jsx("p", { style: { margin: '0 0 14px', color: Tokens.ink, fontSize: 14 }, children: confirmMessage(state.pending.summary, state.pending.rootCount) }), _jsx("p", { style: {
                                    margin: '0 0 14px', color: Tokens.inkMuted, fontSize: 12, fontStyle: 'italic',
                                }, children: "L'import se fera en arri\u00E8re-plan, tu peux continuer \u00E0 naviguer." }), _jsxs("div", { style: { display: 'flex', gap: 10 }, children: [_jsx(InkButton, { onClick: confirm, children: "Lancer l'import" }), _jsx(InkButton, { variant: "outline", onClick: cancel, children: "Annuler" })] })] }) }) })), state.stage === 'done' && (_jsxs("div", { onClick: reset, style: {
                    position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
                    width: 280, padding: 12,
                    background: Tokens.paperLight,
                    border: `1px solid ${Tokens.forest}`,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                }, children: [_jsx("div", { style: {
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: 14, fontWeight: 600, color: Tokens.forest,
                        }, children: "Import termin\u00E9 \u2726" }), _jsxs("div", { style: { fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 2 }, children: [state.current, " image", state.current > 1 ? 's' : '', " trait\u00E9e", state.current > 1 ? 's' : '', "."] })] })), state.stage === 'error' && (_jsxs("div", { onClick: reset, style: {
                    position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
                    width: 280, padding: 12,
                    background: Tokens.paperLight,
                    border: `1px solid ${Tokens.oxblood}`,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                }, children: [_jsx("div", { style: {
                            fontFamily: '"Cormorant Garamond", serif',
                            fontSize: 14, fontWeight: 600, color: Tokens.oxblood,
                        }, children: "Erreur d'import" }), _jsx("div", { style: { fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 2 }, children: state.error ?? 'Erreur inconnue' })] }))] }));
}
function confirmMessage(summary, rootCount) {
    const parts = [];
    if (summary.added > 0)
        parts.push(`ajouter ${summary.added} nouvelle${summary.added > 1 ? 's' : ''} photo${summary.added > 1 ? 's' : ''}`);
    if (summary.changed > 0)
        parts.push(`modifier ${summary.changed} photo${summary.changed > 1 ? 's' : ''}`);
    if (summary.removed > 0)
        parts.push(`supprimer ${summary.removed} photo${summary.removed > 1 ? 's' : ''}`);
    let msg = parts.length === 1
        ? `Voulez-vous ${parts[0]} ?`
        : `Voulez-vous ${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]} ?`;
    if (rootCount > 0) {
        msg = `${rootCount} image${rootCount > 1 ? 's' : ''} à la racine ignorée${rootCount > 1 ? 's' : ''} (sous-dossier requis).\n\n${msg}`;
    }
    return msg;
}
