import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { CornerFlourish, Divider, InkButton, CatalogTag } from '../components/atoms';
import { Collections } from '../api/collections';
import { Themes, MapTiles } from '../api/themes';
import { Profile } from '../api/profile';
import { Species } from '../api/species';
import { Photos } from '../api/photos';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
import type {
  CollectionDto, MapTilesDto, PhotoDto, SpeciesRowDto, ThemeDto, UploadHistoryDto,
} from '../types/api';

export function PageProfil() {
  const { user, refresh, logout } = useAuth();
  const { dataVersion } = useBackgroundUpload();
  const { isCompact, isMobile } = useViewport();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [themes, setThemes] = useState<ThemeDto[]>([]);
  const [mapTiles, setMapTiles] = useState<MapTilesDto[]>([]);
  const [uploads, setUploads] = useState<UploadHistoryDto[]>([]);
  const [species, setSpecies] = useState<SpeciesRowDto[]>([]);
  const [photos, setPhotos] = useState<PhotoDto[]>([]);

  useEffect(() => {
    Collections.list().then(setCollections);
    Themes.list().then(setThemes);
    MapTiles.list().then(setMapTiles);
    Profile.uploads().then(setUploads);
    Species.list({ per_page: 1000 }).then((r) => setSpecies(r.items));
    Photos.list({ per_page: 2000 }).then((r) => setPhotos(r.items));
  }, [dataVersion]);

  const stats = useMemo(() => {
    const countries = new Set(photos.map((p) => p.country).filter(Boolean));
    return {
      species: species.length,
      photos: photos.length,
      countries: countries.size,
    };
  }, [photos, species]);

  const classStats = useMemo(() => {
    const map: Record<string, number> = {};
    species.forEach((s) => {
      const key = s.classField || 'Non classé';
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [species]);
  const maxClass = Math.max(1, ...Object.values(classStats));

  // "Membre depuis" approximée par la création de la plus ancienne collection
  const memberSince = useMemo(() => {
    if (collections.length === 0) return null;
    const dates = collections.map((c) => new Date(c.createdAt).getTime());
    return new Date(Math.min(...dates)).getFullYear();
  }, [collections]);

  async function reloadCollections() {
    setCollections(await Collections.list());
  }

  return (
    <div style={{
      flex: 1, overflow: 'auto',
      padding: isMobile ? '16px 14px' : isCompact ? '20px 24px' : '24px 48px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: Tokens.ink, color: Tokens.paperLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Italianno", cursive', fontSize: 50,
            border: `3px solid ${Tokens.paper}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>{user?.username[0]?.toUpperCase() ?? '?'}</div>
          <div>
            <h1 style={{
              margin: 0, fontFamily: '"Cormorant Garamond", serif',
              fontSize: 30, fontWeight: 600,
            }}>{user?.username}</h1>
            <div style={{ color: Tokens.inkMuted, fontSize: 14, fontStyle: 'italic' }}>
              {user?.email}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <InkButton variant="outline" icon="↩"
            onClick={() => logout().then(() => navigate('/login'))}>
            Déconnexion
          </InkButton>
        </div>

        {/* ─── Stats : 4 cartes Cabinet ───────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 14, marginBottom: 32,
        }}>
          <StatCard n={stats.species.toString()} label="Espèces" />
          <StatCard n={stats.photos.toString()} label="Photographies" />
          <StatCard n={stats.countries.toString()} label="Pays parcourus" />
          <StatCard n={memberSince?.toString() ?? '—'} label="Membre depuis" small />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr',
          gap: 24, marginBottom: 32,
        }}>
          <CollectionsPanel collections={collections} currentId={user?.currentCollectionId}
            ownerId={user?.id} onChange={reloadCollections} onSelect={async (id) => {
              await Collections.select(id); await refresh();
            }} />

          <section>
            <SectionTitle>Activité récente</SectionTitle>
            <div style={{
              background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`,
              maxHeight: 480, overflowY: 'auto', overflowX: 'hidden',
            }}>
              {uploads.length === 0 && (
                <div style={{
                  padding: 16, fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13,
                }}>Aucun upload pour le moment.</div>
              )}
              {uploads.map((u, i) => (
                <div key={u.uploadId} style={{
                  display: 'flex', gap: 12, padding: '12px 14px',
                  borderBottom: i < uploads.length - 1 ? `1px dotted ${Tokens.inkLight}` : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `1px solid ${Tokens.inkMuted}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: Tokens.inkSoft, fontSize: 12,
                  }}>+</div>
                  <div style={{ flex: 1, fontSize: 13.5 }}>
                    <div>
                      <strong>{u.imagesUploaded}</strong> ajoutée{u.imagesUploaded > 1 ? 's' : ''}
                      {u.imagesChanged > 0 && <>, <strong>{u.imagesChanged}</strong> modifiée{u.imagesChanged > 1 ? 's' : ''}</>}
                      {u.imagesDeleted > 0 && <>, <strong>{u.imagesDeleted}</strong> supprimée{u.imagesDeleted > 1 ? 's' : ''}</>}
                      {' '}à <em style={{ fontWeight: 500 }}>©{u.collectionTitle}</em>
                    </div>
                    <div style={{
                      fontSize: 11.5, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 1,
                    }}>{new Date(u.createdAt).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              ))}
            </div>

            <SectionTitle style={{ marginTop: 24 }}>Répartition par classe</SectionTitle>
            <div style={{
              background: Tokens.paperLight,
              border: `1px solid ${Tokens.inkLight}`,
              padding: '14px 16px',
            }}>
              {Object.entries(classStats).sort((a, b) => b[1] - a[1]).map(([cls, n]) => (
                <div key={cls} style={{ marginBottom: 8 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 13, marginBottom: 3,
                  }}>
                    <span style={{
                      fontFamily: '"Cormorant Garamond", serif', fontWeight: 500,
                    }}>{cls}</span>
                    <span style={{
                      fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                      color: Tokens.inkMuted,
                    }}>{n}</span>
                  </div>
                  <div style={{ height: 6, background: Tokens.paperDark }}>
                    <div style={{
                      width: `${(n / maxClass) * 100}%`, height: '100%', background: Tokens.ink,
                    }} />
                  </div>
                </div>
              ))}
              {Object.keys(classStats).length === 0 && (
                <div style={{ fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13 }}>
                  Aucune donnée.
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr',
          gap: 24, marginBottom: 32,
        }}>
          <PickerPanel<ThemeDto> title="Thème" items={themes}
            onPick={async (id) => { await Themes.select(id); setThemes(await Themes.list()); await refresh(); }} />
          <PickerPanel<MapTilesDto> title="Fond de carte" items={mapTiles}
            onPick={async (id) => { await MapTiles.select(id); setMapTiles(await MapTiles.list()); await refresh(); }} />
        </div>

        {!user?.isDemo && <AccountSettings />}
      </div>
    </div>
  );
}

function StatCard({ n, label, small }: { n: string; label: string; small?: boolean }) {
  return (
    <div style={{
      background: Tokens.paperLight,
      border: `1px solid ${Tokens.inkMuted}`,
      padding: '18px 20px', textAlign: 'center',
      position: 'relative',
    }}>
      <CornerFlourish corner="tl" size={20} />
      <CornerFlourish corner="tr" size={20} />
      <CornerFlourish corner="bl" size={20} />
      <CornerFlourish corner="br" size={20} />
      <div style={{
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: small ? 30 : 40, fontWeight: 600,
        color: Tokens.ink, lineHeight: 1,
      }}>{n}</div>
      <div style={{
        fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
        color: Tokens.inkMuted, marginTop: 6,
        fontFamily: '"Cormorant Garamond", serif',
      }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h3 style={{
      margin: 0, marginBottom: 10,
      fontFamily: '"Cormorant Garamond", serif',
      fontSize: 18, fontWeight: 600,
      paddingBottom: 6,
      borderBottom: `1px solid ${Tokens.inkLight}`,
      ...style,
    }}>{children}</h3>
  );
}

function CollectionsPanel({ collections, currentId, ownerId, onChange, onSelect }: {
  collections: CollectionDto[];
  currentId?: number | null;
  ownerId?: number;
  onChange: () => void;
  onSelect: (id: number) => Promise<void>;
}) {
  const mine = collections.filter((c) => c.ownerId === ownerId);
  const shared = collections.filter((c) => c.ownerId !== ownerId);

  return (
    <section>
      <SectionTitle>Mes collections</SectionTitle>
      <div style={{
        background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`, padding: 14,
      }}>
        {mine.length === 0 && (
          <div style={{ fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13 }}>
            Aucune collection à toi.
          </div>
        )}
        {mine.map((c) => (
          <CollectionRow key={c.id} c={c}
            active={c.id === currentId}
            owned
            onSelect={() => onSelect(c.id)}
            onChange={onChange} />
        ))}
        <button onClick={async () => {
          const title = window.prompt('Nom de la nouvelle collection ?');
          if (title) { await Collections.create(title); onChange(); }
        }} style={{
          width: '100%', padding: '8px', marginTop: 8,
          background: 'transparent',
          border: `1px dashed ${Tokens.inkMuted}`,
          color: Tokens.inkMuted,
          fontFamily: '"EB Garamond", serif', fontSize: 14,
          fontStyle: 'italic', cursor: 'pointer',
        }}>+ nouvelle collection</button>

        {shared.length > 0 && (
          <>
            <Divider glyph="·" style={{ margin: '16px 0' }} />
            <div style={{
              fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
              color: Tokens.inkMuted, marginBottom: 6,
              fontFamily: '"Cormorant Garamond", serif',
            }}>Partagées avec moi</div>
            {shared.map((c) => (
              <CollectionRow key={c.id} c={c}
                active={c.id === currentId}
                owned={false}
                onSelect={() => onSelect(c.id)}
                onChange={onChange} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function CollectionRow({ c, active, owned, onSelect, onChange }: {
  c: CollectionDto;
  active: boolean;
  owned: boolean;
  onSelect: () => void;
  onChange: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: `1px dotted ${Tokens.inkLight}`,
      fontSize: 14,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: active ? 700 : 500 }}>
          {c.title}
          {active && <span style={{ marginLeft: 8, fontSize: 10, color: Tokens.oxblood, letterSpacing: 1 }}>ACTIVE</span>}
          {!owned && c.ownerUsername && (
            <span style={{ marginLeft: 8, fontSize: 11, color: Tokens.inkMuted, fontStyle: 'italic' }}>
              par @{c.ownerUsername}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: Tokens.inkMuted }}>
          {c.speciesCount} espèces · {c.photoCount} photos
        </div>
      </div>
      {!active && <ButtonLink onClick={onSelect}>Voir</ButtonLink>}
      {owned && (
        <>
          <ButtonLink onClick={async () => {
            const next = window.prompt('Nouveau nom ?', c.title);
            if (next && next !== c.title) { await Collections.rename(c.id, next); onChange(); }
          }}>Renommer</ButtonLink>
          <ButtonLink onClick={async () => {
            const username = window.prompt('Username à inviter ?');
            if (username) { await Collections.share(c.id, username); onChange(); }
          }}>Partager</ButtonLink>
          {c.photoCount === 0 && (
            <ButtonLink onClick={async () => {
              if (window.confirm('Supprimer cette collection ?')) { await Collections.remove(c.id); onChange(); }
            }}>Supprimer</ButtonLink>
          )}
        </>
      )}
    </div>
  );
}

function ButtonLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: 'none',
      color: Tokens.inkSoft, fontStyle: 'italic', fontSize: 12,
      cursor: 'pointer', textDecoration: 'underline',
    }}>{children}</button>
  );
}

function PickerPanel<T extends { id: number; name: string; description: string; active: boolean }>({
  title, items, onPick,
}: {
  title: string; items: T[]; onPick: (id: number) => Promise<void>;
}) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div style={{
        background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`,
      }}>
        {items.map((it) => (
          <label key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderBottom: `1px dotted ${Tokens.inkLight}`,
            cursor: it.active ? 'default' : 'pointer',
            background: it.active ? Tokens.paperDark : 'transparent',
          }}>
            <input type="radio" checked={it.active}
              onChange={() => !it.active && onPick(it.id)}
              style={{ accentColor: Tokens.ink }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>{it.name}</div>
              <div style={{ fontSize: 11.5, color: Tokens.inkMuted, fontStyle: 'italic' }}>{it.description}</div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

function AccountSettings() {
  const { user, refresh } = useAuth();
  const { isCompact } = useViewport();
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [deletePwd, setDeletePwd] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const navigate = useNavigate();

  async function trySave(fn: () => Promise<unknown>, success: string) {
    try {
      await fn();
      setMsg({ type: 'ok', text: success });
      await refresh();
    } catch (e: any) {
      const code = e?.payload?.error ?? 'unknown';
      setMsg({ type: 'err', text: code === 'username_taken' ? 'Nom déjà pris.'
        : code === 'email_taken' ? 'Email déjà utilisé.'
        : code === 'wrong_password' ? 'Mot de passe incorrect.'
        : code === 'password_too_short' ? 'Mot de passe trop court (min 8).'
        : 'Erreur.' });
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle>Paramètres du compte</SectionTitle>
      <div style={{
        background: Tokens.paperLight, border: `1px solid ${Tokens.inkLight}`,
        padding: 20, display: 'grid',
        gridTemplateColumns: isCompact ? '1fr' : '1fr 1fr', gap: 20,
      }}>
        <div>
          <Label>Nom d'utilisateur ({user?.username})</Label>
          <input type="text" value={newUsername} placeholder="nouveau pseudo"
            onChange={(e) => setNewUsername(e.target.value)} style={input} />
          <SmallBtn onClick={() => trySave(
            () => Profile.updateUsername(newUsername), 'Pseudo mis à jour.')}>
            Mettre à jour
          </SmallBtn>
        </div>

        <div>
          <Label>Email ({user?.email})</Label>
          <input type="email" value={newEmail} placeholder="nouvel email"
            onChange={(e) => setNewEmail(e.target.value)} style={input} />
          <SmallBtn onClick={() => trySave(
            () => Profile.updateEmail(newEmail), 'Email mis à jour.')}>
            Mettre à jour
          </SmallBtn>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Changer le mot de passe</Label>
          <input type="password" placeholder="mot de passe actuel" value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)} style={input} />
          <input type="password" placeholder="nouveau (min 8 caractères)" value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)} style={input} />
          <input type="password" placeholder="confirmation" value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)} style={input} />
          <SmallBtn onClick={() => {
            if (newPwd !== confirmPwd) {
              setMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' });
              return;
            }
            trySave(() => Profile.updatePassword(oldPwd, newPwd), 'Mot de passe mis à jour.');
          }}>Changer le mot de passe</SmallBtn>
        </div>

        {msg && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 13, fontStyle: 'italic',
            color: msg.type === 'ok' ? Tokens.forest : Tokens.oxblood,
          }}>{msg.text}</div>
        )}

        <div style={{
          gridColumn: '1 / -1',
          borderTop: `1px solid ${Tokens.oxblood}33`, paddingTop: 14, marginTop: 4,
        }}>
          <Label style={{ color: Tokens.oxblood }}>Zone dangereuse</Label>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} style={{
              ...smallBtn, color: Tokens.oxblood, borderColor: Tokens.oxblood,
            }}>Supprimer mon compte</button>
          ) : (
            <>
              <input type="password" placeholder="mot de passe" value={deletePwd}
                onChange={(e) => setDeletePwd(e.target.value)} style={input} />
              <button onClick={async () => {
                if (!window.confirm('Suppression définitive ?')) return;
                try {
                  await Profile.deleteAccount(deletePwd);
                  navigate('/login');
                } catch (e: any) {
                  setMsg({ type: 'err', text: e?.payload?.error === 'wrong_password'
                    ? 'Mot de passe incorrect.' : 'Erreur.' });
                }
              }} style={{ ...smallBtn, color: Tokens.paperLight, background: Tokens.oxblood, borderColor: Tokens.oxblood }}>
                Confirmer la suppression
              </button>
              <button onClick={() => setShowDelete(false)} style={smallBtn}>Annuler</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Label({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{
    fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase',
    color: Tokens.inkMuted, marginBottom: 6,
    fontFamily: '"Cormorant Garamond", serif', ...style,
  }}>{children}</div>;
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={smallBtn}>{children}</button>;
}

const input: React.CSSProperties = {
  width: '100%', background: 'transparent',
  border: 'none', borderBottom: `1px solid ${Tokens.inkMuted}`,
  fontFamily: 'inherit', fontSize: 14, padding: '6px 2px',
  marginBottom: 8, outline: 'none',
};

const smallBtn: React.CSSProperties = {
  marginTop: 4, marginRight: 6,
  padding: '6px 14px', fontSize: 13,
  background: 'transparent',
  border: `1px solid ${Tokens.inkMuted}`,
  color: Tokens.ink, cursor: 'pointer',
  fontFamily: 'inherit',
};
