import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { IconBtn } from './atoms';
import { Notifications } from '../api/notifications';
import { Collections } from '../api/collections';
import type { CollectionDto, NotificationDto, UserDto } from '../types/api';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
import { HelpDialog } from './HelpDialog';

const NAVS = [
  { to: '/especes', label: 'Mes espèces', short: 'Espèces', icon: '☘' },
  { to: '/photos', label: 'Mes photos', short: 'Photos', icon: '◌' },
  { to: '/carte', label: 'Ma carte', short: 'Carte', icon: '✦' },
];

export function Header({ user }: { user: UserDto | null }) {
  const navigate = useNavigate();
  const { logout, refresh } = useAuth();
  const [notifs, setNotifs] = useState<NotificationDto[]>([]);
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [openNotif, setOpenNotif] = useState(false);
  const [openCol, setOpenCol] = useState(false);
  const [userHover, setUserHover] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const { pickFolder, state: uploadState } = useBackgroundUpload();
  const { isMobile, isCompact } = useViewport();

  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    Notifications.list().then(setNotifs).catch(() => {});
    Collections.list().then(setCollections).catch(() => {});
    const id = window.setInterval(() => {
      Notifications.list().then(setNotifs).catch(() => {});
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpenNotif(false); setOpenCol(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unseenCount = notifs.filter((n) => !n.seen).length;
  const currentCollection = collections.find((c) => c.id === user?.currentCollectionId);
  const ownsCollection = currentCollection && currentCollection.ownerId === user?.id;

  async function selectCollection(id: number) {
    await Collections.select(id);
    setOpenCol(false);
    await refresh();
    window.location.reload();
  }

  return (
    <>
      <header ref={root} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8,
        padding: isMobile ? '8px 12px' : '12px 28px',
        borderBottom: `1px solid ${Tokens.inkLight}`,
        background: Tokens.paper, flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div onClick={() => navigate('/especes')} style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <img src="/images/papillon.png" alt="papillon" style={{
              width: isMobile ? 34 : 42, height: isMobile ? 34 : 42, objectFit: 'contain',
              filter: 'sepia(0.3)',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{
                fontFamily: '"Italianno", cursive', fontSize: isMobile ? 26 : 32,
                color: Tokens.ink, lineHeight: 0.9,
              }}>Speciarium</span>
              {currentCollection ? (
                <button onClick={(e) => { e.stopPropagation(); setOpenCol(!openCol); }} style={{
                  background: 'transparent', border: 'none', padding: 0,
                  fontFamily: '"EB Garamond", serif',
                  fontSize: isMobile ? 11 : 13, color: Tokens.inkSoft,
                  fontWeight: 600, letterSpacing: 0.3,
                  cursor: 'pointer', marginTop: 2, textAlign: 'left',
                  maxWidth: isMobile ? 130 : 240,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  © {currentCollection.title} <span style={{ opacity: 0.5, fontSize: 10 }}>▼</span>
                </button>
              ) : null}
            </div>
          </div>
          {openCol && currentCollection && (
            <div onClick={(e) => e.stopPropagation()} style={{
              position: 'absolute', top: '100%', left: 60, marginTop: 4,
              minWidth: 240, padding: 8,
              background: Tokens.paperLight,
              border: `1px solid ${Tokens.inkMuted}`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)', zIndex: 50,
            }}>
              {collections.map((c) => (
                <div key={c.id} onClick={() => selectCollection(c.id)} style={{
                  padding: '6px 10px', fontSize: 13, cursor: 'pointer',
                  background: c.id === user?.currentCollectionId ? Tokens.paperDark : 'transparent',
                  fontWeight: c.id === user?.currentCollectionId ? 600 : 400,
                }}>
                  {c.title}
                  {c.ownerId !== user?.id && c.ownerUsername && (
                    <span style={{ marginLeft: 6, fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 11 }}>
                      par @{c.ownerUsername}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <nav style={{ display: 'flex', gap: 2 }}>
          {NAVS.map((n) => (
            <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: isMobile ? '8px 8px' : '8px 14px',
              borderBottom: isActive ? `2px solid ${Tokens.ink}` : '2px solid transparent',
              fontFamily: '"EB Garamond", serif', fontSize: isMobile ? 18 : 15,
              color: isActive ? Tokens.ink : Tokens.inkMuted,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            })} title={n.label}>
              {isMobile ? n.icon : (isCompact ? n.short : n.label)}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && ownsCollection && !user.isDemo && user.currentCollectionId != null && (
            <IconBtn title={uploadState.stage !== 'idle'
              ? 'un import est déjà en cours'
              : 'importer un dossier de photos'}
              active={uploadState.stage !== 'idle'}
              onClick={() => uploadState.stage === 'idle' && pickFolder(user.currentCollectionId!)}>↑</IconBtn>
          )}

          <IconBtn title="aide" onClick={() => setOpenHelp(true)}>?</IconBtn>

          {user && (
            <div style={{ position: 'relative' }}>
              <IconBtn title="notifications" badge={unseenCount > 0 ? String(unseenCount) : undefined}
                onClick={() => setOpenNotif(!openNotif)}>◔</IconBtn>
              {openNotif && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  width: 340, maxHeight: 400, overflow: 'auto',
                  background: Tokens.paperLight,
                  border: `1px solid ${Tokens.inkMuted}`,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)', zIndex: 50,
                }}>
                  {notifs.length === 0 && (
                    <div style={{
                      padding: 14, fontStyle: 'italic', color: Tokens.inkMuted, fontSize: 13,
                    }}>Pas de nouvelles notifications.</div>
                  )}
                  {notifs.map((n) => (
                    <div key={n.uploadId} onClick={async () => {
                      if (!n.seen) {
                        await Notifications.markSeen(n.uploadId);
                        setNotifs(notifs.map((x) => x.uploadId === n.uploadId ? { ...x, seen: true } : x));
                      }
                      await Collections.select(n.collectionId);
                      await refresh();
                      navigate(`/photos?upload_action_id=${n.uploadId}`);
                      setOpenNotif(false);
                    }} style={{
                      padding: '10px 14px', borderBottom: `1px dotted ${Tokens.inkLight}`,
                      cursor: 'pointer', fontSize: 13,
                      background: n.seen ? 'transparent' : `${Tokens.paperDark}66`,
                    }}>
                      <div style={{
                        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                        color: Tokens.inkMuted, letterSpacing: 0.5,
                      }}>{new Date(n.createdAt).toLocaleString('fr-FR')}</div>
                      <div>
                        <strong>@{n.username}</strong> a ajouté {n.imagesUploaded} photo{n.imagesUploaded > 1 ? 's' : ''}
                        {' '}à <em>©{n.collectionTitle}</em>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {user && (
            <div style={{ position: 'relative' }}
              onMouseEnter={() => setUserHover(true)}
              onMouseLeave={() => setUserHover(false)}>
              <button onClick={() => navigate('/profil')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: isMobile ? 2 : '4px 4px 4px 12px',
                background: userHover ? Tokens.paperDark : 'transparent',
                border: `1px solid ${Tokens.inkMuted}`,
                borderRadius: 999, cursor: 'pointer',
                fontFamily: '"EB Garamond", serif', fontSize: 14,
                color: Tokens.ink,
              }} title={`@${user.username}`}>
                {!isMobile && <span>@{user.username}</span>}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: Tokens.ink, color: Tokens.paperLight,
                  fontSize: 11, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{user.username.slice(0, 2).toUpperCase()}</div>
              </button>
              {userHover && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0,
                  paddingTop: 6, zIndex: 50,
                }}>
                  <div style={{
                    width: 180, padding: 6,
                    background: Tokens.paperLight,
                    border: `1px solid ${Tokens.inkMuted}`,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                  }}>
                    <button onClick={() => logout().then(() => navigate('/login'))} style={{
                      width: '100%', textAlign: 'left',
                      padding: '8px 12px', cursor: 'pointer', fontSize: 14,
                      background: 'transparent', border: 'none',
                      fontFamily: 'inherit', color: Tokens.ink,
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = Tokens.paperDark)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {openHelp && <HelpDialog onClose={() => setOpenHelp(false)} />}
    </>
  );
}
