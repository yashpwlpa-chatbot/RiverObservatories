
import { useMemo } from 'react';
import type { TimeseriesResult } from '@/types';
import { EChart } from './echart';
import { formatNumber } from '@/lib/format';

export function TimeseriesChart({
  data,
  height = 340,
  title,
  rollingWindow = 0,
}: {
  data: TimeseriesResult | null;
  height?: number;
  title?: string;
  rollingWindow?: number;
}) {
  const option = useMemo(() => {
    if (!data || data.points.length === 0) return {};
    const labels = data.points.map((p) => {
      const date = new Date(p.t);
      if (Number.isNaN(date.getTime())) return p.t;
      if (data.granularity === 'year') return String(date.getUTCFullYear());
      return date.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'short', year: 'numeric', ...(data.granularity === 'day' ? { day: 'numeric' } : {}) });
    });
    const avg = data.points.map((p) => p.avg);
    const min = data.points.map((p) => p.min);
    const max = data.points.map((p) => p.max);
    const unit = data.unit ? ` (${data.unit})` : '';

    // Rolling average (moving mean over N points) — computed from the already
    // aggregated series, never from raw records.
    const rolling = rollingWindow > 1
      ? avg.map((_, i) => {
          const start = Math.max(0, i - rollingWindow + 1);
          const window = avg.slice(start, i + 1).filter((v): v is number => v != null);
          if (window.length === 0) return null;
          return +(window.reduce((a, b) => a + b, 0) / window.length).toFixed(4);
        })
      : null;

    return {
      color: ['#007F40'],
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e6e8ea',
        textStyle: { color: '#17181c', fontSize: 12 },
        valueFormatter: (v: number | null) => (v == null ? 'No data' : formatNumber(v)),
      },
      legend: { show: true, top: 0, data: rolling ? ['Mean', 'Min–Max range', `Rolling avg (${rollingWindow})`] : ['Mean', 'Min–Max range'] },
      grid: { left: 50, right: 16, top: 34, bottom: 56 },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#dcdfe2' } },
        axisLabel: { color: '#5c636b', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: unit.trim(),
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#eef0f2' } },
        axisLabel: { color: '#5c636b', fontSize: 11 },
      },
      dataZoom: [
        { type: 'inside', filterMode: 'none' },
        { type: 'slider', height: 18, bottom: 8, borderColor: 'transparent', backgroundColor: '#f5f6f7' },
      ],
      series: [
        {
          name: 'Min–Max range',
          type: 'line',
          data: min,
          lineStyle: { opacity: 0 },
          stack: 'range',
          symbol: 'none',
          tooltip: { show: false },
        },
        {
          name: 'Mean',
          type: 'line',
          data: avg,
          smooth: true,
          symbol: 'none',
          connectNulls: false,
          lineStyle: { width: 2 },
          areaStyle: { color: 'rgba(0,127,64,0.10)' },
        },
        {
          name: 'Min–Max range',
          type: 'line',
          data: max.map((value, index) => value == null || min[index] == null ? null : value - min[index]!),
          lineStyle: { opacity: 0 },
          stack: 'range',
          symbol: 'none',
          areaStyle: { color: 'rgba(0,127,64,0.06)' },
          tooltip: { show: false },
        },
        ...(rolling
          ? [
              {
                name: `Rolling avg (${rollingWindow})`,
                type: 'line' as const,
                data: rolling,
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2, color: '#B07D2B', type: 'solid' as const },
              },
            ]
          : []),
      ],
      title: title ? { text: title, left: 0, textStyle: { fontSize: 14, color: '#17181c' } } : undefined,
    };
  }, [data, title, rollingWindow]);

  return <EChart option={option} height={height} />;
}
