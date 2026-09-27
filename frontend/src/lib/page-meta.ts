import { useEffect } from 'react';

const BASE_TITLE = 'River Ecology Portal — WCT River Observatories';

/**
 * Replaces Next.js `generateMetadata`/`Metadata` — sets the document title and
 * meta description per page at runtime (React Router has no server rendering).
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · WCT River Observatories` : BASE_TITLE;
    if (description) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', 'description');
        document.head.appendChild(el);
      }
      el.setAttribute('content', description);
    }
  }, [title, description]);
}
