import { Link } from 'react-router-dom';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { FeatureCards } from '@/components/home/feature-cards';
import { OBSERVATORIES } from '@/lib/observatories';
import { usePageMeta } from '@/lib/page-meta';

export default function HomePage() {
  usePageMeta('River Observatories for the Indo-Gangetic Plains', 'Explore river hydrology, wildlife, conservation and community insights from the Wildlife Conservation Trust.');
  return <>
    <HeroCarousel />
    <div className="border-b border-[#e0e7e2] bg-[#f3f7f4]">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-6 sm:flex-row sm:items-center sm:px-10 lg:px-12">
        <p className="max-w-2xl text-sm leading-6 text-[#536861]"><strong className="text-[#20342e]">A research-led portal.</strong> Discover interpreted trends and spatial context for {OBSERVATORIES.length} river observatories.</p>
        <Link to="/rivers" className="shrink-0 text-sm font-semibold text-[#14633d] hover:underline">View all observatories <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
    <FeatureCards />
    <section className="bg-[#f3f7f4] py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1b6845]">River observatories</p><h2 className="mt-2 font-serif text-3xl text-[#20342e]">Start with a river</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6e69]">Open a dedicated observatory to explore its research categories, visualizations and maps.</p></div>
        <Link to="/rivers" className="inline-flex w-fit items-center gap-3 border border-[#14633d] px-5 py-3 text-sm font-semibold text-[#14633d] hover:bg-white">Browse river observatories <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  </>;
}
