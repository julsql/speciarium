import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { DoubleFrame, IconBtn, InkButton, Latin } from '../components/atoms';
import { PhotoThumb } from '../components/PhotoThumb';
import { ResponsiveSidebar } from '../components/ResponsiveSidebar';
import { Photos } from '../api/photos';
import { Species } from '../api/species';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { formatDate } from '../design/format';
import type { PhotoDto, SpeciesRowDto } from '../types/api';

const DEFAULT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '&copy; OpenStreetMap';
// Précision pour regrouper les photos prises au même endroit (~11 m à l'équateur)
const CLUSTER_PRECISION = 4;

interface Cluster {
  lat: number;
  lng: number;
  photos: PhotoDto[];
}

export function PageCarte() {
  const { user } = useAuth();
  const { dataVersion } = useBackgroundUpload();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [focusSpecies, setFocusSpecies] = useState<SpeciesRowDto | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [calloutIndex, setCalloutIndex] = useState(0);

  const speciesId = searchParams.get('species_id');

  // Init Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      worldCopyJump: true, preferCanvas: true,
    }).setView([20, 0], 2);
    L.tileLayer(user?.mapTilesServer || DEFAULT_TILES, {
      attribution: DEFAULT_ATTRIBUTION,
    }).addTo(map);
    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si focus sur une espèce, charger ses infos pour le panneau de droite
  useEffect(() => {
    if (!speciesId) { setFocusSpecies(null); return; }
    Species.get(parseInt(speciesId, 10)).then(setFocusSpecies).catch(() => setFocusSpecies(null));
  }, [speciesId, dataVersion]);

  const filterKey = JSON.stringify({
    species_id: speciesId,
    kingdom: searchParams.get('kingdom'),
    class: searchParams.get('class_field'),
    order: searchParams.get('order_field'),
    family: searchParams.get('family'),
    continent: searchParams.get('continent'),
    country: searchParams.get('country'),
    region: searchParams.get('region'),
    year: searchParams.get('year'),
    start_date: searchParams.get('start_date'),
    end_date: searchParams.get('end_date'),
  });

  useEffect(() => {
    const q = {
      species_id: speciesId ? parseInt(speciesId, 10) : undefined,
      kingdom: searchParams.get('kingdom') || undefined,
      class_field: searchParams.get('class_field') || undefined,
      order_field: searchParams.get('order_field') || undefined,
      family: searchParams.get('family') || undefined,
      continent: searchParams.get('continent') || undefined,
      country: searchParams.get('country') || undefined,
      region: searchParams.get('region') || undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined,
    };
    Photos.list({ per_page: 2000, ...q }).then((r) => {
      setPhotos(r.items.filter((p) => p.latitude != null && p.longitude != null));
    });
    setSelectedCluster(null);
  }, [filterKey, dataVersion]);

  // Cluster par coordonnées (arrondies à CLUSTER_PRECISION décimales)
  const clusters: Cluster[] = useMemo(() => {
    const map = new Map<string, Cluster>();
    photos.forEach((p) => {
      const key = `${p.latitude!.toFixed(CLUSTER_PRECISION)}_${p.longitude!.toFixed(CLUSTER_PRECISION)}`;
      let cl = map.get(key);
      if (!cl) {
        cl = { lat: p.latitude!, lng: p.longitude!, photos: [] };
        map.set(key, cl);
      }
      cl.photos.push(p);
    });
    return Array.from(map.values());
  }, [photos]);

  // Construire / mettre à jour les marqueurs
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    clusters.forEach((cl) => {
      const isSel = selectedCluster &&
        cl.lat === selectedCluster.lat && cl.lng === selectedCluster.lng;
      const radius = Math.min(20, 6 + Math.log2(cl.photos.length + 1) * 3);
      const m = L.circleMarker([cl.lat, cl.lng], {
        radius, color: '#2a1d10', weight: 1,
        fillColor: isSel ? '#8b1a1a' : '#7a604a',
        fillOpacity: 0.9,
      });
      if (cl.photos.length > 1) {
        m.bindTooltip(String(cl.photos.length), {
          permanent: true, direction: 'center', className: 'cluster-count',
        });
      }
      m.on('click', () => {
        setSelectedCluster(cl);
        setCalloutIndex(0);
      });
      markersLayerRef.current!.addLayer(m);
    });

    if (clusters.length > 0 && !selectedCluster) {
      const group = L.featureGroup(markersLayerRef.current.getLayers() as L.Layer[]);
      try { mapRef.current.fitBounds(group.getBounds().pad(0.1)); } catch {}
    }
  }, [clusters, selectedCluster?.lat, selectedCluster?.lng]);

  function clearSpeciesFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('species_id');
    setSearchParams(next, { replace: true });
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>
      <ResponsiveSidebar showGroupBy={false} />

      <main style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 500,
          padding: '8px 12px',
          background: `${Tokens.paperLight}EE`,
          border: `1px solid ${Tokens.inkMuted}`,
          fontFamily: '"Cormorant Garamond", serif',
          maxWidth: 'min(340px, calc(100vw - 24px))',
        }}>
          {focusSpecies ? (
            <>
              <div style={{
                fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                color: Tokens.inkMuted, marginBottom: 4,
              }}>Espèce</div>
              <Latin style={{ fontSize: 17 }}>{focusSpecies.latinName}</Latin>
              {focusSpecies.frenchName && (
                <div style={{ fontFamily: '"Italianno", cursive', fontSize: 22, lineHeight: 1 }}>
                  {focusSpecies.frenchName}
                </div>
              )}
              <div style={{
                fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic', marginTop: 4,
              }}>{photos.length} photographies sur {clusters.length} lieu{clusters.length > 1 ? 'x' : ''}</div>
              <button onClick={clearSpeciesFilter} style={{
                marginTop: 8,
                background: 'transparent', border: 'none', padding: 0,
                color: Tokens.inkMuted, fontSize: 12, fontStyle: 'italic',
                cursor: 'pointer', textDecoration: 'underline',
              }}>retirer le filtre espèce</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Atlas de la collection</div>
              <div style={{
                fontSize: 12, color: Tokens.inkMuted, fontStyle: 'italic',
              }}>{photos.length} photographies · {clusters.length} lieu{clusters.length > 1 ? 'x' : ''}</div>
            </>
          )}
        </div>

        {selectedCluster && (
          <ClusterCallout cluster={selectedCluster}
            index={calloutIndex} setIndex={setCalloutIndex}
            onClose={() => setSelectedCluster(null)}
            onSelectSpecies={(sid) => navigate(`/especes?species_id=${sid}`)} />
        )}
      </main>
    </div>
  );
}

