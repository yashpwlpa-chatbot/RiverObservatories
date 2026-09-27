import { usePageMeta } from '@/lib/page-meta';
import { RiversClient } from '@/components/rivers/rivers-client';

export default function RiversPage() {
  usePageMeta(
    'River Observatories',
    'Explore river observatories across India — hydrological data, monitoring stations and river ecology.',
  );
  return <RiversClient />;
}
