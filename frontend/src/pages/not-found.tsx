import { usePageMeta } from '@/lib/page-meta';
import { Container } from '@/components/layout/container';
import { ButtonLink } from '@/components/ui/button-link';

export default function NotFoundPage() {
  usePageMeta('Page not found');
  return (
    <Container className="py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex justify-center">
        <ButtonLink href="/">Back to home</ButtonLink>
      </div>
    </Container>
  );
}
