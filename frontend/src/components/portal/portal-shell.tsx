
import { Link, useLocation } from 'react-router-dom';
import { Container } from '@/components/layout/container';
import { cn } from '@/lib/utils';

export interface PortalLink {
  href: string;
  label: string;
}

export function PortalShell({ title, subtitle, links, children }: { title: string; subtitle?: string; links: PortalLink[]; children: React.ReactNode }) {
  const pathname = useLocation().pathname;
  return (
    <Container className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      <nav className="thin-scroll mt-5 flex gap-1 overflow-x-auto border-b border-border pb-px" aria-label={`${title} sections`}>
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== '/admin' && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              to={l.href}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
