import { useParams } from 'react-router-dom';
import { usePageMeta } from '@/lib/page-meta';
import { RiverDetailClient } from '@/components/rivers/river-detail-client';

function prettyName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function RiverDetailPage() {
  const { riverId } = useParams<{ riverId: string }>();
  const id = decodeURIComponent(riverId ?? '');
  const name = prettyName(id);

  usePageMeta(`${name} · River Dashboard`, `${name} river observatory — research categories, interpreted visualizations and spatial context.`);

  return <RiverDetailClient riverId={id} />;
}
