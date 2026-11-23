'use client';

import { useEffect } from 'react';

/**
 * Locks body scroll when the modal is open.
 * Uses `overflow: hidden` + accounts for scrollbar width to prevent layout shift.
 */
export default function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [locked]);
}