import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../analytics';

/**
 * Records a page view whenever the route path changes. Query-string changes (e.g. the Playground
 * updating p1/p2) are not page views. The landing page view is recorded by `initAnalytics`.
 */
export function usePageViewTracking(): void {
  const { pathname } = useLocation();
  const lastTrackedPath = useRef(pathname);

  useEffect(() => {
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;
    trackPageView();
  }, [pathname]);
}
