import { Link } from 'react-router-dom';

export function HeroCarousel() {
  return (
    <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-[#253933] text-white lg:min-h-[640px]">
      <img src="/assets/river.png" alt="River flowing through a wooded landscape" className="absolute inset-0 -z-20 h-full w-full object-cover" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#132a26]/85 via-[#132a26]/48 to-[#132a26]/10" />
      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-12">
        <div className="max-w-[730px]">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#d6e8dc]">Wildlife Conservation Trust · River Research</p>
          <h1 className="font-serif text-[clamp(2.8rem,5.5vw,5.5rem)] leading-[1.08] tracking-[-0.035em]">River Observatories for the Indo-Gangetic Plains</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">Explore River Hydrology, Wildlife, and Conservation Data &amp; Insights</p>
          <Link to="/rivers" className="mt-9 inline-flex min-w-36 items-center justify-center gap-4 rounded-sm bg-[#14633d] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0b4d2e]">Explore <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <span className="absolute bottom-5 right-6 text-[11px] text-white/80">River landscape · WCT portal imagery</span>
    </section>
  );
}
