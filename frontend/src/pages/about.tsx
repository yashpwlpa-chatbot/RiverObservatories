import { Link } from 'react-router-dom';
import { usePageMeta } from '@/lib/page-meta';

export default function AboutPage() {
  usePageMeta('About the River Observatories', 'A research-led view of river ecology and conservation in the Indo-Gangetic Plains.');
  return <div className="bg-white">
    <section className="border-b border-[#dfe8e1] bg-[#f3f7f4]"><div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-12"><p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#1b6845]">About the initiative</p><h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-[#20342e] sm:text-5xl">Understanding rivers as living systems</h1><p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#617167]">River Observatories for the Indo-Gangetic Plains brings together research on water, wildlife, habitats and the people who depend on rivers.</p></div></section>
    <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.3fr_0.7fr] lg:px-12">
      <div className="max-w-3xl space-y-5 text-[15px] leading-8 text-[#53655a]"><p>The Wildlife Conservation Trust uses long-term observation and interdisciplinary research to understand how river systems change. This portal offers a public view of that work through maps, aggregated graphs and interpreted insights.</p><p>Each river observatory connects hydrology with ecological, climate, fisheries, social and conservation questions. Research categories will expand as validated information becomes available.</p><p>Detailed datasets are managed through a request process so that appropriate context, methods and provenance can accompany their use.</p></div>
      <div className="h-fit border-l-2 border-[#14633d] bg-[#f3f7f4] p-6"><h2 className="font-serif text-2xl text-[#20342e]">Explore the network</h2><p className="mt-3 text-sm leading-6 text-[#627268]">Begin with a river and move between themes, visualizations and geographic context.</p><Link to="/rivers" className="mt-5 inline-block text-sm font-semibold text-[#14633d] hover:underline">View river observatories ↗</Link></div>
    </div>
  </div>;
}
