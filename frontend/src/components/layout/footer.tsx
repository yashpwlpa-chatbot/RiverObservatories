import { Link } from 'react-router-dom';
import { WctLogo } from './logo';

export function Footer() {
  return <footer className="border-t border-[#dce6de] bg-[#f3f7f4]">
    <div className="mx-auto max-w-7xl px-6 py-11 sm:px-10 lg:px-12">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr]">
        <div className="max-w-sm"><WctLogo className="h-10 w-auto" /><p className="mt-4 text-sm leading-6 text-[#63746a]">Research and interpreted insights for the rivers of the Indo-Gangetic Plains.</p></div>
        <div><h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#31553c]">Explore</h2><nav className="mt-4 flex flex-col gap-2 text-sm text-[#607168]" aria-label="Footer explore"><Link to="/rivers" className="hover:text-[#14633d]">Observatories</Link><Link to="/gis" className="hover:text-[#14633d]">GIS</Link><Link to="/about" className="hover:text-[#14633d]">About</Link></nav></div>
        <div><h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#31553c]">Connect</h2><nav className="mt-4 flex flex-col gap-2 text-sm text-[#607168]" aria-label="Footer connect"><Link to="/contact" className="hover:text-[#14633d]">Contact</Link><Link to="/contact?request=data" className="hover:text-[#14633d]">Request Data Access</Link><Link to="/login" className="hover:text-[#14633d]">Staff sign in</Link></nav></div>
      </div>
      <div className="mt-9 border-t border-[#dce6de] pt-5 text-xs text-[#77857a]">© {new Date().getFullYear()} Wildlife Conservation Trust · River Observatories</div>
    </div>
  </footer>;
}
