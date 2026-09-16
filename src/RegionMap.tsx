import { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoAlbersUsa, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldTopo from 'world-atlas/countries-110m.json';
import usTopo from 'us-atlas/states-10m.json';
import chinaGeo from 'china-geojson';
import { AtlasEntry } from './types';
import { insertRows, deleteRow } from './db';
import { useEscape } from './useEscape';
import { NATIONAL_PARKS } from './catalog';

/* eslint-disable @typescript-eslint/no-explicit-any */

const COUNTRY_ALIAS: Record<string, string> = {
  'United States': 'United States of America',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'North Macedonia': 'Macedonia',
  'Dominican Republic': 'Dominican Rep.',
  'Ivory Coast': "Côte d'Ivoire",
  'DR Congo': 'Dem. Rep. Congo',
  'Central African Republic': 'Central African Rep.',
  Eswatini: 'eSwatini',
  'Solomon Islands': 'Solomon Is.',
};

const PROVINCE_ZH: Record<string, string> = {
  Beijing: '北京', Shanghai: '上海', Tianjin: '天津', Chongqing: '重庆',
  Jiangsu: '江苏', Zhejiang: '浙江', Anhui: '安徽', Fujian: '福建',
  Jiangxi: '江西', Shandong: '山东', Hebei: '河北', Shanxi: '山西',
  'Inner Mongolia': '内蒙古', Liaoning: '辽宁', Jilin: '吉林', Heilongjiang: '黑龙江',
  Henan: '河南', Hubei: '湖北', Hunan: '湖南', Guangdong: '广东',
  Guangxi: '广西', Hainan: '海南', Sichuan: '四川', Guizhou: '贵州',
  Yunnan: '云南', Tibet: '西藏', Shaanxi: '陕西', Gansu: '甘肃',
  Qinghai: '青海', Ningxia: '宁夏', Xinjiang: '新疆',
  'Hong Kong': '香港', Macau: '澳门', Taiwan: '台湾',
};

export type MapKind = 'country' | 'state' | 'province' | 'park';

/** map-data name -> the spelling used in the catalog and the database */
function reverse(kind: MapKind): Record<string, string> {
  const src = kind === 'country' ? COUNTRY_ALIAS : kind === 'province' ? PROVINCE_ZH : {};
  const out: Record<string, string> = {};
  for (const [mine, theirs] of Object.entries(src)) out[theirs] = mine;
  return out;
}

function build(kind: MapKind, w: number, h: number) {
  let features: { properties: Record<string, unknown> }[];
  let projection;
  if (kind === 'country') {
    features = (feature(worldTopo as any, (worldTopo as any).objects.countries) as any).features;
    projection = geoNaturalEarth1().fitSize([w, h - 8], { type: 'Sphere' } as any);
  } else if (kind === 'state') {
    features = (feature(usTopo as any, (usTopo as any).objects.states) as any).features;
    projection = geoAlbersUsa().fitSize([w, h - 8], { type: 'FeatureCollection', features } as any);
  } else if (kind === 'park') {
    features = (feature(usTopo as any, (usTopo as any).objects.states) as any).features;
    projection = geoAlbersUsa().fitSize([w, h - 8], { type: 'FeatureCollection', features } as any);
  } else {
    const mod = chinaGeo as any;
    const cn = mod?.China ?? mod?.default?.China;
    features = (cn?.features ?? []).filter((f: any) => f.properties?.name !== '南海诸岛');
    projection = geoMercator().fitSize([w, h - 8], { type: 'FeatureCollection', features } as any);
  }
  return { features, path: geoPath(projection as any) };
}

export function RegionMap({
  kind, visited, userId, onChanged, onOptimistic, big = false,
}: {
  kind: MapKind; visited: AtlasEntry[]; userId: string;
  onChanged: () => void; onOptimistic?: (name: string, on: boolean) => void; big?: boolean;
}) {
  // Optimistic overlay: what the user has clicked but the server has not
  // confirmed yet. Without this every click waits on a full sheet reload.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<string | null>(null);
  const w = big ? 1100 : 760;
  const h = big ? (kind === 'country' ? 560 : kind === 'state' ? 640 : 760) : (kind === 'country' ? 380 : kind === 'state' ? 440 : 520);

  // Geometry depends only on which map and how big - never on what is ticked,
  // so toggling no longer re-projects every path.
  const geom = useMemo(() => {
    const { features, path } = build(kind, w, h);
    const rev = reverse(kind);
    const nameOf = (f: any) => String(f.properties.name ?? '');
    const shapes = features.map((f, i) => {
      const c = path.centroid(f as any);
      return {
        key: i,
        d: path(f as any) ?? '',
        label: rev[nameOf(f)] ?? nameOf(f),
        cx: c[0],
        cy: c[1],
        area: path.area(f as any),
      };
    });
    return { shapes, labels: new Set(shapes.map((sh) => sh.label)) };
  }, [kind, w, h]);

  // Parks are points on the US base map rather than fillable regions.
  const parkPts = useMemo(() => {
    if (kind !== 'park') return [];
    const { path } = build('park', w, h);
    const proj = (path as any).projection?.() ?? null;
    return NATIONAL_PARKS.map((pk) => {
      const xy = proj ? proj([pk.lon, pk.lat]) : null;
      return xy ? { ...pk, x: xy[0], y: xy[1] } : null;
    }).filter(Boolean) as (typeof NATIONAL_PARKS[number] & { x: number; y: number })[];
  }, [kind, w, h]);

  const rows = useMemo(() => new Map(visited.map((v) => [v.name, v])), [visited]);
  const isOn = (label: string) =>
    label in pending ? pending[label] : rows.has(label);
  const missing = visited.filter((v) => !geom.labels.has(v.name)).map((v) => v.name);

  const toggle = async (label: string) => {
    const row = rows.get(label);
    const next = !isOn(label);
    setPending((p) => ({ ...p, [label]: next }));   // paint immediately
    onOptimistic?.(label, next);                    // and everywhere else
    try {
      if (row && !next) await deleteRow('cs_atlas', row.id);
      else if (!row && next) {
        await insertRows('cs_atlas', [{
          user_id: userId, kind, name: label, detail: '',
          happened_on: null, years: null, display_order: 0, is_public: true,
        }]);
      }
      onChanged();
    } catch {
      setPending((p) => { const n = { ...p }; delete n[label]; return n; });
    }
  };

  // Labels only where they will actually fit.
  const minArea = kind === 'country' ? (big ? 900 : 2200) : big ? 300 : 700;

  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className={`worldmap ${big ? 'big' : ''}`} role="img"
           aria-label={`${visited.length} visited; click to toggle`}>
        {geom.shapes.map((p) => (
          <path key={p.key} d={p.d}
                className={`c ${kind === 'park' ? 'base' : ''} ${kind !== 'park' && isOn(p.label) ? 'on' : ''}`}
                onClick={() => kind !== 'park' && toggle(p.label)}>
            <title>{p.label}{kind !== 'park' && isOn(p.label) ? ' — visited' : ''}</title>
          </path>
        ))}
        {kind === 'park' && parkPts.map((pk) => (
          <g key={pk.name}
             className={`park ${isOn(pk.name) ? 'on' : ''} ${hover === pk.name ? 'hot' : ''}`}
             onClick={() => toggle(pk.name)}
             onMouseEnter={() => setHover(pk.name)}
             onMouseLeave={() => setHover((h) => (h === pk.name ? null : h))}>
            <circle cx={pk.x} cy={pk.y} r={big ? 6 : 4.5} />
            <circle cx={pk.x} cy={pk.y} r={15} fill="transparent" />
            <title>{pk.name}{isOn(pk.name) ? ' \u2014 visited' : ''}</title>
          </g>
        ))}
        {/* Every park is labelled, so you can read the map before clicking. */}
        {kind === 'park' && parkPts.map((pk) => (
          <text key={`pl${pk.name}`} x={pk.x} y={pk.y - (big ? 10 : 8)} textAnchor="middle"
                className={`ml park-label ${isOn(pk.name) ? 'on' : ''} ${hover === pk.name ? 'hot' : ''}`}
                style={{ fontSize: big ? 9.5 : 7.5 }}>
            {pk.name}
          </text>
        ))}
        {kind !== 'park' && geom.shapes.filter((p) => p.area > minArea && Number.isFinite(p.cx)).map((p) => (
          <text key={`t${p.key}`} x={p.cx} y={p.cy} textAnchor="middle"
                className={`ml ${isOn(p.label) ? 'on' : ''}`}
                style={{ fontSize: big ? 11 : 9 }}>
            {p.label}
          </text>
        ))}
      </svg>
      {missing.length > 0 && (
        <p className="d map-note">Not on this map: {missing.join(', ')}</p>
      )}
    </div>
  );
}

export function MapModal({
  kind, title, visited, userId, onChanged, onOptimistic, onClose,
}: {
  kind: MapKind; title: string; visited: AtlasEntry[]; userId: string;
  onChanged: () => void; onOptimistic?: (n: string, on: boolean) => void; onClose: () => void;
}) {
  useEscape(onClose);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal widest" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="hint">{visited.length} marked. Click anywhere on the map to add or remove.</p>
        <RegionMap kind={kind} visited={visited} userId={userId} onChanged={onChanged}
                   onOptimistic={onOptimistic} big />
        <div className="modal-actions"><button className="btn" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
