import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tokens } from '../design/tokens';
import { ChipBtn, Divider } from './atoms';
import { Filters } from '../api/filters';
import { Collections } from '../api/collections';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundUpload } from '../hooks/useBackgroundUpload';
import type { CollectionDto } from '../types/api';

const GROUP_OPTIONS = ['', 'Espèce', 'Pays', 'Continent', 'Région', 'Année', 'Règne', 'Classe', 'Ordre', 'Famille'];

export interface SidebarFiltersProps {
  showGroupBy?: boolean;
  /** En mode drawer, on déclenche onClose après chaque mise à jour. */
  asDrawer?: boolean;
  onClose?: () => void;
}

export function SidebarFilters({ showGroupBy = true, asDrawer = false, onClose }: SidebarFiltersProps) {
  const { user } = useAuth();
  const { dataVersion } = useBackgroundUpload();
  const [searchParams, setSearchParams] = useSearchParams();

  const [otherCollections, setOtherCollections] = useState<CollectionDto[]>([]);
  const [continentOpts, setContinentOpts] = useState<string[]>([]);
  const [countryOpts, setCountryOpts] = useState<string[]>([]);
  const [regionOpts, setRegionOpts] = useState<string[]>([]);
  const [yearOpts, setYearOpts] = useState<string[]>([]);
  const [kingdomOpts, setKingdomOpts] = useState<string[]>([]);
  const [classOpts, setClassOpts] = useState<string[]>([]);
  const [orderOpts, setOrderOpts] = useState<string[]>([]);
  const [familyOpts, setFamilyOpts] = useState<string[]>([]);

  const filterKey = JSON.stringify({
    continent: searchParams.get('continent') ?? '',
    country: searchParams.get('country') ?? '',
    region: searchParams.get('region') ?? '',
    year: searchParams.get('year') ?? '',
    kingdom: searchParams.get('kingdom') ?? '',
    class_field: searchParams.get('class_field') ?? '',
    order_field: searchParams.get('order_field') ?? '',
    family: searchParams.get('family') ?? '',
    collection: user?.currentCollectionId,
  });

  useEffect(() => {
    const ctx = {
      continent: searchParams.get('continent') || undefined,
      country: searchParams.get('country') || undefined,
      region: searchParams.get('region') || undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined,
      kingdom: searchParams.get('kingdom') || undefined,
      class: searchParams.get('class_field') || undefined,
      order: searchParams.get('order_field') || undefined,
    };
    Filters.options({ field: 'kingdom', ...ctx }).then((r) => setKingdomOpts(r.options));
    Filters.options({ field: 'class', ...ctx }).then((r) => setClassOpts(r.options));
    Filters.options({ field: 'order', ...ctx }).then((r) => setOrderOpts(r.options));
    Filters.options({ field: 'family', ...ctx }).then((r) => setFamilyOpts(r.options));
    Filters.options({ field: 'continent', ...ctx }).then((r) => setContinentOpts(r.options));
    Filters.options({ field: 'country', ...ctx }).then((r) => setCountryOpts(r.options));
    Filters.options({ field: 'region', ...ctx }).then((r) => setRegionOpts(r.options));
    Filters.options({ field: 'year', ...ctx }).then((r) => setYearOpts(r.options));
  }, [filterKey, dataVersion]);

  useEffect(() => {
    if (!user) return;
    Collections.list().then((all) => {
      setOtherCollections(all.filter((c) => c.id !== user.currentCollectionId));
    }).catch(() => {});
  }, [user?.currentCollectionId, dataVersion]);

  const v = {
    search: searchParams.get('search') ?? '',
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
  };
  const compareIds = v.compare_with
    ? v.compare_with.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
    : [];

  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, val] of Object.entries(patch)) {
      if (!val) next.delete(k); else next.set(k, val);
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function clearAll() { setSearchParams(new URLSearchParams(), { replace: true }); }

  // Règnes affichés : ceux réellement présents dans la collection (+ le règne
  // actif s'il n'apparaît plus dans les options à cause d'autres filtres).
  const kingdomChoices = Array.from(new Set([
    ...(v.kingdom ? [v.kingdom] : []),
    ...kingdomOpts,
  ]));

  const asideStyle: React.CSSProperties = asDrawer
    ? {
        width: 'min(320px, 90vw)', padding: '20px 22px',
        background: Tokens.paperLight,
        overflowY: 'auto', overflowX: 'hidden',
        height: '100%',
        boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
      }
    : {
        flex: '0 1 250px',
        minWidth: 210,
        maxWidth: 280,
        padding: '20px 22px',
        borderRight: `1px solid ${Tokens.inkLight}`,
        background: 'rgba(0,0,0,0.02)',
        overflowY: 'auto', overflowX: 'hidden',
        alignSelf: 'stretch',
        height: '100%', maxHeight: '100%',
      };

  return (
    <aside style={asideStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{
          margin: 0, fontFamily: '"Cormorant Garamond", serif',
          fontSize: 20, fontWeight: 600,
        }}>Filtres</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <span onClick={clearAll} style={{ fontSize: 12, color: Tokens.inkMuted, cursor: 'pointer' }}>
            tout vider
          </span>
          {asDrawer && (
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 20, color: Tokens.inkMuted, padding: 0, lineHeight: 1,
            }}>×</button>
          )}
        </div>
      </div>
      <Divider glyph="✦" style={{ margin: '12px 0 18px' }} />

      <FilterBlock label="Recherche">
        <SearchInput value={v.search}
          placeholder="papilio, mésange, France…"
          onChange={(val) => update({ search: val })} />
      </FilterBlock>

      {kingdomChoices.length > 0 && (
        <FilterBlock label="Règne">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {kingdomChoices.map((k) => (
              <ChipBtn key={k} active={v.kingdom === k}
                onClick={() => update({ kingdom: v.kingdom === k ? '' : k })}>
                {k}
              </ChipBtn>
            ))}
          </div>
        </FilterBlock>
      )}

      <FilterBlock label="Nom vernaculaire">
        <DatalistInput value={v.french_name}
          onChange={(val) => update({ french_name: val })} />
      </FilterBlock>

      <FilterBlock label="Classe">
        <DatalistInput value={v.class_field}
          options={classOpts}
          onChange={(val) => update({ class_field: val })} italic />
      </FilterBlock>

      <FilterBlock label="Ordre">
        <DatalistInput value={v.order_field}
          options={orderOpts}
          onChange={(val) => update({ order_field: val })} italic />
      </FilterBlock>

      <FilterBlock label="Famille">
        <DatalistInput value={v.family}
          options={familyOpts}
          onChange={(val) => update({ family: val })} italic />
      </FilterBlock>

      <FilterBlock label="Continent">
        <DatalistInput value={v.continent}
          options={continentOpts}
          onChange={(val) => update({ continent: val })} />
      </FilterBlock>

      <FilterBlock label="Pays">
        <DatalistInput value={v.country}
          options={countryOpts}
          onChange={(val) => update({ country: val })} />
      </FilterBlock>

      <FilterBlock label="Région">
        <DatalistInput value={v.region}
          options={regionOpts}
          onChange={(val) => update({ region: val })} />
      </FilterBlock>

      <FilterBlock label="Année">
        <DatalistInput value={v.year}
          options={yearOpts}
          type="number"
          onChange={(val) => update({ year: val })} />
      </FilterBlock>

      <FilterBlock label="Du">
        <input type="date" value={v.start_date}
          onChange={(e) => update({ start_date: e.target.value })}
          style={inputUnderline} />
      </FilterBlock>

      <FilterBlock label="Au">
        <input type="date" value={v.end_date}
          onChange={(e) => update({ end_date: e.target.value })}
          style={inputUnderline} />
      </FilterBlock>

      {showGroupBy && (
        <>
          <FilterBlock label="Grouper par">
            <select value={v.group_by}
              onChange={(e) => {
                const next = e.target.value;
                update({ group_by: next, compare_with: next ? v.compare_with : '' });
              }}
              style={inputUnderline}>
              {GROUP_OPTIONS.map((g) => <option key={g} value={g}>{g || '—'}</option>)}
            </select>
          </FilterBlock>

          {v.group_by && otherCollections.length > 0 && (
            <FilterBlock label="Comparer avec">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {otherCollections.map((c) => {
                  const checked = compareIds.includes(c.id);
                  const label = c.ownerId !== user?.id && c.ownerUsername
                    ? `${c.title} (@${c.ownerUsername})`
                    : c.title;
                  return (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, cursor: 'pointer',
                    }}>
                      <input type="checkbox" checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...compareIds, c.id]
                            : compareIds.filter((id) => id !== c.id);
                          update({ compare_with: next.length > 0 ? next.join(',') : '' });
                        }}
                        style={{ accentColor: Tokens.ink }} />
                      {label}
                    </label>
                  );
                })}
              </div>
            </FilterBlock>
          )}
        </>
      )}
    </aside>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', marginBottom: 6,
        fontFamily: '"Cormorant Garamond", serif', fontSize: 14,
        color: Tokens.inkSoft, fontWeight: 600,
      }}>{label}</label>
      {children}
    </div>
  );
}

