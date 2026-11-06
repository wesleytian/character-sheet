import { useEffect, useMemo, useRef, useState } from 'react';
import { geoNaturalEarth1, geoAlbersUsa, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { AtlasEntry } from './types';
import { upsertRows, deleteRow } from './db';
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

/**
 * The three atlases weigh about 2.5 MB together - most of them China's - so
 * they are fetched only when a map is actually drawn, not bundled into the
 * page everyone loads. Each import is cached by the browser after the first.
 */
const atlas: Record<string, Promise<any>> = {};
const load = (name: 'world' | 'us' | 'china') => {
  atlas[name] ??= name === 'world' ? import('world-atlas/countries-110m.json')
    : name === 'us' ? import('us-atlas/states-10m.json')
    : import('china-geojson');
  return atlas[name];
};

async function build(kind: MapKind, w: number, h: number) {
  let features: { properties: Record<string, unknown> }[];
  let projection;
  if (kind === 'country') {
    const topo = (await load('world')).default ?? (await load('world'));
    features = (feature(topo as any, (topo as any).objects.countries) as any).features;
    projection = geoNaturalEarth1().fitSize([w, h - 8], { type: 'Sphere' } as any);
  } else if (kind === 'state' || kind === 'park') {
    const topo = (await load('us')).default ?? (await load('us'));
    features = (feature(topo as any, (topo as any).objects.states) as any).features;
    projection = geoAlbersUsa().fitSize([w, h - 8], { type: 'FeatureCollection', features } as any);
  } else {
    const mod = await load('china');
    const cn = mod?.China ?? mod?.default?.China;
    features = (cn?.features ?? []).filter((f: any) => f.properties?.name !== '南海诸岛');
    projection = geoMercator().fitSize([w, h - 8], { type: 'FeatureCollection', features } as any);
  }
  return { features, path: geoPath(projection as any) };
}

export function RegionMap({
  kind, visited, userId, onChanged, onOptimistic, big = false, editable = false, onOpen,
}: {
  kind: MapKind; visited: AtlasEntry[]; userId: string;
  onChanged: () => void; onOptimistic?: (name: string, on: boolean) => void;
  big?: boolean; editable?: boolean;
  /** Read-only maps open the editor on click rather than toggling in place. */
  onOpen?: () => void;
}) {
  // Optimistic overlay: what the user has clicked but the server has not
  // confirmed yet. Without this every click waits on a full sheet reload.
  // 'visited' | 'planned' | absent. Optimistic so the fill flips instantly.
  const [pending, setPending] = useState<Record<string, string | null>>({});
  const [hover, setHover] = useState<string | null>(null);
  // Pan and zoom. Kept as a viewBox transform so the geometry never re-projects.
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const w = big ? 1100 : 760;
  const h = big ? (kind === 'country' ? 560 : kind === 'state' ? 640 : 760) : (kind === 'country' ? 380 : kind === 'state' ? 440 : 520);

  // Geometry depends only on which map and how big - never on what is ticked,
  // so toggling no longer re-projects every path.
  const [geom, setGeom] = useState<{
    shapes: { key: number; d: string; label: string; cx: number; cy: number; area: number }[];
    labels: Set<string>;
    parkPts: (typeof NATIONAL_PARKS[number] & { x: number; y: number })[];
  }>({ shapes: [], labels: new Set(), parkPts: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { features, path } = await build(kind, w, h);
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
      // Parks are points on the US base map rather than fillable regions.
      const proj = (path as any).projection?.() ?? null;
      const parkPts = kind !== 'park' ? [] : NATIONAL_PARKS.map((pk) => {
        const xy = proj ? proj([pk.lon, pk.lat]) : null;
        return xy ? { ...pk, x: xy[0], y: xy[1] } : null;
      }).filter(Boolean) as (typeof NATIONAL_PARKS[number] & { x: number; y: number })[];

      if (alive) setGeom({ shapes, labels: new Set(shapes.map((sh) => sh.label)), parkPts });
    })();
    return () => { alive = false; };
  }, [kind, w, h]);

  const parkPts = geom.parkPts;

  const rows = useMemo(() => new Map(visited.map((v) => [v.name, v])), [visited]);
  const stateOf = (label: string): string | null =>
    label in pending ? pending[label] : (rows.get(label)?.state ?? null);
  const isOn = (label: string) => stateOf(label) !== null;
  const missing = visited.filter((v) => !geom.labels.has(v.name)).map((v) => v.name);

  /**
   * One write at a time per label. `rows` only refreshes once onChanged() has
   * reloaded the whole sheet, so two clicks inside that window used to both see
   * no row and both insert - which is how a country ended up in the table
   * twice. Queueing keeps them in order, and the upsert below makes the second
   * one land on the first rather than beside it.
   */
  const writes = useRef<Record<string, Promise<unknown>>>({});

  /** Single click cycles visited/off; double click marks it planned. */
  const setState = (label: string, next: string | null) => {
    setPending((p) => ({ ...p, [label]: next }));
    onOptimistic?.(label, next !== null);
    const run = async () => {
      if (next === null) {
        const row = rows.get(label);
        if (row) await deleteRow('cs_atlas', row.id);
      } else {
        // Keyed on what the row means, not on an id we may not have yet.
        await upsertRows('cs_atlas', [{
          user_id: userId, kind, name: label, detail: '', state: next,
          happened_on: null, years: null, display_order: 0, is_public: true,
        }], 'user_id,kind,name');
      }
      onChanged();
    };
    const task = (writes.current[label] ?? Promise.resolve())
      // Settled either way: one failed write must not strand every later one.
      .then(run, run)
      .catch(() => {
        setPending((p) => { const n = { ...p }; delete n[label]; return n; });
      });
    writes.current[label] = task;
    return task;
  };

  /**
   * A double click fires click first, so marking an unticked region "planned"
   * used to write `visited` on the way through - two states, and before the
   * upsert above, two rows. Hold the single click long enough to find out
   * whether a second one is coming.
   */
  const clickTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toggle = (label: string) => {
    clearTimeout(clickTimer.current[label]);
    clickTimer.current[label] = setTimeout(() => {
      delete clickTimer.current[label];
      setState(label, stateOf(label) === 'visited' ? null : 'visited');
    }, 250);
  };
  const plan = (label: string) => {
    clearTimeout(clickTimer.current[label]);
    delete clickTimer.current[label];
    setState(label, stateOf(label) === 'planned' ? null : 'planned');
  };

  useEffect(() => () => {
    Object.values(clickTimer.current).forEach(clearTimeout);
  }, []);

  const clamp = (v: { k: number; x: number; y: number }) => {
    const k = Math.max(1, Math.min(8, v.k));
    const maxX = w * (k - 1) / k;
    const maxY = h * (k - 1) / k;
    return { k, x: Math.max(0, Math.min(maxX, v.x)), y: Math.max(0, Math.min(maxY, v.y)) };
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Zoom toward the pointer rather than the centre.
    const px = ((e.clientX - rect.left) / rect.width) * (w / view.k) + view.x;
    const py = ((e.clientY - rect.top) / rect.height) * (h / view.k) + view.y;
    const k = Math.max(1, Math.min(8, view.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    setView(clamp({ k, x: px - (px - view.x) * (view.k / k), y: py - (py - view.y) * (view.k / k) }));
  };

  // React attaches wheel at the root as a passive listener, so preventDefault
  // from an onWheel prop is ignored and the page scrolls underneath. Bind it
  // directly instead.
  const wheelRef = useRef(onWheel);
  wheelRef.current = onWheel;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (view.k === 1) return;
    pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p0 = pan.current;
    if (!p0) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - p0.x) / rect.width * (w / view.k);
    const dy = (e.clientY - p0.y) / rect.height * (h / view.k);
    if (Math.abs(e.clientX - p0.x) > 3 || Math.abs(e.clientY - p0.y) > 3) p0.moved = true;
    setView((v) => clamp({ ...v, x: p0.vx - dx, y: p0.vy - dy }));
  };
  const endPan = () => { pan.current = null; };
  const dragged = () => pan.current?.moved === true;

  // Labels only where they will actually fit.
  const minArea = kind === 'country' ? (big ? 900 : 2200) : big ? 300 : 700;

  return (
    <div className={`map-wrap ${!editable && onOpen ? 'openable' : ''}`}
         onClick={() => { if (!editable && onOpen && !dragged()) onOpen(); }}>
      <svg ref={svgRef}
           viewBox={`${view.x} ${view.y} ${w / view.k} ${h / view.k}`}
           className={`worldmap ${big ? 'big' : ''} ${editable ? 'editable' : 'readonly'} ${view.k > 1 ? 'zoomed' : ''}`}
           onPointerDown={onPointerDown}
           onPointerMove={onPointerMove}
           onPointerUp={endPan}
           onPointerCancel={endPan}
           role="img"
           aria-label={`${visited.length} marked; click to toggle, double-click to plan`}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)"
                   patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#2A2416" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#D9A03C" strokeWidth="2.4" />
          </pattern>
        </defs>
        {geom.shapes.map((p) => (
          <path key={p.key} d={p.d}
                className={`c ${kind === 'park' ? 'base' : ''} ${
                  kind !== 'park' && stateOf(p.label) ? stateOf(p.label) : ''}`}
                onClick={() => { if (editable && kind !== 'park' && !dragged()) toggle(p.label); }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  if (editable && kind !== 'park') plan(p.label);
                }}>
            <title>
              {p.label}
              {kind !== 'park' && stateOf(p.label) === 'visited' ? ' — visited' : ''}
              {kind !== 'park' && stateOf(p.label) === 'planned' ? ' — planning to go' : ''}
            </title>
          </path>
        ))}
        {kind === 'park' && parkPts.map((pk) => (
          <g key={pk.name}
             className={`park ${stateOf(pk.name) ?? ''} ${hover === pk.name ? 'hot' : ''}`}
             onClick={() => { if (editable && !dragged()) toggle(pk.name); }}
             onDoubleClick={(e) => { e.preventDefault(); if (editable) plan(pk.name); }}
             onMouseEnter={() => setHover(pk.name)}
             onMouseLeave={() => setHover((h) => (h === pk.name ? null : h))}>
            <circle cx={pk.x} cy={pk.y} r={(big ? 6 : 4.5) / Math.sqrt(view.k)} />
            <circle cx={pk.x} cy={pk.y} r={15 / view.k} fill="transparent" />
            <title>{pk.name}{isOn(pk.name) ? ' \u2014 visited' : ''}</title>
          </g>
        ))}
        {/* Every park is labelled, so you can read the map before clicking. */}
        {kind === 'park' && parkPts.map((pk) => (
          <text key={`pl${pk.name}`} x={pk.x} y={pk.y - (big ? 10 : 8)} textAnchor="middle"
                className={`ml park-label ${stateOf(pk.name) ?? ''} ${hover === pk.name ? 'hot' : ''}`}
                style={{ fontSize: (big ? 9.5 : 7.5) / view.k }}>
            {pk.name}
          </text>
        ))}
        {kind !== 'park' && geom.shapes.filter((p) => p.area > minArea && Number.isFinite(p.cx)).map((p) => (
          <text key={`t${p.key}`} x={p.cx} y={p.cy} textAnchor="middle"
                className={`ml ${stateOf(p.label) ?? ''}`}
                style={{ fontSize: (big ? 11 : 9) / view.k }}>
            {p.label}
          </text>
        ))}
      </svg>
      {!editable && onOpen && <span className="map-open-hint">click to edit · scroll to zoom</span>}
      {view.k > 1 && (
        <button className="map-reset"
                onClick={(e) => { e.stopPropagation(); setView({ k: 1, x: 0, y: 0 }); }}>
          reset zoom
        </button>
      )}
      {missing.length > 0 && (
        <p className="d map-note">Not on this map: {missing.join(', ')}</p>
      )}
    </div>
  );
}
