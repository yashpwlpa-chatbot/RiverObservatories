import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { FilterOptions, RiverDetail, TimeseriesResult } from '@/types';
import { api } from '@/lib/api';
import { OBSERVATORIES, RESEARCH_CATEGORIES, findObservatory } from '@/lib/observatories';
import { TimeseriesChart } from '@/components/charts/timeseries-chart';
import { RiverMap } from '@/components/map/river-map';

const categoryKeywords: Record<string, RegExp> = {
  hydrology: /hydrolog|flow|stage|discharge|water level/i,
  climate: /climate|rain|temperature|weather/i,
  gis: /gis|habitat|spatial|land use/i,
  wildlife: /wildlife|species|dolphin|turtle|gharial/i,
  fisheries: /fish|fisher/i,
  social: /social|livelihood|community|economic/i,
  conservation: /conservation|restoration|threat/i,
  policy: /policy|legal|governance/i,
};

export function RiverDetailClient({ riverId }: { riverId: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const observatory = findObservatory(riverId);
  const categoryKey = params.get('category') ?? 'hydrology';
  const active = RESEARCH_CATEGORIES.find((category) => category.key === categoryKey) ?? RESEARCH_CATEGORIES[0];
  const [river, setRiver] = useState<RiverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState('');
  const [series, setSeries] = useState<TimeseriesResult | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [parameterName, setParameterName] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setRiver(null);
    setSegment('');
    api.get<{ data: RiverDetail }>('/rivers/' + riverId)
      .then((result) => { if (alive) setRiver(result.data); })
      .catch(() => { if (alive) setRiver(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [riverId]);

  useEffect(() => {
    if (!river || active.key !== 'hydrology') { setSeries(null); return; }
    let alive = true;
    setChartLoading(true);
    api.get<{ data: FilterOptions }>('/hydrology/filters?riverId=' + encodeURIComponent(river.id))
      .then((options) => {
        const parameter = options.data.parameters[0];
        if (!parameter) return null;
        if (alive) setParameterName(parameter.name);
        const q = new URLSearchParams({ riverId: river.id, parameterId: parameter.id, granularity: 'month' });
        if (segment) q.set('riverStretchId', segment);
        return api.get<{ data: TimeseriesResult }>('/hydrology/timeseries?' + q.toString());
      })
      .then((result) => { if (alive) setSeries(result?.data ?? null); })
      .catch(() => { if (alive) setSeries(null); })
      .finally(() => { if (alive) setChartLoading(false); });
    return () => { alive = false; };
  }, [river, segment, active.key]);

  const matchingDatasets = useMemo(() => river?.datasets.filter((dataset) => categoryKeywords[active.key].test(dataset.name + ' ' + (dataset.description ?? '') + ' ' + (dataset.dataType ?? ''))) ?? [], [river, active.key]);
  const demoActive = river?.datasets.some((dataset) => dataset.slug.startsWith('demo-')) ?? false;
  const period = river?.stats.dateFrom && river.stats.dateTo ? new Date(river.stats.dateFrom).getFullYear() + '–' + new Date(river.stats.dateTo).getFullYear() : null;
  const chartAvailable = active.key === 'hydrology' && !!series?.points.length && !series.mixedUnits;

  if (!observatory) return <div className="mx-auto max-w-7xl px-6 py-20"><h1 className="font-serif text-3xl">Observatory not found</h1><Link to="/rivers" className="mt-4 inline-block text-[#14633d]">Browse observatories →</Link></div>;

  return <div className="bg-[#f8faf8]">
    <section className="border-b border-[#e0e8e1] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
        <div className="text-xs text-[#728078]"><Link to="/rivers" className="hover:text-[#14633d]">River Observatories</Link><span className="mx-2">/</span>{observatory.name}</div>
        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#1b6845]">River observatory</p>
            <h1 className="mt-2 font-serif text-4xl text-[#20342e] sm:text-5xl">{observatory.name}</h1>
            <p className="mt-3 text-[15px] leading-7 text-[#596a61]">{observatory.description}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-xs font-semibold text-[#50645a]">Select River
              <select value={riverId} onChange={(event) => navigate('/rivers/' + event.target.value)} className="mt-1 block h-10 min-w-44 border border-[#cad9cf] bg-white px-3 text-sm text-[#20342e]">
                {OBSERVATORIES.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}
              </select>
            </label>
            {!!river?.stretches.length && <label className="text-xs font-semibold text-[#50645a]">Segment
              <select value={segment} onChange={(event) => setSegment(event.target.value)} className="mt-1 block h-10 min-w-44 border border-[#cad9cf] bg-white px-3 text-sm text-[#20342e]">
                <option value="">All segments</option>
                {river.stretches.map((stretch) => <option value={stretch.id} key={stretch.id}>{stretch.name}</option>)}
              </select>
            </label>}
          </div>
        </div>
      </div>
    </section>
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-9 sm:px-10 lg:grid-cols-[235px_minmax(0,1fr)] lg:px-12">
      <aside className="min-w-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#708078]">Research categories</p>
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" aria-label="River research categories">
          {RESEARCH_CATEGORIES.map((category) => <button key={category.key} type="button" onClick={() => setParams({ category: category.key })} className={'shrink-0 border-l-2 px-3 py-2.5 text-left text-sm transition-colors lg:w-full ' + (active.key === category.key ? 'border-[#14633d] bg-[#eaf2ec] font-semibold text-[#145536]' : 'border-transparent text-[#4f6258] hover:bg-white hover:text-[#14633d]')}>{category.label}</button>)}
        </nav>
        <div className="mt-8 hidden border-t border-[#dce6df] pt-6 lg:block">
          <p className="text-sm font-semibold text-[#20342e]">Need detailed data?</p>
          <p className="mt-2 text-xs leading-5 text-[#66766d]">Research datasets are shared through a reviewed request process.</p>
          <Link to={'/contact?request=data&river=' + riverId} className="mt-3 inline-block text-xs font-semibold text-[#14633d] hover:underline">Request Data Access ↗</Link>
        </div>
      </aside>
      <main className="min-w-0">
        {demoActive && <div role="note" className="mb-6 border-l-4 border-[#9b682b] bg-[#fff7e9] px-5 py-4 text-sm leading-6 text-[#5d482c]"><strong>Demonstration data.</strong> Water-level charts and demo monitoring sites shown here are synthetic examples, not WCT field observations.</div>}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1b6845]">{observatory.name} / Research overview</p><h2 className="mt-2 font-serif text-3xl text-[#20342e]">{active.label}</h2><p className="mt-2 text-sm leading-6 text-[#65756b]">{active.description}</p></div>
          <Link to={'/data?river=' + riverId + '&tab=' + (active.key === 'gis' ? 'maps' : 'graphs')} className="inline-flex shrink-0 items-center gap-2 border border-[#14633d] px-4 py-2.5 text-sm font-semibold text-[#14633d] hover:bg-white">Explore visualizations ↗</Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {active.key === 'hydrology' && river && river.stations.length > 0 && <Metric label="Monitoring stations" value={String(river.stations.length)} />}
          {active.key === 'gis' && river && river.stations.length > 0 && <Metric label="Mapped locations" value={String(river.stations.filter((station) => station.latitude != null && station.longitude != null).length)} />}
          {matchingDatasets.length > 0 && <Metric label="Available studies" value={String(matchingDatasets.length)} />}
          {active.key === 'hydrology' && period && <Metric label="Observation period" value={period} />}
          {!loading && !river && <div className="col-span-full border border-[#e0e8e1] bg-white p-4 text-sm text-[#68786e]">Observatory data for this river are being prepared.</div>}
        </div>
        <section className="mt-6 border border-[#dfe8e1] bg-white">
          <div className="border-b border-[#e5ebe6] px-5 py-4">
            <h3 className="font-serif text-[22px] text-[#20342e]">{active.key === 'gis' ? 'River geography' : active.key === 'hydrology' ? 'River trends' : active.label + ' insights'}</h3>
            <p className="mt-1 text-xs text-[#718076]">{chartAvailable ? 'Monthly aggregated observations · ' + parameterName : active.key === 'gis' ? 'River network and monitoring locations' : 'Interpreted research outputs'}</p>
          </div>
          {chartAvailable ? <div className="p-4"><TimeseriesChart data={series} height={330} /></div>
            : active.key === 'gis' && river ? <RiverMap riverId={river.id} height={370} showLayerControl />
            : <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f1eb] text-xl text-[#14633d]" aria-hidden="true">≈</span><p className="font-semibold text-[#253b30]">{loading || chartLoading ? 'Loading research view…' : 'Research outputs are being prepared'}</p><p className="mt-2 max-w-md text-sm leading-6 text-[#718076]">Validated visualizations will appear here as category-specific observations become available.</p></div>}
        </section>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link to={'/data?river=' + riverId + '&tab=graphs'} className="group border border-[#dfe8e1] bg-white p-5"><span className="text-xs font-semibold uppercase tracking-wider text-[#1b6845]">01 / Trends</span><h3 className="mt-3 font-serif text-xl text-[#20342e]">Graphs &amp; analysis</h3><p className="mt-2 text-sm leading-6 text-[#68776d]">Explore temporal and seasonal patterns through aggregated visualizations.</p><span className="mt-4 inline-block text-sm font-semibold text-[#14633d]">Explore graphs ↗</span></Link>
          <Link to={'/data?river=' + riverId + '&tab=maps'} className="group border border-[#dfe8e1] bg-white p-5"><span className="text-xs font-semibold uppercase tracking-wider text-[#1b6845]">02 / Geography</span><h3 className="mt-3 font-serif text-xl text-[#20342e]">Maps &amp; spatial context</h3><p className="mt-2 text-sm leading-6 text-[#68776d]">View the river network, station locations and available GIS layers.</p><span className="mt-4 inline-block text-sm font-semibold text-[#14633d]">Explore maps ↗</span></Link>
        </div>
        <Link to={'/contact?request=data&river=' + riverId} className="mt-6 inline-flex text-sm font-semibold text-[#14633d] hover:underline lg:hidden">Request Data Access ↗</Link>
      </main>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border border-[#dfe8e1] bg-white p-4"><p className="text-xs text-[#708077]">{label}</p><p className="mt-2 font-serif text-2xl text-[#203c2e]">{value}</p></div>;
}
