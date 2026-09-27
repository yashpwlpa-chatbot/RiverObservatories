import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'neutral';

const variants: Record<Variant, string> = {
  default: 'bg-primary text-white',
  secondary: 'bg-muted text-muted-foreground border border-border',
  outline: 'border border-border text-foreground',
  success: 'bg-brand-50 text-brand-700 border border-brand-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  destructive: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-muted text-foreground border border-border',
};

export function Badge({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)} {...props} />;
}
