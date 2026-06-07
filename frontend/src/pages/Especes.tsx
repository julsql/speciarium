import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { Divider, IconBtn, InkButton, Latin } from '../components/atoms';
import { PhotoGrid, PhotoThumb } from '../components/PhotoThumb';
import { Lightbox, LightboxData } from '../components/Lightbox';
import { ResponsiveSidebar } from '../components/ResponsiveSidebar';
import { Species } from '../api/species';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import { useViewport } from '../hooks/useViewport';
import { formatDate } from '../design/format';
import type { ComparisonResult, SpeciesRowDto } from '../types/api';

const ALL_COLS: { key: string; label: string; sortKey?: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'latin', label: 'Nom latin', sortKey: 'latin_name' },
  { key: 'french', label: 'Nom vernaculaire', sortKey: 'french_name' },
  { key: 'kingdom', label: 'Règne', sortKey: 'kingdom' },
  { key: 'class', label: 'Classe', sortKey: 'class_field' },
  { key: 'order', label: 'Ordre', sortKey: 'order_field' },
  { key: 'family', label: 'Famille', sortKey: 'family' },
  { key: 'genus', label: 'Genre', sortKey: 'genus' },
  { key: 'continent', label: 'Continent' },
  { key: 'country', label: 'Pays' },
  { key: 'region', label: 'Région' },
  { key: 'year', label: 'Année', sortKey: 'min_year' },
  { key: 'date', label: 'Dates' },
  { key: 'n', label: 'Photos', sortKey: 'number_picture' },
];

const DEFAULT_COLS: Record<string, boolean> = {
  photo: true, latin: true, french: true, kingdom: false,
  class: true, order: true, family: true, genus: false,
  continent: true, country: true, region: false, year: true,
  date: true, n: true,
};

const COL_STORAGE_KEY = 'speciarium:visibleColumns:v4';

function loadCols(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COL_STORAGE_KEY);
    return raw ? { ...DEFAULT_COLS, ...JSON.parse(raw) } : DEFAULT_COLS;
  } catch { return DEFAULT_COLS; }
}

