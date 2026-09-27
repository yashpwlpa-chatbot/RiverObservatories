import { usePageMeta } from '@/lib/page-meta';
import { DataExplorer } from '@/components/data/data-explorer';

export default function DataPage() {
  usePageMeta('Data Explorer', 'Explore interpreted river trends, aggregated charts and GIS views across the WCT River Observatories.');
  return <DataExplorer />;
}
