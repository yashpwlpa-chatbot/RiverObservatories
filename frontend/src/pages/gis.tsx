import { usePageMeta } from '@/lib/page-meta';
import { DataExplorer } from '@/components/data/data-explorer';

export default function GisPage() {
  usePageMeta('GIS Explorer', 'Spatial exploration of rivers, monitoring stations and boundaries across the WCT River Observatories.');
  return <DataExplorer initialTab="maps" />;
}
