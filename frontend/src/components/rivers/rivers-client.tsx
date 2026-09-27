import { Link, useSearchParams } from 'react-router-dom';
import { OBSERVATORIES, RESEARCH_CATEGORIES } from '@/lib/observatories';

export function RiversClient() {
  const [params] = useSearchParams();
  const category = RESEARCH_CATEGORIES.find((item) => item.key === params.get('category'));
  return <div className="bg-white">
    <section className="border-b border-[#e1e9e3] bg-[#f3f7f4]">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1b6845]">The observatory network</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[#20342e] sm:text-5xl">River Observatories</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#5d6d64]">Explore river systems through research themes, interpreted visualizations and spatial context.</p>
        {category && <p className="mt-3 text-sm font-medium text-[#14633d]">Theme: {category.label}</p>}
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-12">
      <div className="mb-6 flex items-center justify-between border-b border-[#e1e9e3] pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.13em] text-[#4f6258]">Select an observatory</h2>
        <span className="text-xs text-[#748279]">12 river systems</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OBSERVATORIES.map((river, index) => <Link key={river.slug} to={'/rivers/' + river.slug + (category ? '?category=' + category.key : '')} className="group flex min-h-[138px] flex-col justify-between border border-[#dce6df] bg-white p-5 transition-colors hover:border-[#91b29c] hover:bg-[#f8faf8]">
          <span className="text-xs font-medium text-[#8a9a90]">{String(index + 1).padStart(2, '0')}</span>
          <span className="flex items-end justify-between gap-4"><span className="font-serif text-[27px] leading-none text-[#20342e]">{river.name}</span><span className="text-lg text-[#14633d] transition-transform group-hover:translate-x-1" aria-hidden="true">↗</span></span>
        </Link>)}
      </div>
    </section>
  </div>;
}
