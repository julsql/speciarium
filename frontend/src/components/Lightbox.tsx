import { useEffect, useRef, useState } from 'react';
import { PAPER_BG_DEEP, Tokens } from '../design/tokens';
import { PhotoThumb } from './PhotoThumb';
import { MiniLocator } from './MiniLocator';
import { useViewport } from '../hooks/useViewport';
import { formatDate } from '../design/format';
import type { PhotoSummary } from '../types/api';

/** Une photo dans la lightbox, avec son contexte taxonomique. */
export interface LightboxItem {
  photo: PhotoSummary;
  latin: string;
  vernacular?: string;
}

export interface LightboxData {
  items: LightboxItem[];
  index: number;
}

// Couleurs spécifiques au cadre « planche de Buffon » (anciens tokens Django).
const BUFFON_MAT = '#dde5c0';   // vert pâle du tapis sous la photo
const BUFFON_BORDER = '#615447'; // brun foncé du double trait

export function Lightbox({ open, data, onClose, onChange }: {
  open: boolean;
  data: LightboxData | null;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const { isCompact, isMobile } = useViewport();
  useEffect(() => {
    if (!open || !data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onChange(Math.max(0, data.index - 1));
      if (e.key === 'ArrowRight') onChange(Math.min(data.items.length - 1, data.index + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, data, onChange, onClose]);

  if (!open || !data) return null;
  const { items, index } = data;
  const item = items[index];
  if (!item) return null;
  const photo = item.photo;
  const dateStr = formatDate(photo.date);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(28, 18, 8, 0.86)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? 12 : 40,
    }}>
      {/* Bandeau métadonnées en haut */}
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 20, left: 24, right: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: Tokens.paperLight, zIndex: 1,
      }}>
        <div>
          <div style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 20 }}>
            {item.latin}
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>
            {item.vernacular ? item.vernacular + ' · ' : ''}
            {photo.country}{photo.region ? `, ${photo.region}` : ''} · {dateStr}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            opacity: 0.7, letterSpacing: 1,
          }}>{index + 1} / {items.length}</span>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', color: Tokens.paperLight,
            border: `1px solid rgba(255,250,238,0.4)`, cursor: 'pointer', fontSize: 18,
          }}>×</button>
        </div>
      </div>

      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
          style={navBtnStyle('left')}>‹</button>
      )}

      {/* Layout : planche à gauche + MiniLocator à droite si GPS dispo */}
      <div onClick={(e) => e.stopPropagation()} style={{
        display: 'flex',
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'center' : 'flex-start',
        gap: isCompact ? 10 : 16,
        maxWidth: isCompact ? '100%' : '90vw',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        {/* ─── Planche de Buffon ─── */}
        <div style={{
          background: `${PAPER_BG_DEEP}, ${Tokens.paperDark}`,
          padding: isMobile ? 18 : 30,
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}>
          {/* Mat vert pâle, bordure brun foncé — contient UNIQUEMENT la photo */}
          <div style={{
            background: BUFFON_MAT,
            border: `1px solid ${BUFFON_BORDER}`,
            padding: 8,
          }}>
            {/* Double cadre brun (outline + offset) autour de la photo */}
            <div style={{
              margin: 10,
              outline: `2px solid ${BUFFON_BORDER}`,
              outlineOffset: 4,
              display: 'flex', flexDirection: 'column',
            }}>
              <ProgressiveImage
                thumbnail={photo.thumbnail}
                fullSrc={photo.photo || photo.thumbnail}
                alt={item.latin}
                maxWidth={isCompact ? '82vw' : '68vw'}
                maxHeight={isMobile ? '50vh' : '60vh'}
              />
            </div>
          </div>

          {/* Légende sous la planche, directement sur le papier crème */}
          <div style={{
            marginTop: 14, padding: '0 4px',
            textAlign: 'center',
            fontFamily: '"EB Garamond", serif',
            color: BUFFON_BORDER,
          }}>
            <div style={{ fontStyle: 'italic', fontSize: 20, marginBottom: 2 }}>
              {item.vernacular && (
                <span style={{ fontStyle: 'normal', marginRight: 8 }}>{item.vernacular} —</span>
              )}
              {item.latin}
            </div>
            {(photo.details || photo.country) && (
              <div style={{ fontSize: 14, opacity: 0.85 }}>
                Photo prise le {dateStr} en {photo.country}
                {photo.region ? ` (${photo.region})` : ''}
                {photo.details ? `. ${photo.details}` : '.'}
              </div>
            )}
            <div style={{
              marginTop: 6,
              display: 'flex', justifyContent: 'space-between',
              fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
              fontFamily: '"Cormorant Garamond", serif',
              color: BUFFON_BORDER, opacity: 0.7,
            }}>
              <span>{photo.numberPicture || `P-${photo.id}`}</span>
              <span>{dateStr}</span>
            </div>
          </div>
        </div>

        {photo.latitude != null && photo.longitude != null && (
          <div style={{ flexShrink: 0 }}>
            <MiniLocator country={photo.country} region={photo.region}
              lat={photo.latitude} lng={photo.longitude} />
          </div>
        )}
      </div>

      {index < items.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
          style={navBtnStyle('right')}>›</button>
      )}

      {/* Bande de vignettes en bas */}
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', bottom: 24, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 6, padding: 6,
        background: 'rgba(28,18,8,0.5)',
        border: `1px solid rgba(255,250,238,0.2)`,
        maxWidth: '90vw', overflowX: 'auto',
      }}>
        {items.map((it, i) => (
          <div key={`${it.photo.id}-${i}`} onClick={() => onChange(i)} style={{
            width: 52, height: 40,
            border: i === index ? `2px solid ${Tokens.paperLight}` : '2px solid transparent',
            cursor: 'pointer', overflow: 'hidden', opacity: i === index ? 1 : 0.6,
            flexShrink: 0,
          }}>
            <PhotoThumb photo={it.photo} w="100%" h="100%" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Affiche la grande image, en utilisant la miniature comme placeholder flou
 * pendant le téléchargement. Dès que la grande est chargée, elle se substitue.
 * Le `key` sur les <img> + le `cachedFullSrcs` garantissent qu'on ne ré-affiche
 * pas la mini si la grande est déjà en cache (cas du re-clic).
 */
const cachedFullSrcs = new Set<string>();

function ProgressiveImage({ thumbnail, fullSrc, alt, maxWidth, maxHeight }: {
  thumbnail: string;
  fullSrc: string;
  alt: string;
  maxWidth: number | string;
  maxHeight: number | string;
}) {
  const [fullLoaded, setFullLoaded] = useState(() => cachedFullSrcs.has(fullSrc));

  // Reset quand on change de photo
  useEffect(() => {
    if (cachedFullSrcs.has(fullSrc)) {
      setFullLoaded(true);
      return;
    }
    setFullLoaded(false);
    // Précharge en background : si l'image est déjà dans le cache HTTP
    // browser, onload se déclenche immédiatement.
    const img = new Image();
    img.onload = () => {
      cachedFullSrcs.add(fullSrc);
      setFullLoaded(true);
    };
    img.src = fullSrc;
    return () => {
      img.onload = null;
    };
  }, [fullSrc]);

  const baseStyle: React.CSSProperties = {
    maxWidth, maxHeight,
    objectFit: 'contain', display: 'block',
    border: `1px solid ${BUFFON_BORDER}`,
    background: '#000',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      {/* Miniature en placeholder (uniquement si pas encore loaded) */}
      {!fullLoaded && (
        <img
          src={thumbnail}
          alt={alt}
          style={{
            ...baseStyle,
            filter: 'blur(6px)',
            transform: 'scale(1.02)', // évite que le blur déborde du cadre
          }}
        />
      )}
      {/* Grande image : superposée tant que pas chargée, en place une fois chargée */}
      <img
        key={fullSrc}
        src={fullSrc}
        alt={alt}
        style={{
          ...baseStyle,
          position: fullLoaded ? 'static' : 'absolute',
          inset: fullLoaded ? undefined : 0,
          opacity: fullLoaded ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
        onLoad={() => {
          cachedFullSrcs.add(fullSrc);
          setFullLoaded(true);
        }}
      />
    </div>
  );
}

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', [side]: 24, top: '50%',
    transform: 'translateY(-50%)',
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(255,250,238,0.1)',
    color: Tokens.paperLight,
    border: `1px solid rgba(255,250,238,0.4)`,
    cursor: 'pointer', fontSize: 28, lineHeight: 1,
    fontFamily: '"EB Garamond", serif',
  } as React.CSSProperties;
}
