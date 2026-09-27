import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { WctLogo } from './logo';
import { OBSERVATORIES } from '@/lib/observatories';
import { useAuth } from '@/lib/auth';

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/rivers', label: 'Observatories' },
  { to: '/gis', label: 'GIS' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const selectedRiver = OBSERVATORIES.find((river) => pathname === '/rivers/' + river.slug)?.slug ?? '';
  const canResearch = user?.role === 'ADMIN' || user?.role === 'RESEARCHER';

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  const signOut = () => {
    logout();
    setOpen(false);
    setAccountOpen(false);
    navigate('/');
  };

  return <header className="sticky top-0 z-40 border-b border-[#dfe7e2] bg-white">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-6 sm:px-10 lg:px-12">
      <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="River Observatories home">
        <WctLogo className="h-10 w-auto shrink-0 object-contain sm:h-11" />
        <span className="hidden border-l border-[#dbe4dd] pl-3 leading-tight sm:block">
          <span className="block whitespace-nowrap text-[13px] font-semibold text-[#213c2c]">RIVER OBSERVATORIES</span>
          <span className="block text-[11px] text-[#718078]">Indo-Gangetic Plains</span>
        </span>
      </Link>
      <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary navigation">
        {navigation.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          return <Link key={item.to} to={item.to} className={'border-b-2 py-2 text-[13px] font-semibold transition-colors ' + (active ? 'border-[#14633d] text-[#14633d]' : 'border-transparent text-[#3c4944] hover:text-[#14633d]')}>{item.label}</Link>;
        })}
      </nav>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="header-river">Select River</label>
        <select id="header-river" value={selectedRiver} onChange={(event) => { if (event.target.value) { navigate('/rivers/' + event.target.value); setOpen(false); } }} className="h-10 max-w-[145px] cursor-pointer rounded-sm border border-[#14633d] bg-white px-3 text-xs font-semibold text-[#14633d] sm:max-w-none sm:min-w-[154px]">
          <option value="">Select River</option>
          {OBSERVATORIES.map((river) => <option key={river.slug} value={river.slug}>{river.name}</option>)}
        </select>
        <div className="relative hidden lg:block" ref={accountRef}>
          {user ? <>
            <button type="button" aria-expanded={accountOpen} aria-controls="account-menu" onClick={() => setAccountOpen((value) => !value)} className="flex h-10 items-center gap-2 whitespace-nowrap border border-[#dce5de] px-3 text-xs font-semibold text-[#254736] hover:bg-[#f3f7f4]">
              Account <span aria-hidden="true">⌄</span>
            </button>
            {accountOpen && <div id="account-menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 border border-[#dce5de] bg-white p-2 shadow-[0_10px_24px_rgba(31,58,46,0.12)]">
              <p className="border-b border-[#e8eee9] px-2 py-2 text-xs text-[#66776c]">Signed in as <strong className="block truncate text-[#20342e]">{user.name}</strong></p>
              {user.role === 'ADMIN' && <Link to="/admin" onClick={() => setAccountOpen(false)} className="block px-2 py-2 text-sm text-[#30483a] hover:bg-[#f3f7f4]">Admin Portal</Link>}
              {canResearch && <Link to="/researcher" onClick={() => setAccountOpen(false)} className="block px-2 py-2 text-sm text-[#30483a] hover:bg-[#f3f7f4]">Researcher Portal</Link>}
              <button type="button" onClick={signOut} className="block w-full border-t border-[#e8eee9] px-2 py-2 text-left text-sm text-[#30483a] hover:bg-[#f3f7f4]">Sign out</button>
            </div>}
          </> : <Link to="/login" className="flex h-10 items-center whitespace-nowrap border border-[#dce5de] px-3 text-xs font-semibold text-[#254736] hover:bg-[#f3f7f4]">Sign in</Link>}
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center border border-[#dce5de] text-[#254736] lg:hidden" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>
      </div>
    </div>
    {open && <nav className="border-t border-[#e0e7e2] bg-white px-6 py-3 lg:hidden" aria-label="Mobile navigation">
      {navigation.map((item) => <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium text-[#30483a]">{item.label}</Link>)}
      <div className="mt-2 border-t border-[#e0e7e2] pt-2">
        {user ? <>
          <p className="py-2 text-xs font-semibold text-[#718078]">ACCOUNT · {user.name}</p>
          {user.role === 'ADMIN' && <Link to="/admin" onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium text-[#30483a]">Admin Portal</Link>}
          {canResearch && <Link to="/researcher" onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium text-[#30483a]">Researcher Portal</Link>}
          <button type="button" onClick={signOut} className="block w-full py-2.5 text-left text-sm font-medium text-[#30483a]">Sign out</button>
        </> : <Link to="/login" onClick={() => setOpen(false)} className="block py-2.5 text-sm font-semibold text-[#14633d]">Sign in</Link>}
      </div>
    </nav>}
  </header>;
}
