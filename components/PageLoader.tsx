'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const clearAllTimers = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const stopLoading = () => {
    clearAllTimers();
    if (isMountedRef.current) {
      setLoading(false);
    }
  };

  const startLoading = () => {
    clearAllTimers();
    // Small delay prevents flicker on ultra-fast navigations
    showTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setLoading(true);
      // Safety auto-hide if navigation hangs (tracked in ref for cleanup)
      safetyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }, 5000);
    }, 50);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, []);

  // Click handler for link navigation
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = (target?.closest?.('a') as HTMLAnchorElement | null) ?? null;
      if (!anchor) return;

      if (anchor.target === '_blank') return;
      if (anchor.hasAttribute('download')) return;
      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return;
      if (
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:')
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      startLoading();
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  // Stop loading on pathname/search change (navigation completed)
  useEffect(() => {
    stopLoading();
  }, [pathname, searchParams]);

  // Backup: listen for popstate (browser back/forward)
  useEffect(() => {
    const onPopState = () => {
      stopLoading();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[10000] h-1.5 w-full overflow-hidden pointer-events-none bg-transparent"
      role="status"
      aria-live="polite"
      aria-label="Yuklanmoqda"
    >
      <div className="h-full w-full origin-left bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500 animate-progress-loading shadow-[0_2px_10px_rgba(243,156,18,0.5)]" />
    </div>
  );
}