function ClusterCallout({ cluster, index, setIndex, onClose, onSelectSpecies }: {
  cluster: Cluster;
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
  onSelectSpecies: (id: number) => void;
}) {
  const photo = cluster.photos[index] ?? cluster.photos[0];
  const total = cluster.photos.length;

  return (
    <div style={{
      position: 'absolute', top: 24, right: 24,
      width: 300, zIndex: 600,
    }}>
      <DoubleFrame padding={0} style={{ background: Tokens.paperLight }}>
        <div style={{ position: 'relative' }}>
          <PhotoThumb photo={photo} h={200} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 6, right: 6,
            width: 24, height: 24, borderRadius: '50%',
            background: 'rgba(28,18,8,0.6)', color: Tokens.paperLight,
            border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1,
          }}>×</button>
          {total > 1 && (
            <>
              <NavButton dir="left" onClick={() => setIndex((index - 1 + total) % total)} />
              <NavButton dir="right" onClick={() => setIndex((index + 1) % total)} />
              <div style={{
                position: 'absolute', bottom: 6, left: 6,
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(28,18,8,0.6)', color: Tokens.paperLight,
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: 1,
              }}>{index + 1} / {total}</div>
            </>
          )}
        </div>
        <div style={{ padding: '10px 14px 12px' }}>
          <button onClick={() => onSelectSpecies(photo.speciesId)} style={{
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            textAlign: 'left', width: '100%',
          }}>
            <Latin style={{ fontSize: 15 }}>{photo.latinName}</Latin>
            {photo.frenchName && <div style={{ fontSize: 13 }}>{photo.frenchName}</div>}
          </button>
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: `1px dotted ${Tokens.inkLight}`,
            fontSize: 11.5, color: Tokens.inkMuted,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{photo.country}{photo.region ? ', ' + photo.region : ''}</span>
            {photo.date && <span>{formatDate(photo.date)}</span>}
          </div>
          {photo.details && (
            <div style={{
              marginTop: 6, fontSize: 12,
              color: Tokens.inkSoft, fontStyle: 'italic',
            }}>« {photo.details} »</div>
          )}
        </div>
      </DoubleFrame>
    </div>
  );
}

function NavButton({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', top: '50%',
      [dir]: 6, transform: 'translateY(-50%)',
      width: 28, height: 28, borderRadius: '50%',
      background: 'rgba(28,18,8,0.6)', color: Tokens.paperLight,
      border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1,
    } as React.CSSProperties}>{dir === 'left' ? '‹' : '›'}</button>
  );
}
