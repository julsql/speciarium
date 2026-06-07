import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { Latin } from '../components/atoms';
import { PhotoThumb } from '../components/PhotoThumb';
import { Lightbox, LightboxData } from '../components/Lightbox';
import { ResponsiveSidebar } from '../components/ResponsiveSidebar';
import { Photos } from '../api/photos';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
import { formatDate } from '../design/format';
import type { PhotoDto } from '../types/api';

type Grouping = '' | 'year' | 'species' | 'place';
type Size = 'sm' | 'md' | 'lg';
const SIZES: Record<Size, number> = { sm: 80, md: 130, lg: 200 };

export function PagePhotos() {
  const [searchParams] = useSearchParams();
  const { dataVersion } = useBackgroundUpload();
  const { isMobile } = useViewport();
  const [items, setItems] = useState<PhotoDto[]>([]);
  const [size, setSize] = useState<Size>('md');
  const [grouping, setGrouping] = useState<Grouping>('year');
  const [lightbox, setLightbox] = useState<LightboxData | null>(null);

  // Read all filters from URL — same as Espèces
  const filterKey = JSON.stringify({
    kingdom: searchParams.get('kingdom'),
    class: searchParams.get('class_field'),
    order: searchParams.get('order_field'),
    continent: searchParams.get('continent'),
    country: searchParams.get('country'),
    region: searchParams.get('region'),
    year: searchParams.get('year'),
  });

  useEffect(() => {
    const q = {
      kingdom: searchParams.get('kingdom') || undefined,
      class: searchParams.get('class_field') || undefined,
      order: searchParams.get('order_field') || undefined,
      continent: searchParams.get('continent') || undefined,
      country: searchParams.get('country') || undefined,
      region: searchParams.get('region') || undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined,
    };
    Photos.list({ per_page: 2000, ...q }).then((r) => setItems(r.items));
  }, [filterKey, dataVersion]);

  const sections = useMemo(() => {
    const result: Record<string, PhotoDto[]> = {};
    items.forEach((p) => {
      let key: string;
      if (grouping === 'year') key = p.year ? String(p.year) : 'Année inconnue';
      else if (grouping === 'species') key = `${p.latinName}${p.frenchName ? ' · ' + p.frenchName : ''}`;
      else if (grouping === 'place') key = `${p.country}${p.region ? ' · ' + p.region : ''}`;
      else key = '';
      (result[key] ||= []).push(p);
    });
    return result;
  }, [items, grouping]);

  const speciesCount = useMemo(() => new Set(items.map((p) => p.speciesId)).size, [items]);

  function openPhoto(photo: PhotoDto, idxInSection: number, sectionPhotos: PhotoDto[]) {
    // Navigation entre photos de la section affichée actuellement.
    setLightbox({
      items: sectionPhotos.map((p) => ({
        photo: p,
        latin: p.latinName,
        vernacular: p.frenchName || undefined,
      })),
      index: idxInSection,
    });
  }

  const h = SIZES[size];

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>
      <ResponsiveSidebar />

      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
      }}>
        <div style={{
          padding: isMobile ? '14px 16px' : '18px 32px',
          borderBottom: `1px dotted ${Tokens.inkLight}`,
          background: 'rgba(0,0,0,0.015)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{
              margin: 0, fontFamily: '"Cormorant Garamond", serif',
              fontSize: 28, fontWeight: 600,
            }}>Photographies</h2>
            <div style={{
              color: Tokens.inkMuted, fontSize: 13, marginTop: 2, fontStyle: 'italic',
            }}>{items.length} photographies sur {speciesCount} espèces</div>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: Tokens.inkMuted, fontStyle: 'italic' }}>Grouper&nbsp;:</span>
          <div style={{ display: 'flex', border: `1px solid ${Tokens.inkMuted}` }}>
            {([['year', 'Année'], ['species', 'Espèce'], ['place', 'Lieu']] as [Grouping, string][])
              .map(([k, l], i, arr) => (
                <button key={k} onClick={() => setGrouping(k)} style={{
                  padding: '6px 14px',
                  background: grouping === k ? Tokens.ink : 'transparent',
                  color: grouping === k ? Tokens.paperLight : Tokens.ink,
                  border: 'none',
                  borderRight: i < arr.length - 1 ? `1px solid ${Tokens.inkMuted}` : 'none',
                  cursor: 'pointer',
                  fontFamily: '"EB Garamond", serif', fontSize: 13,
                }}>{l}</button>
              ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['sm', 'md', 'lg'] as Size[]).map((k) => (
              <button key={k} onClick={() => setSize(k)} style={{
                width: 32, height: 32,
                background: size === k ? Tokens.ink : 'transparent',
                color: size === k ? Tokens.paperLight : Tokens.ink,
                border: `1px solid ${Tokens.inkMuted}`,
                cursor: 'pointer', fontSize: 13,
              }}>{k === 'sm' ? '⊟' : k === 'md' ? '⊞' : '◰'}</button>
            ))}
          </div>
        </div>

        <div style={{
          flex: 1, overflow: 'auto',
          padding: isMobile ? '18px 14px 100px' : '24px 32px',
        }}>
          {Object.entries(sections).map(([title, photos]) => (
            <section key={title || '__flat'} style={{ marginBottom: 36 }}>
              {title && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                  <h3 style={{
                    margin: 0, fontFamily: '"Cormorant Garamond", serif',
                    fontSize: 22, fontWeight: 600,
                  }}>{title}</h3>
                  <div style={{ flex: 1, height: 1, background: Tokens.inkLight, opacity: 0.5 }} />
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                    color: Tokens.inkMuted, letterSpacing: 1,
                  }}>{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
                </div>
              )}
              <div style={{
                display: 'grid', gap: 10,
                gridTemplateColumns: `repeat(auto-fill, minmax(${h + 20}px, 1fr))`,
              }}>
                {photos.map((p, i) => (
                  <div key={p.id} onClick={() => openPhoto(p, i, photos)} style={{
                    background: Tokens.paperLight, padding: 4,
                    border: `1px solid ${Tokens.inkMuted}`, cursor: 'pointer',
                  }}>
                    <PhotoThumb photo={p} h={h} />
                    <div style={{ padding: '5px 4px 2px', fontSize: 11.5, lineHeight: 1.25 }}>
                      <Latin>{p.latinName}</Latin>
                      <div style={{ color: Tokens.inkMuted, fontSize: 11 }}>
                        {p.country}{p.date ? ' · ' + formatDate(p.date) : ''}
                      </div>
                      {p.details && (
                        <div style={{
                          color: Tokens.inkSoft, fontSize: 11, fontStyle: 'italic',
                          marginTop: 2,
                        }}>« {p.details} »</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {items.length === 0 && (
            <div style={{
              padding: 50, textAlign: 'center', fontStyle: 'italic', color: Tokens.inkMuted,
            }}>Aucune photo dans cette collection.</div>
          )}
        </div>
      </main>

      <Lightbox open={!!lightbox} data={lightbox}
        onClose={() => setLightbox(null)}
        onChange={(i) => setLightbox(lightbox ? { ...lightbox, index: i } : null)} />
    </div>
  );
}
