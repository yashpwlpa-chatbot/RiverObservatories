import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg';

const variants: Record<Variant, string> = {
  default: 'bg-brand-500 text-white hover:bg-brand-600',
  secondary: 'bg-muted text-foreground hover:bg-neutral-200',
  outline: 'border border-border bg-white text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizes: Record<Size, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
};

export function ButtonLink({
  href,
  variant = 'default',
  size = 'default',
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
