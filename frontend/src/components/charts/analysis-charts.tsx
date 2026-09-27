import { useMemo } from 'react';
import type { AnnualResult, DistributionResult, HeatmapResult, MonthlyResult, ScatterResult, SeasonalResult } from '@/types';
import { EChart } from './echart';
import { formatNumber, monthLabel } from '@/lib/format';

const GREEN = '#007F40';
const NEUTRAL_AXIS = '#E5E7EB';
const LABEL = '#667085';

function baseAxis() {
  return {
    axisLine: { lineStyle: { color: NEUTRAL_AXIS } },
    axisLabel: { color: LABEL, fontSize: 11 },
  };
}

/** Annual trend — mean line with min–max band + optional std. */
export function AnnualTrendChart({ data, height = 320 }: { data: AnnualResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || data.series.length === 0) return {};
    const unit = data.unit ? ` (${data.unit})` : '';
    const years = data.series.map((s) => String(s.year));
    return {
      color: [GREEN, '#B07D2B'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        valueFormatter: (v: number | null) => (v == null ? '—' : formatNumber(v)),
      },
      legend: { show: true, top: 0, data: ['Annual mean', 'Min–Max range'] },
      grid: { left: 50, right: 16, top: 34, bottom: 34 },
      xAxis: { type: 'category', data: years, ...baseAxis() },
      yAxis: { type: 'value', name: unit.trim(), splitLine: { lineStyle: { color: '#EDF2F7' } }, axisLabel: { color: LABEL, fontSize: 11 } },
      series: [
        {
          name: 'Min–Max range',
          type: 'line',
          data: data.series.map((s) => s.min),
          stack: 'band',
          lineStyle: { opacity: 0 },
          symbol: 'none',
          tooltip: { show: false },
        },
        {
          name: 'Annual mean',
          type: 'line',
          data: data.series.map((s) => s.mean),
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2 },
          areaStyle: { color: 'rgba(0,127,64,0.08)' },
        },
        {
          name: 'Min–Max range',
          type: 'line',
          data: data.series.map((s) => s.max == null || s.min == null ? null : s.max - s.min),
          stack: 'band',
          lineStyle: { opacity: 0 },
          symbol: 'none',
          areaStyle: { color: 'rgba(0,127,64,0.05)' },
          tooltip: { show: false },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Monthly trend — bar chart of monthly mean with min–max error band. */
export function MonthlyTrendChart({ data, height = 320 }: { data: MonthlyResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || data.series.length === 0) return {};
    const unit = data.unit ? ` (${data.unit})` : '';
    const labels = data.series.map((s) => monthLabel(s.month));
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        valueFormatter: (v: number | null) => (v == null ? '—' : formatNumber(v)),
      },
      grid: { left: 50, right: 16, top: 24, bottom: 30 },
      xAxis: { type: 'category', data: labels, ...baseAxis() },
      yAxis: { type: 'value', name: unit.trim(), splitLine: { lineStyle: { color: '#EDF2F7' } }, axisLabel: { color: LABEL, fontSize: 11 } },
      series: [
        {
          name: 'Monthly mean',
          type: 'bar',
          data: data.series.map((s) => s.mean),
          barWidth: '55%',
          itemStyle: { color: GREEN, borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Seasonal comparison — bar chart of seasonal mean. */
export function SeasonalChart({ data, height = 320 }: { data: SeasonalResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || data.series.length === 0) return {};
    const unit = data.unit ? ` (${data.unit})` : '';
    const labels = data.series.map((s) => s.season);
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        valueFormatter: (v: number | null) => (v == null ? '—' : formatNumber(v)),
      },
      grid: { left: 56, right: 16, top: 24, bottom: 30 },
      xAxis: { type: 'category', data: labels, ...baseAxis() },
      yAxis: { type: 'value', name: unit.trim(), splitLine: { lineStyle: { color: '#EDF2F7' } }, axisLabel: { color: LABEL, fontSize: 11 } },
      series: [
        {
          name: 'Seasonal mean',
          type: 'bar',
          data: data.series.map((s) => s.mean),
          barWidth: '55%',
          itemStyle: { color: GREEN, borderRadius: [3, 3, 0, 0] },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Distribution — histogram of observations. */
export function DistributionChart({ data, height = 320 }: { data: DistributionResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || data.histogram.length === 0) return {};
    const unit = data.unit ? ` (${data.unit})` : '';
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          return `${p.name}<br/>Observations: ${formatNumber(p.value, 0)}`;
        },
      },
      grid: { left: 50, right: 16, top: 24, bottom: 40 },
      xAxis: { type: 'category', data: data.histogram.map((h) => `${formatNumber(h.from)}–${formatNumber(h.to)}`), ...baseAxis(), axisLabel: { color: LABEL, fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', name: 'Count', splitLine: { lineStyle: { color: '#EDF2F7' } }, axisLabel: { color: LABEL, fontSize: 11 } },
      series: [
        {
          name: `Observations${unit}`,
          type: 'bar',
          data: data.histogram.map((h) => h.count),
          barWidth: '90%',
          itemStyle: { color: GREEN },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Box plot from distribution percentiles (single box: min/Q1/median/Q3/max). */
export function BoxPlotChart({ data, height = 320 }: { data: DistributionResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || !data.stats || data.stats.count === 0) return {};
    const s = data.stats;
    const unit = data.unit ? ` (${data.unit})` : '';
    const box = [s.min, s.p25, s.median, s.p75, s.max].map((v) => (v == null ? null : +v.toFixed(4)));
    return {
      tooltip: {
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        formatter: () =>
          `Min: ${formatNumber(s.min)}<br/>Q1: ${formatNumber(s.p25)}<br/>Median: ${formatNumber(s.median)}<br/>Q3: ${formatNumber(s.p75)}<br/>Max: ${formatNumber(s.max)}`,
      },
      grid: { left: 50, right: 40, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: ['Observations'], ...baseAxis() },
      yAxis: { type: 'value', name: unit.trim(), splitLine: { lineStyle: { color: '#EDF2F7' } }, axisLabel: { color: LABEL, fontSize: 11 } },
      series: [
        {
          name: 'Distribution',
          type: 'boxplot',
          data: [box],
          itemStyle: { color: 'rgba(0,127,64,0.25)', borderColor: GREEN },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Heatmap — year × month matrix of monthly means. */
export function HeatmapChart({ data, height = 380 }: { data: HeatmapResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || data.years.length === 0) return {};
    const unit = data.unit ? ` (${data.unit})` : '';
    const cells: [number, number, number][] = [];
    data.matrix.forEach((row, yi) => {
      row.forEach((v, mi) => {
        if (v != null) cells.push([mi, yi, +v.toFixed(2)]);
      });
    });
    const values = cells.map((c) => c[2]);
    const max = values.length ? Math.max(...values) : 1;
    const min = values.length ? Math.min(...values) : 0;
    return {
      tooltip: {
        position: 'top',
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        formatter: (p: { value: [number, number, number] }) =>
          `${data.years[p.value[1]]}-${String(data.months[p.value[0]]).padStart(2, '0')}<br/>Mean: ${formatNumber(p.value[2])}${unit}`,
      },
      grid: { left: 60, right: 20, top: 16, bottom: 70 },
      xAxis: { type: 'category', data: data.months.map((m) => monthLabel(m)), splitArea: { show: true }, ...baseAxis() },
      yAxis: { type: 'category', data: data.years.map(String), splitArea: { show: true }, ...baseAxis() },
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        inRange: { color: ['#EDF2F7', '#A6D5BC', '#007F40', '#00592E'] },
        textStyle: { color: LABEL, fontSize: 11 },
      },
      series: [
        {
          name: `Mean${unit}`,
          type: 'heatmap',
          data: cells,
          label: { show: false },
          emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Scatter — bounded sample of raw observations (value vs date). */
export function ScatterChart({ data, height = 340 }: { data: ScatterResult | null; height?: number }) {
  const option = useMemo(() => {
    if (!data || data.points.length === 0) return {};
    const unit = data.unit ? ` (${data.unit})` : '';
    const points = data.points
      .filter((p) => p.value != null)
      .map((p) => [p.observedAt, p.value] as [string, number]);
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: NEUTRAL_AXIS,
        textStyle: { color: '#444444', fontSize: 12 },
        formatter: (p: { value: [string, number] }) => `${p.value[0].slice(0, 10)}<br/>Value: ${formatNumber(p.value[1])}${unit}`,
      },
      grid: { left: 56, right: 20, top: 16, bottom: 60 },
      xAxis: { type: 'time', axisLine: { lineStyle: { color: NEUTRAL_AXIS } }, axisLabel: { color: LABEL, fontSize: 11 } },
      yAxis: { type: 'value', name: unit.trim(), splitLine: { lineStyle: { color: '#EDF2F7' } }, axisLabel: { color: LABEL, fontSize: 11 } },
      dataZoom: [{ type: 'inside' }],
      series: [
        {
          name: 'Observations',
          type: 'scatter',
          data: points,
          symbolSize: 4,
          itemStyle: { color: 'rgba(0,127,64,0.45)' },
        },
      ],
    };
  }, [data]);
  return <EChart option={option} height={height} />;
}

/** Small helper to render distribution summary stats as a readable row. */
export function DistributionStatsTable({ data }: { data: DistributionResult | null }) {
  if (!data || !data.stats || data.stats.count === 0) return null;
  const s = data.stats;
  const rows: [string, string][] = [
    ['Observations', formatNumber(s.count, 0)],
    ['Mean', s.mean == null ? '—' : formatNumber(s.mean)],
    ['Std. deviation', s.std == null ? '—' : formatNumber(s.std)],
    ['Minimum', s.min == null ? '—' : formatNumber(s.min)],
    ['Q1 (25%)', s.p25 == null ? '—' : formatNumber(s.p25)],
    ['Median', s.median == null ? '—' : formatNumber(s.median)],
    ['Q3 (75%)', s.p75 == null ? '—' : formatNumber(s.p75)],
    ['Maximum', s.max == null ? '—' : formatNumber(s.max)],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-heading">{value}</span>
        </div>
      ))}
    </div>
  );
}
