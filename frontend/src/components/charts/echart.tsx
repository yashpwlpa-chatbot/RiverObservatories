
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, BoxplotChart, HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([LineChart, BarChart, BoxplotChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, TitleComponent, VisualMapComponent, CanvasRenderer]);

export function EChart({
  option,
  height = 320,
  className,
  onReady,
}: {
  option: EChartsCoreOption;
  height?: number;
  className?: string;
  onReady?: (chart: echarts.ECharts) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    onReady?.(chart);
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ height }} className={className} role="img" aria-label="Chart" />;
}

export const CHART_COLORS = ['#007F40', '#2F6F9F', '#B07D2B', '#7A4F9D', '#4F8A8B', '#8A5A44', '#5F7D3A', '#B3261E'];
