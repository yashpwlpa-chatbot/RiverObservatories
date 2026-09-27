import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AnnualResult, DistributionResult, FilterOptions, HeatmapResult, MonthlyResult, RiverSummary, SeasonalResult, SummaryStats, TimeseriesResult } from '@/types';
import { api } from '@/lib/api';
import { OBSERVATORIES } from '@/lib/observatories';
import { TimeseriesChart } from '@/components/charts/timeseries-chart';
import { EChart } from '@/components/charts/echart';
import { AnnualTrendChart, DistributionChart, HeatmapChart, MonthlyTrendChart } from '@/components/charts/analysis-charts';
import { RiverMap } from '@/components/map/river-map';
import type { ReactNode } from 'react';

type Tab = 'graphs' | 'maps' | 'interactive';
type FilterKey = 'stateId' | 'districtId' | 'stationId' | 'parameterId' | 'season' | 'year' | 'dateFrom' | 'dateTo';
type Filters = Partial<Record<FilterKey, string>>;
const EMPTY_OPTIONS: FilterOptions = { states: [], districts: [], stretches: [], stations: [], dataTypes: [], dataSubTypes: [], seasons: [], parameters: [], years: [], months: [], dateBounds: { from: null, to: null } };

export function DataExplorer({ initialTab = 'graphs' }: { initialTab?: Tab }) {
  const [params, setParams] = useSearchParams();
  const riverSlug = params.get('river') ?? '';
  const tabValue = params.get('tab') ?? initialTab;
  const tab: Tab = tabValue === 'maps' || tabValue === 'interactive' ? tabValue : 'graphs';
  const [rivers, setRivers] = useState<RiverSummary[]>([]);
  const [demoRiverIds, setDemoRiverIds] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [filters, setFilters] = useState<Filters>({});
  const [series, setSeries] = useState<TimeseriesResult | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [seasonal, setSeasonal] = useState<SeasonalResult | null>(null);
  const [annual, setAnnual] = useState<AnnualResult | null>(null);
  const [monthly, setMonthly] = useState<MonthlyResult | null>(null);
  const [distribution, setDistribution] = useState<DistributionResult | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState('');
  const [granularity, setGranularity] = useState<'month' | 'year'>('month');
  const river = rivers.find((item) => item.slug === riverSlug);
  const demoActive = !!river && demoRiverIds.has(river.id);

  useEffect(() => {
    api.get<{ data: RiverSummary[] }>('/rivers').then((result) => setRivers(result.data)).catch(() => setRivers([]));
    api.get<{ data: { riverId: string | null; slug: string }[] }>('/datasets')
      .then((result) => setDemoRiverIds(new Set(result.data.filter((item) => item.slug.startsWith('demo-') && item.riverId).map((item) => item.riverId!))))
      .catch(() => setDemoRiverIds(new Set()));
  }, []);

  useEffect(() => {
    let alive = true;
    setOptions(EMPTY_OPTIONS);
    setFilters({});
    setGenerated(false);
    setSeries(null);
    if (!river) return;
    api.get<{ data: FilterOptions }>('/hydrology/filters?riverId=' + encodeURIComponent(river.id))
      .then((result) => {
        if (!alive) return;
        setOptions(result.data);
        const first = result.data.parameters[0];
        if (first) setFilters({ parameterId: first.id });
      })
      .catch(() => { if (alive) setOptions(EMPTY_OPTIONS); });
    return () => { alive = false; };
  }, [river?.id]);

  const setTab = (next: Tab) => {
    if (next === 'interactive') setGenerated(false);
    const q = new URLSearchParams(params);
    q.set('tab', next);
    setParams(q);
  };
  const setRiver = (slug: string) => {
    const q = new URLSearchParams(params);
    if (slug) q.set('river', slug); else q.delete('river');
    setParams(q);
  };
  const setFilter = (key: FilterKey, value: string) => {
    setFilters((current) => {
      const next = { ...current, [key]: value || undefined };
      if (key === 'stateId') { next.districtId = undefined; next.stationId = undefined; }
      if (key === 'districtId') next.stationId = undefined;
      return next;
    });
    setGenerated(false);
  };

  const query = useMemo(() => {
    if (!river) return '';
    const q = new URLSearchParams({ riverId: river.id, granularity });
    Object.entries(filters).forEach(([key, value]) => { if (value) q.set(key, value); });
    return q.toString();
  }, [river?.id, granularity, filters]);

  const load = async () => {
    if (!river || !filters.parameterId) { setSeries(null); setSummary(null); setSeasonal(null); return; }
    setLoading(true);
    setError('');
    try {
      const base = new URLSearchParams(query);
      base.delete('granularity');
      const [ts, sum, seasons, years, months, spread, matrix] = await Promise.all([
        api.get<{ data: TimeseriesResult }>('/hydrology/timeseries?' + query),
        api.get<{ data: SummaryStats }>('/hydrology/summary?' + base.toString()),
        api.get<{ data: SeasonalResult }>('/hydrology/seasonal?' + base.toString()),
        api.get<{ data: AnnualResult }>('/hydrology/annual?' + base.toString()),
        api.get<{ data: MonthlyResult }>('/hydrology/monthly?' + base.toString()),
        api.get<{ data: DistributionResult }>('/hydrology/distribution?' + base.toString() + '&bins=10'),
        api.get<{ data: HeatmapResult }>('/hydrology/heatmap?' + base.toString()),
      ]);
      setSeries(ts.data);
      setSummary(sum.data);
      setSeasonal(seasons.data);
      setAnnual(years.data);
      setMonthly(months.data);
      setDistribution(spread.data);
      setHeatmap(matrix.data);
      setGenerated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Visualizations could not be loaded.');
      setSeries(null); setSummary(null); setSeasonal(null); setAnnual(null); setMonthly(null); setDistribution(null); setHeatmap(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab !== 'graphs') return;
    void load();
  }, [tab, query]);

  const seasonalOption = useMemo(() => ({
    color: ['#36785b'],
    tooltip: { trigger: 'axis' },
    grid: { left: 46, right: 20, top: 20, bottom: 42 },
    xAxis: { type: 'category', data: seasonal?.series.map((point) => point.season) ?? [], axisLabel: { color: '#64746b' } },
    yAxis: { type: 'value', name: seasonal?.unit ?? '', splitLine: { lineStyle: { color: '#e8eee9' } }, axisLabel: { color: '#64746b' } },
    series: [{ type: 'bar', data: seasonal?.series.map((point) => point.mean) ?? [], barMaxWidth: 54 }],
  }), [seasonal]);

  const firstPoint = series?.points.find((point) => point.avg != null);
  const lastPoint = [...(series?.points ?? [])].reverse().find((point) => point.avg != null);
  const trend = firstPoint && lastPoint && firstPoint !== lastPoint
    ? lastPoint.avg! > firstPoint.avg! ? 'higher' : lastPoint.avg! < firstPoint.avg! ? 'lower' : 'similar'
    : null;
  const hasSeries = !!series?.points.length && !series.mixedUnits;

  return <div className="min-h-[70vh] bg-[#f8faf8]">
    <section className="border-b border-[#dfe8e1] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#1b6845]">River observatories / Research tools</p>
        <h1 className="mt-2 font-serif text-4xl text-[#20342e]">{initialTab === 'maps' ? 'GIS Explorer' : 'Data Explorer'}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#627268]">Explore aggregated trends and spatial patterns. Detailed research datasets are available through a reviewed access request.</p>
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 lg:px-12">
      <div className="flex flex-wrap gap-1 border-b border-[#dce6df]" role="tablist" aria-label="Explorer views">
        {([['graphs', 'Graphs'], ['maps', 'Maps'], ['interactive', 'Interactive Data Exploration']] as const).map(([key, label]) => <button type="button" key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={'border-b-2 px-4 py-3 text-sm font-semibold ' + (tab === key ? 'border-[#14633d] text-[#14633d]' : 'border-transparent text-[#68776d] hover:text-[#14633d]')}>{label}</button>)}
      </div>
      {demoActive && <div role="note" className="mt-5 border-l-4 border-[#9b682b] bg-[#fff7e9] px-5 py-4 text-sm text-[#5d482c]"><strong>Demonstration data.</strong> The plotted water levels and mapped demo sites are synthetic examples, not WCT field observations. Do not use them for research or policy decisions.</div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="h-fit border border-[#dfe8e1] bg-white p-5">
          <h2 className="font-serif text-xl text-[#20342e]">Refine your view</h2>
          <p className="mt-1 text-xs leading-5 text-[#758279]">Choose a river and the available filters.</p>
          <div className="mt-5 space-y-4">
            <Field label="River"><select value={riverSlug} onChange={(event) => setRiver(event.target.value)} className="portal-input"><option value="">Select River</option>{OBSERVATORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></Field>
            <Field label="State"><select value={filters.stateId ?? ''} onChange={(event) => setFilter('stateId', event.target.value)} className="portal-input"><option value="">All states</option>{options.states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="District"><select value={filters.districtId ?? ''} onChange={(event) => setFilter('districtId', event.target.value)} className="portal-input"><option value="">All districts</option>{options.districts.filter((item) => !filters.stateId || item.stateId === filters.stateId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Station"><select value={filters.stationId ?? ''} onChange={(event) => setFilter('stationId', event.target.value)} className="portal-input"><option value="">All stations</option>{options.stations.filter((item) => !filters.districtId || item.districtId === filters.districtId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Parameter"><select value={filters.parameterId ?? ''} onChange={(event) => setFilter('parameterId', event.target.value)} className="portal-input"><option value="">Select parameter</option>{options.parameters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Season"><select value={filters.season ?? ''} onChange={(event) => setFilter('season', event.target.value)} className="portal-input"><option value="">All</option>{options.seasons.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Year"><select value={filters.year ?? ''} onChange={(event) => setFilter('year', event.target.value)} className="portal-input"><option value="">All</option>{options.years.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><input type="date" value={filters.dateFrom ?? ''} onChange={(event) => setFilter('dateFrom', event.target.value)} className="portal-input" /></Field>
              <Field label="To"><input type="date" value={filters.dateTo ?? ''} onChange={(event) => setFilter('dateTo', event.target.value)} className="portal-input" /></Field>
            </div>
          </div>
          {tab === 'interactive' && <button type="button" disabled={!river || !filters.parameterId || loading} onClick={() => void load()} className="mt-6 w-full bg-[#14633d] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Generate Visualization</button>}
          <p className="mt-5 border-t border-[#e6ece7] pt-4 text-xs leading-5 text-[#758279]">Looking for detailed records? <Link to={'/contact?request=data' + (riverSlug ? '&river=' + riverSlug : '')} className="font-semibold text-[#14633d] hover:underline">Request Data Access ↗</Link></p>
        </aside>
        <main className="min-w-0 space-y-5">
          {tab === 'maps' ? <>
            <div className="border border-[#dfe8e1] bg-white p-5"><h2 className="font-serif text-2xl text-[#20342e]">River geography</h2><p className="mt-1 text-sm text-[#65756b]">Explore mapped rivers, monitoring stations and available boundaries.</p></div>
            {riverSlug && !river ? <Empty title="GIS view being prepared" text="This river is not yet available in the spatial database." />
              : <div className="overflow-hidden border border-[#dfe8e1] bg-white"><RiverMap riverId={river?.id} height={490} showLayerControl /></div>}
            <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Spatial layers</h3><p className="mt-2 text-sm leading-6 text-[#68786f]">River network, monitoring stations and available administrative boundaries are shown on the map. Wildlife observations, habitat areas, fisheries locations and conservation zones will be added as verified GIS layers become available.</p></div>
          </> : <>
            <div className="flex flex-col justify-between gap-3 border border-[#dfe8e1] bg-white p-5 sm:flex-row sm:items-center">
              <div><h2 className="font-serif text-2xl text-[#20342e]">{tab === 'graphs' ? 'Research graphs' : 'Generated visualization'}</h2><p className="mt-1 text-sm text-[#68786f]">{tab === 'graphs' ? 'Aggregated temporal and seasonal patterns' : 'Build a visual output from your selected location, parameter and dates'}</p></div>
              {tab === 'graphs' && <select value={granularity} onChange={(event) => setGranularity(event.target.value as 'month' | 'year')} className="portal-input max-w-[150px]" aria-label="Time interval"><option value="month">Monthly</option><option value="year">Yearly</option></select>}
            </div>
            {error && <p className="border border-[#e6d2cc] bg-[#fff8f4] p-4 text-sm text-[#914335]">{error}</p>}
            {!riverSlug ? <Empty title="Select a river to begin" text="Choose a river and parameter to see interpreted trends." />
              : !river ? <Empty title="Research view being prepared" text="This river does not yet have published visualizations." />
              : tab === 'interactive' && !generated ? <Empty title="Build a visualization" text="Select a station or location, parameter and date range, then generate a chart and summary." />
              : loading ? <Empty title="Loading visualizations…" text="Preparing aggregated trends for your selection." />
              : hasSeries ? <>
                <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Trend over time</h3><p className="mt-1 text-xs text-[#748279]">{options.parameters.find((item) => item.id === filters.parameterId)?.name} · {granularity === 'month' ? 'Monthly' : 'Yearly'} means</p><TimeseriesChart data={series} height={350} /></div>
                {seasonal?.series.length ? <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Seasonal pattern</h3><p className="mt-1 text-xs text-[#748279]">Mean by season for the selected filters</p><EChart option={seasonalOption} height={280} /></div> : null}
                <div className="grid gap-5 xl:grid-cols-2">
                  {annual?.series.length ? <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Annual trend</h3><p className="mt-1 text-xs text-[#748279]">Annual mean across available observations</p><AnnualTrendChart data={annual} height={270} /></div> : null}
                  {monthly?.series.length ? <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Monthly pattern</h3><p className="mt-1 text-xs text-[#748279]">Mean by calendar month</p><MonthlyTrendChart data={monthly} height={270} /></div> : null}
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  {distribution?.histogram.length ? <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Value distribution</h3><p className="mt-1 text-xs text-[#748279]">Frequency across the selected measurements</p><DistributionChart data={distribution} height={270} /></div> : null}
                  {heatmap?.years.length ? <div className="border border-[#dfe8e1] bg-white p-5"><h3 className="font-semibold text-[#20342e]">Year and month</h3><p className="mt-1 text-xs text-[#748279]">Monthly means across years</p><HeatmapChart data={heatmap} height={270} /></div> : null}
                </div>
                <div className="border-l-4 border-[#14633d] bg-[#edf4ee] p-5"><h3 className="font-semibold text-[#20342e]">Reading this view</h3><p className="mt-2 text-sm leading-6 text-[#51685a]">The chart covers {series?.points.length} aggregated time periods{summary?.stationCount ? ' across ' + summary.stationCount + ' monitoring location' + (summary.stationCount === 1 ? '' : 's') : ''}.{trend ? ' The latest plotted mean is ' + trend + ' than the earliest plotted mean.' : ''} Compare seasons and locations before drawing conclusions about long-term change.</p></div>
              </> : <Empty title="No visual output available" text="No published aggregated observations match these filters. Try another parameter, location or date range." />}
          </>}
        </main>
      </div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-[#52675a]">{label}<span className="mt-1 block">{children}</span></label>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="flex min-h-[300px] flex-col items-center justify-center border border-[#dfe8e1] bg-white px-6 py-12 text-center"><span className="mb-4 text-3xl text-[#7da68a]" aria-hidden="true">≈</span><h3 className="font-serif text-xl text-[#20342e]">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#738178]">{text}</p></div>;
}
