'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Carpet } from '@/types/carpet';
import CarpetCard from './CarpetCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  carpets: Carpet[];
  loading?: boolean;
  emptyText?: string;
  autoPlayInterval?: number;
};

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="h-48 animate-pulse bg-primary/5 sm:h-64" />
      <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
        <div className="h-5 w-2/3 animate-pulse rounded-lg bg-primary/5 sm:h-6" />
        <div className="h-3 w-1/2 animate-pulse rounded-lg bg-primary/5 sm:h-4" />
        <div className="mt-4 flex justify-between">
          <div className="h-7 w-1/3 animate-pulse rounded-lg bg-primary/5 sm:h-8" />
          <div className="h-7 w-1/4 animate-pulse rounded-lg bg-primary/5 sm:h-8" />
        </div>
      </div>
    </div>
  );
}

export default function CarpetCarousel({
  carpets,
  loading = false,
  emptyText,
  autoPlayInterval = 3000,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const currentIndexRef = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const pauseUntilRef = useRef(0);

  const getStepWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;

    const firstItem = track.querySelector<HTMLElement>('[data-carousel-item="true"]');
    if (!firstItem) return 0;

    const style = window.getComputedStyle(track);
    const gapValue = Number.parseFloat(style.columnGap || style.gap || '0');
    const gap = Number.isFinite(gapValue) ? gapValue : 0;
    return firstItem.offsetWidth + gap;
  }, []);

  const syncIndexFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || carpets.length === 0) return;
    const step = getStepWidth();
    if (step <= 0) return;

    const index = Math.round(track.scrollLeft / step);
    const bounded = Math.max(0, Math.min(carpets.length - 1, index));
    currentIndexRef.current = bounded;
    setActiveIdx(bounded);
  }, [carpets.length, getStepWidth]);

  const moveToIndex = useCallback(
    (targetIndex: number, smooth = true) => {
      const track = trackRef.current;
      if (!track || carpets.length === 0) return;
      const step = getStepWidth();
      if (step <= 0) return;

      let nextIdx = targetIndex;
      if (nextIdx >= carpets.length) {
        nextIdx = 0;
      } else if (nextIdx < 0) {
        nextIdx = carpets.length - 1;
      }

      currentIndexRef.current = nextIdx;
      setActiveIdx(nextIdx);

      track.scrollTo({
        left: nextIdx * step,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [carpets.length, getStepWidth],
  );

  const handleNext = () => {
    pauseUntilRef.current = Date.now() + 5000;
    moveToIndex(currentIndexRef.current + 1, true);
  };

  const handlePrev = () => {
    pauseUntilRef.current = Date.now() + 5000;
    moveToIndex(currentIndexRef.current - 1, true);
  };

  const handleUserInteract = useCallback(() => {
    pauseUntilRef.current = Date.now() + 5000;
    syncIndexFromScroll();
  }, [syncIndexFromScroll]);

  useEffect(() => {
    currentIndexRef.current = 0;
    setActiveIdx(0);
    const track = trackRef.current;
    if (track) {
      track.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [carpets.length]);

  // Smooth Auto-rotation timer (3 seconds default)
  useEffect(() => {
    if (loading || carpets.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      moveToIndex(currentIndexRef.current + 1, true);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [carpets.length, loading, isHovered, autoPlayInterval, moveToIndex]);

  const trackClassName =
    '-mx-1 flex gap-4 overflow-x-auto px-1 pb-3 snap-x snap-mandatory scroll-smooth scrollbar-hide select-none transition-all duration-300';

  if (loading) {
    return (
      <div className={trackClassName}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} data-carousel-item="true" className="w-[260px] sm:w-[280px] md:w-[320px] flex-shrink-0 snap-start">
            <SkeletonCard />
          </div>
        ))}
      </div>
    );
  }

  if (carpets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-terracotta/40 bg-terracotta/5 p-6 text-center text-ink/70 sm:p-8">
        {emptyText ?? 'Hozircha gilamlar topilmadi.'}
      </div>
    );
  }

  return (
    <div
      className="relative group/carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left Navigation Arrow */}
      {carpets.length > 1 && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Oldingi gilam"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-ink border border-sand/80 shadow-lg backdrop-blur-md flex items-center justify-center transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="w-6 h-6 text-ink/80" />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {carpets.length > 1 && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Keyingi gilam"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-ink border border-sand/80 shadow-lg backdrop-blur-md flex items-center justify-center transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 hover:scale-110 active:scale-95"
        >
          <ChevronRight className="w-6 h-6 text-ink/80" />
        </button>
      )}

      {/* Carousel Track */}
      <div
        ref={trackRef}
        className={trackClassName}
        onTouchStart={handleUserInteract}
        onTouchEnd={syncIndexFromScroll}
        onMouseDown={handleUserInteract}
        onWheel={handleUserInteract}
        onScroll={syncIndexFromScroll}
      >
        {carpets.map((carpet, idx) => (
          <div
            key={carpet.id}
            data-carousel-item="true"
            className={`w-[260px] sm:w-[280px] md:w-[320px] flex-shrink-0 snap-start transition-all duration-500 transform ${
              idx === activeIdx ? 'scale-[1.01]' : 'opacity-95'
            }`}
          >
            <CarpetCard carpet={carpet} />
          </div>
        ))}
      </div>

      {/* Slide Position Dots Indicator */}
      {carpets.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 pt-3">
          {carpets.slice(0, 10).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                pauseUntilRef.current = Date.now() + 5000;
                moveToIndex(idx, true);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeIdx
                  ? 'w-6 bg-primary shadow-xs'
                  : 'w-2 bg-sand/60 hover:bg-sand'
              }`}
              aria-label={`Slayd ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