function SearchInput({ value, placeholder, onChange }: {
  value: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      borderBottom: `1px solid ${Tokens.inkMuted}`, padding: '4px 0',
    }}>
      <span style={{ color: Tokens.inkMuted, fontSize: 14 }}>⌕</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{
        flex: 1, background: 'transparent', border: 'none', outline: 'none',
        fontFamily: '"EB Garamond", serif', fontSize: 14, color: Tokens.ink, minWidth: 0,
      }} />
      {value && (
        <span onClick={() => onChange('')} style={{
          cursor: 'pointer', color: Tokens.inkMuted, fontSize: 12,
        }}>×</span>
      )}
    </div>
  );
}

function DatalistInput({ value, options, onChange, italic, type }: {
  value: string;
  options?: string[];
  onChange: (v: string) => void;
  italic?: boolean;
  type?: string;
}) {
  const listId = options && options.length ? 'dl-' + Math.random().toString(36).slice(2, 8) : undefined;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      borderBottom: `1px solid ${Tokens.inkMuted}`, padding: '4px 0',
    }}>
      <input type={type || 'text'} value={value} list={listId}
        onChange={(e) => onChange(e.target.value)} style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          fontFamily: '"EB Garamond", serif', fontSize: 14, color: Tokens.ink, minWidth: 0,
          fontStyle: italic ? 'italic' : 'normal',
        }} />
      {value && (
        <span onClick={() => onChange('')} style={{
          cursor: 'pointer', color: Tokens.inkMuted, fontSize: 12,
        }}>×</span>
      )}
      {listId && (
        <datalist id={listId}>
          {options!.map((o) => <option key={o} value={o} />)}
        </datalist>
      )}
    </div>
  );
}

const inputUnderline: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: `1px solid ${Tokens.inkMuted}`,
  fontFamily: '"EB Garamond", serif', fontSize: 14,
  padding: '4px 0', color: Tokens.ink, outline: 'none',
};