export function PageEspeces() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { dataVersion } = useBackgroundUpload();
  const { isCompact, isMobile } = useViewport();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [rows, setRows] = useState<SpeciesRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [grouped, setGrouped] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [extraSpecies, setExtraSpecies] = useState<SpeciesRowDto | null>(null);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  const requestedSpeciesId = searchParams.get('species_id');
  const requestedId = requestedSpeciesId ? parseInt(requestedSpeciesId, 10) : null;

  const filters = useMemo(() => ({
    search: searchParams.get('search') ?? '',
    latin_name: searchParams.get('latin_name') ?? '',
    french_name: searchParams.get('french_name') ?? '',
    kingdom: searchParams.get('kingdom') ?? '',
    class_field: searchParams.get('class_field') ?? '',
    order_field: searchParams.get('order_field') ?? '',
    family: searchParams.get('family') ?? '',
    continent: searchParams.get('continent') ?? '',
    country: searchParams.get('country') ?? '',
    region: searchParams.get('region') ?? '',
    year: searchParams.get('year') ?? '',
    start_date: searchParams.get('start_date') ?? '',
    end_date: searchParams.get('end_date') ?? '',
    group_by: searchParams.get('group_by') ?? '',
    compare_with: searchParams.get('compare_with') ?? '',
    per_page: parseInt(searchParams.get('per_page') ?? '25', 10),
    page: parseInt(searchParams.get('page') ?? '1', 10),
    sort: searchParams.get('sort') ?? 'latin_name',
    direction: (searchParams.get('direction') ?? 'asc') as 'asc' | 'desc',
  }), [searchParams]);

  const [colMenu, setColMenu] = useState(false);
  const [visible, setVisible] = useState(loadCols);
  const [lightbox, setLightbox] = useState<LightboxData | null>(null);

  useEffect(() => {
    localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(visible));
  }, [visible]);

  useEffect(() => {
    const q = stripEmpty({
      search: filters.search,
      latin_name: filters.latin_name,
      french_name: filters.french_name,
      kingdom: filters.kingdom,
      class_field: filters.class_field,
      order_field: filters.order_field,
      family: filters.family,
      continent: filters.continent,
      country: filters.country,
      region: filters.region,
      year: filters.year ? parseInt(filters.year, 10) : undefined,
      start_date: filters.start_date,
      end_date: filters.end_date,
    });
    setLoading(true);
    if (filters.group_by) {
      const compareIds = filters.compare_with
        ? filters.compare_with.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
        : [];
      Species.grouped(filters.group_by, compareIds, q).then((r) => {
        setGrouped(r); setRows([]); setTotal(0);
      }).finally(() => setLoading(false));
    } else {
      Species.list({
        ...q,
        sort: filters.sort, direction: filters.direction,
        page: filters.page, per_page: filters.per_page,
      }).then((r) => {
        setRows(r.items); setTotal(r.total); setGrouped(null);
        // Priorité au species_id de l'URL (venant ex. de la carte)
        if (requestedId != null && r.items.find((x) => x.specieId === requestedId)) {
          setSelectedId(requestedId);
        } else if (!r.items.find((x) => x.specieId === selectedId) && r.items.length > 0) {
          setSelectedId(r.items[0].specieId);
        }
      }).finally(() => setLoading(false));
    }
  }, [filters, dataVersion]);

  // Si l'espèce demandée n'est pas dans la page courante : fetch séparé pour
  // alimenter quand même le panneau droit.
  useEffect(() => {
    if (requestedId == null) { setExtraSpecies(null); return; }
    if (rows.find((r) => r.specieId === requestedId)) { setExtraSpecies(null); return; }
    Species.get(requestedId).then(setExtraSpecies).catch(() => setExtraSpecies(null));
  }, [requestedId, rows]);

  // Scroll vers la ligne demandée dès qu'elle apparaît dans le tableau.
  useEffect(() => {
    if (requestedId == null) return;
    const el = rowRefs.current[requestedId];
    if (el) {
      setSelectedId(requestedId);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Petit flash pour matérialiser la sélection
      el.animate(
        [{ background: '#f9f0d6' }, { background: '#fae0a8' }, { background: '#f9f0d6' }],
        { duration: 1200, iterations: 1 }
      );
    }
  }, [requestedId, rows]);

  function update(patch: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function toggleSort(sortKey: string) {
    if (filters.sort === sortKey) update({ direction: filters.direction === 'asc' ? 'desc' : 'asc' });
    else update({ sort: sortKey, direction: 'asc' });
  }

  const selected = rows.find((r) => r.specieId === selectedId)
    ?? (extraSpecies && extraSpecies.specieId === selectedId ? extraSpecies : undefined)
    ?? rows[0];
  const totalPages = Math.max(1, Math.ceil(total / filters.per_page));

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>

      <ResponsiveSidebar />

      <main style={{
        flex: 1,
        padding: isMobile ? '14px 14px' : '20px 26px',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h2 style={{
              margin: 0, fontFamily: '"Cormorant Garamond", serif',
              fontSize: isMobile ? 22 : 30, fontWeight: 600,
            }}>{filters.group_by ? `Groupé par ${filters.group_by.toLowerCase()}` : 'Mes espèces'}</h2>
            <div style={{ color: Tokens.inkMuted, fontSize: 13, marginTop: 2, fontStyle: 'italic' }}>
              {grouped
                ? `${grouped.rows.filter((r) => !r.isTotal).length} valeurs`
                : `${total} espèce${total > 1 ? 's' : ''}`}
              {loading && ' · chargement…'}
            </div>
          </div>
          {!grouped && (
            <div style={{ position: 'relative' }}>
              <IconBtn title="colonnes" active={colMenu} onClick={() => setColMenu(!colMenu)}>⊞</IconBtn>
              {colMenu && <ColumnsMenu visible={visible} setVisible={setVisible} onClose={() => setColMenu(false)} />}
            </div>
          )}
        </div>

        {grouped ? (
          <GroupedTable data={grouped} groupBy={filters.group_by} />
        ) : (
          <>
            <div style={{
              flex: 1, overflowX: 'auto', overflowY: 'auto',
              minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%',
              border: `1px solid ${Tokens.inkMuted}`,
              background: Tokens.paperLight,
            }}>
              <table style={{
                minWidth: 'max-content',
                borderCollapse: 'collapse', fontFamily: '"EB Garamond", serif',
              }}>
                <thead>
                  <tr style={{
                    background: Tokens.paperDark,
                    borderBottom: `1.5px solid ${Tokens.inkSoft}`,
                    position: 'sticky', top: 0, zIndex: 1,
                  }}>
                    {ALL_COLS.filter((c) => visible[c.key]).map((c) => (
                      <th key={c.key}
                        onClick={() => c.sortKey && toggleSort(c.sortKey)}
                        style={{
                          padding: '10px 12px', textAlign: 'left',
                          fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
                          textTransform: 'uppercase', color: Tokens.inkSoft,
                          fontFamily: '"Cormorant Garamond", serif',
                          whiteSpace: 'nowrap', background: Tokens.paperDark,
                          cursor: c.sortKey ? 'pointer' : 'default',
                        }}>
                        {c.label}
                        {c.sortKey && filters.sort === c.sortKey && (
                          <span style={{ opacity: 0.5, marginLeft: 4 }}>
                            {filters.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.specieId}
                      ref={(el) => { rowRefs.current[row.specieId] = el; }}
                      onClick={() => {
                        setSelectedId(row.specieId);
                        if (isMobile) setDetailsOpen(true);
                      }}
                      style={{
                        borderBottom: `1px dotted ${Tokens.inkLight}`,
                        background: row.specieId === (selected?.specieId ?? -1) ? '#f9f0d6' : 'transparent',
                        cursor: 'pointer',
                      }}>
                      {visible.photo && <td style={tdStyle}>
                        {row.allPhotos[0] ? (
                          <div style={{ width: 36, height: 36 }}>
                            <PhotoThumb photo={row.allPhotos[0]} w={36} h={36} alt={row.latinName} />
                          </div>
                        ) : (
                          <div style={{ width: 36, height: 36, background: Tokens.paperDark,
                            border: `1px solid ${Tokens.inkLight}` }} />
                        )}
                      </td>}
                      {visible.latin && <td style={tdStyle}><Latin style={{ fontSize: 15 }}>{row.latinName}</Latin></td>}
                      {visible.french && <td style={tdStyle}>{row.frenchName || '—'}</td>}
                      {visible.kingdom && <td style={tdStyle}>{row.kingdom || '—'}</td>}
                      {visible.class && <td style={tdStyle}>{row.classField || '—'}</td>}
                      {visible.order && <td style={tdStyle}>{row.orderField || '—'}</td>}
                      {visible.family && <td style={tdStyle}>{row.family || '—'}</td>}
                      {visible.genus && <td style={tdStyle}>{row.genus || '—'}</td>}
                      {visible.continent && <td style={tdStyle}><MultiLine values={row.continents} /></td>}
                      {visible.country && <td style={tdStyle}><MultiLine values={row.countries} /></td>}
                      {visible.region && <td style={tdStyle}><MultiLine values={row.regions} /></td>}
                      {visible.year && <td style={tdStyle}>
                        <MultiLine values={uniqueYears(row.allPhotos.map((p) => p.year))} />
                      </td>}
                      {visible.date && <td style={tdStyle}>
                        <MultiLine values={row.allPhotos.map((p) => formatDate(p.date)).filter((d) => d !== '—')} />
                      </td>}
                      {visible.n && <td style={{
                        ...tdStyle, textAlign: 'right',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>{row.numberPicture}</td>}
                    </tr>
                  ))}
                  {rows.length === 0 && !loading && (
                    <tr><td colSpan={Object.values(visible).filter(Boolean).length} style={{
                      padding: 30, textAlign: 'center', fontStyle: 'italic', color: Tokens.inkMuted,
                    }}>Aucune espèce trouvée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 10, color: Tokens.inkMuted, fontSize: 13,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={filters.per_page}
                  onChange={(e) => update({ per_page: parseInt(e.target.value, 10), page: 1 })}
                  style={{
                    padding: '4px 8px', border: `1px solid ${Tokens.inkLight}`,
                    background: 'transparent', fontFamily: 'inherit', fontSize: 13,
                  }}>
                  {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>par page</span>
              </div>
              <span>Page {filters.page} / {totalPages}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <PageBtn label="‹" disabled={filters.page <= 1}
                  onClick={() => update({ page: filters.page - 1 })} />
                <PageBtn label="›" disabled={filters.page >= totalPages}
                  onClick={() => update({ page: filters.page + 1 })} />
              </div>
            </div>
          </>
        )}
      </main>

      {!grouped && (!isMobile || detailsOpen) && (
        <SpeciesDetailsPanel
          selected={selected}
          isCompact={isCompact}
          isMobile={isMobile}
          onClose={() => setDetailsOpen(false)}
          onOpenLightbox={(i) => selected && setLightbox({
            items: selected.allPhotos.map((p) => ({
              photo: p, latin: selected.latinName, vernacular: selected.frenchName,
            })),
            index: i,
          })}
          onViewMap={() => selected && navigate(`/carte?species_id=${selected.specieId}`)}
        />
      )}

      <Lightbox open={!!lightbox} data={lightbox}
        onClose={() => setLightbox(null)}
        onChange={(i) => setLightbox(lightbox ? { ...lightbox, index: i } : null)} />
    </div>
  );
}

function SpeciesDetailsPanel({ selected, isCompact, isMobile, onClose, onOpenLightbox, onViewMap }: {
  selected: SpeciesRowDto | undefined;
  isCompact: boolean;
  isMobile: boolean;
  onClose: () => void;
  onOpenLightbox: (index: number) => void;
  onViewMap: () => void;
}) {
  const content = selected ? (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          color: Tokens.inkMuted,
          fontFamily: '"Cormorant Garamond", serif',
        }}>Espèce sélectionnée</div>
        {isMobile && (
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 20, color: Tokens.inkMuted, padding: 0, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <Latin style={{ fontSize: 22, lineHeight: 1.1 }}>{selected.latinName}</Latin>
        {selected.frenchName && (
          <div style={{
            fontFamily: '"Italianno", cursive', fontSize: 30,
            color: Tokens.ink, lineHeight: 1, marginTop: 2,
          }}>{selected.frenchName}</div>
        )}
      </div>

      <PhotoGrid photos={selected.allPhotos} onOpen={onOpenLightbox} />

      <Divider glyph="❀" style={{ margin: '16px 0 14px' }} />

      <SpeciesMetadata photos={selected.allPhotos} />

      <SpeciesComments photos={selected.allPhotos} />

      {selected.allPhotos.some((p) => p.latitude != null && p.longitude != null) && (
        <InkButton icon="✦" onClick={onViewMap}
          style={{ width: '100%', justifyContent: 'center' }}>
          Voir sur la carte
        </InkButton>
      )}
    </>
  ) : (
    <div style={{ color: Tokens.inkMuted, fontStyle: 'italic', fontSize: 13 }}>
      Cliquez sur une espèce pour la voir.
    </div>
  );

  // Tant qu'on n'est pas en téléphone, on garde le panneau en colonne inline
  // (la sidebar gauche, elle, passe en drawer dès isCompact, ce qui libère
  // de la place pour conserver le panneau droit visible même quand le user
  // zoome dans le navigateur).
  if (!isMobile) {
    return (
      <aside style={{
        // Flex shrinkable : essaie 320px, peut descendre à 220 si le viewport
        // est étroit, jamais plus large que 320. Plus de crop sur les zooms
        // intermédiaires.
        flex: '0 1 320px',
        minWidth: 220,
        maxWidth: 320,
        padding: '16px 14px',
        borderLeft: `1px solid ${Tokens.inkLight}`,
        background: 'rgba(0,0,0,0.015)',
        overflowY: 'auto', overflowX: 'hidden',
        alignSelf: 'stretch',
        height: '100%', maxHeight: '100%',
      }}>{content}</aside>
    );
  }

  // Mobile : bottom sheet
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(28,18,8,0.55)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'stretch',
      justifyContent: isMobile ? 'stretch' : 'flex-end',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: Tokens.paperLight,
        width: isMobile ? '100%' : 'min(360px, 90vw)',
        height: isMobile ? 'min(80vh, 600px)' : '100%',
        padding: '20px 20px',
        overflowY: 'auto',
        boxShadow: isMobile ? '0 -4px 24px rgba(0,0,0,0.25)' : '-4px 0 24px rgba(0,0,0,0.25)',
      }}>{content}</div>
    </div>
  );
}

function SpeciesMetadata({ photos }: {
  photos: { date: string | null; country: string; region: string }[];
}) {
  // Combinaisons distinctes pays + région, ordre d'apparition conservé.
  const places: { country: string; region: string }[] = [];
  const seenPlace = new Set<string>();
  for (const p of photos) {
    if (!p.country) continue;
    const key = `${p.country}|${p.region ?? ''}`;
    if (seenPlace.has(key)) continue;
    seenPlace.add(key);
    places.push({ country: p.country, region: p.region });
  }

  // Dates distinctes formatées, triées par récence.
  const datesFmt = Array.from(
    new Set(photos.map((p) => p.date).filter((d): d is string => !!d))
  )
    .sort((a, b) => (a < b ? 1 : -1))
    .map(formatDate);

  if (places.length === 0 && datesFmt.length === 0) return null;

  return (
    <div style={{
      marginBottom: 14,
      fontSize: 13, color: Tokens.inkMuted, fontStyle: 'italic',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {places.map((p, i) => (
        <div key={i}>
          {p.country}{p.region ? `, ${p.region}` : ''}
        </div>
      ))}
      {datesFmt.length > 0 && places.length > 0 && (
        <div style={{ height: 4 }} />
      )}
      {datesFmt.map((d) => <div key={d}>{d}</div>)}
    </div>
  );
}

function SpeciesComments({ photos }: { photos: { date: string | null; details: string }[] }) {
  // Liste les commentaires non vides, déduplique en gardant l'ordre.
  const entries = photos
    .filter((p) => p.details && p.details.trim())
    .map((p) => ({ date: p.date, text: p.details.trim() }));
  if (entries.length === 0) return null;

  // Déduplique sur le texte (les mêmes notes peuvent revenir sur plusieurs photos).
  const seen = new Set<string>();
  const unique = entries.filter((e) => {
    if (seen.has(e.text)) return false;
    seen.add(e.text); return true;
  });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
        color: Tokens.inkMuted, marginBottom: 6,
        fontFamily: '"Cormorant Garamond", serif',
      }}>Commentaires</div>
      <div style={{
        background: Tokens.paperLight,
        border: `1px solid ${Tokens.inkLight}`,
        padding: '8px 10px',
        fontSize: 13, color: Tokens.inkSoft,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {unique.map((e, i) => (
          <div key={i}>
            <span style={{ fontStyle: 'italic' }}>« {e.text} »</span>
            {e.date && (
              <span style={{
                marginLeft: 8, color: Tokens.inkMuted, fontSize: 11,
              }}>{formatDate(e.date)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLine({ values }: { values: (string | number)[] }) {
  if (values.length === 0) return <span>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {values.map((v, i) => <span key={i}>{v}</span>)}
    </div>
  );
}

function uniqueYears(years: (number | null | undefined)[]): string[] {
  const set = new Set<number>();
  for (const y of years) if (y != null) set.add(y);
  return Array.from(set).sort((a, b) => b - a).map(String);
}

const tdStyle: React.CSSProperties = {
  padding: '8px 12px', fontSize: 14, color: Tokens.ink, verticalAlign: 'middle',
};

function PageBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '4px 10px',
      border: `1px solid ${Tokens.inkLight}`,
      background: 'transparent', color: Tokens.ink,
      opacity: disabled ? 0.3 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>{label}</button>
  );
}

function ColumnsMenu({ visible, setVisible, onClose }: {
  visible: Record<string, boolean>;
  setVisible: (v: Record<string, boolean>) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 240, padding: 14,
      background: Tokens.paperLight,
      border: `1px solid ${Tokens.inkMuted}`,
      boxShadow: `4px 4px 0 ${Tokens.inkLight}33`, zIndex: 5,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: Tokens.inkSoft }}>
        Colonnes visibles
      </div>
      {ALL_COLS.map(({ key, label }) => (
        <label key={key} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 0', fontSize: 14, cursor: 'pointer',
          color: visible[key] ? Tokens.ink : Tokens.inkMuted,
        }}>
          <input type="checkbox" checked={!!visible[key]}
            onChange={(e) => setVisible({ ...visible, [key]: e.target.checked })}
            style={{ accentColor: Tokens.ink }} />
          {label}
        </label>
      ))}
      <div style={{
        borderTop: `1px dotted ${Tokens.inkMuted}`,
        marginTop: 10, paddingTop: 8, display: 'flex',
      }}>
        <span style={{ fontSize: 12, color: Tokens.inkMuted, cursor: 'pointer', marginLeft: 'auto' }}
          onClick={onClose}>Fermer</span>
      </div>
    </div>
  );
}

function GroupedTable({ data, groupBy }: { data: ComparisonResult | null; groupBy: string }) {
  if (!data || data.columns.length === 0) {
    return (
      <div style={{ flex: 1, padding: 30, textAlign: 'center', fontStyle: 'italic', color: Tokens.inkMuted }}>
        Aucun résultat.
      </div>
    );
  }
  const { columns, rows } = data;
  // Total par colonne (somme des counts, hors ligne "Total en commun")
  const totals = columns.map((c) =>
    rows.filter((r) => !r.isTotal)
      .reduce((acc, r) => acc + (Number((r as any)[`collection_${c.id}`]) || 0), 0)
  );

  return (
    <div style={{
      flex: 1, overflowX: 'auto', overflowY: 'auto',
      minHeight: 0, minWidth: 0, width: '100%', maxWidth: '100%',
      border: `1px solid ${Tokens.inkMuted}`,
      background: Tokens.paperLight,
    }}>
      <table style={{
        minWidth: 'max-content',
        borderCollapse: 'collapse', fontFamily: '"EB Garamond", serif',
      }}>
        <thead>
          <tr style={{
            background: Tokens.paperDark, borderBottom: `1.5px solid ${Tokens.inkSoft}`,
            position: 'sticky', top: 0,
          }}>
            <th style={thStyle}>{groupBy}</th>
            {columns.map((c, i) => (
              <th key={c.id} style={{
                ...thStyle, textAlign: 'right',
                fontStyle: i > 0 ? 'italic' : 'normal',
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} style={{
              borderBottom: `1px dotted ${Tokens.inkLight}`,
              background: r.isTotal ? Tokens.paperDark : 'transparent',
              fontWeight: r.isTotal ? 600 : 400,
            }}>
              <td style={{ ...tdStyle, fontStyle: r.isTotal ? 'italic' : 'normal' }}>{r.name}</td>
              {columns.map((c) => (
                <td key={c.id} style={{
                  ...tdStyle, textAlign: 'right',
                  fontFamily: '"JetBrains Mono", monospace',
                }}>{(r as any)[`collection_${c.id}`] ?? 0}</td>
              ))}
            </tr>
          ))}
          <tr style={{ borderTop: `1.5px solid ${Tokens.inkSoft}`, background: Tokens.paperDark }}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>Total</td>
            {totals.map((t, i) => (
              <td key={i} style={{
                ...tdStyle, textAlign: 'right',
                fontFamily: '"JetBrains Mono", monospace', fontWeight: 600,
              }}>{t}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
  textTransform: 'uppercase', color: Tokens.inkSoft,
  fontFamily: '"Cormorant Garamond", serif',
};

function stripEmpty<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: any = {};
  for (const [k, v] of Object.entries(o)) {
    if (v != null && v !== '') out[k] = v;
  }
  return out;
}
