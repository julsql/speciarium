import { Tokens } from '../design/tokens';
import { Divider, DoubleFrame, InkButton } from './atoms';

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(28,18,8,0.7)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div onClick={(e) => e.stopPropagation()}>
        <DoubleFrame padding={32} style={{ background: Tokens.paperLight, width: 560, maxWidth: '90vw' }}>
          <h2 style={{
            margin: 0, fontFamily: '"Cormorant Garamond", serif',
            fontSize: 26, fontWeight: 600, marginBottom: 8,
          }}>Aide — Speciarium</h2>
          <Divider glyph="❦" style={{ margin: '14px 0 20px' }} />

          <Section title="Importer vos photos">
            Cliquez sur le bouton <strong>↑</strong> en haut. Sélectionnez un dossier dont
            les sous-dossiers sont organisés en <code>Pays / Région / Genre espèce détails ID.jpg</code>.
            Les métadonnées (date, GPS) sont extraites automatiquement.
          </Section>

          <Section title="Filtrer le catalogue">
            La sidebar de gauche permet de filtrer par recherche, règne, classe, ordre,
            continent, pays, année. Les valeurs proposées se restreignent à la collection
            courante. Cliquez sur « + recherche avancée » pour les dates et le groupement.
          </Section>

          <Section title="Espèces, photos et carte">
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              <li><strong>Mes espèces</strong> — un tableau d'espèces, panneau de droite avec la grille de photos</li>
              <li><strong>Mes photos</strong> — toutes les photos, groupables par année / espèce / lieu</li>
              <li><strong>Ma carte</strong> — la collection géolocalisée sur Leaflet</li>
            </ul>
          </Section>

          <Section title="Collections">
            Cliquez sur le titre de la collection sous le logo pour basculer. Dans votre
            profil, vous pouvez créer, renommer, partager (avec d'autres usagers de
            Speciarium) ou supprimer vos collections.
          </Section>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <InkButton onClick={onClose}>Fermer</InkButton>
          </div>
        </DoubleFrame>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{
        margin: 0, marginBottom: 4,
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: 16, fontWeight: 600, color: Tokens.inkSoft,
      }}>{title}</h3>
      <div style={{ fontSize: 14, lineHeight: 1.45, color: Tokens.ink }}>{children}</div>
    </div>
  );
}
