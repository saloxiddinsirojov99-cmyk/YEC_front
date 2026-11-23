'use client';

import { useEffect, useRef, useState } from 'react';
import type { Carpet } from '@/types/carpet';
import RecommendedCarpetCard from './RecommendedCarpetCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  carpets: Carpet[];
}

export default function OldestCarpetSlider({ carpets }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const getScrollAmount = () => {
    if (!scrollRef.current) return 0;
    const card = scrollRef.current.firstElementChild as HTMLElement;
    if (card) {
      return card.clientWidth + 24; // Card width + gap (24px for gap-6)
    }
    return scrollRef.current.clientWidth;
  };

  const handleNext = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = getScrollAmount();
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (el.scrollLeft >= maxScroll - 10) {
      // Loop back to start smoothly
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollTo({ left: el.scrollLeft + scrollAmount, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = getScrollAmount();

    if (el.scrollLeft <= 10) {
      // Go to end smoothly
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    } else {
      el.scrollTo({ left: el.scrollLeft - scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isHovered || carpets.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered, carpets.length]);

  if (!carpets || carpets.length === 0) return null;

  return (
    <div
      className="relative w-full group/slider animate-fadeIn"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider Viewport */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-none pb-4 px-1"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {carpets.map((c) => (
          <div
            key={c.id}
            className="snap-start shrink-0 select-none"
            style={{
              width: '320px',
              maxWidth: '100%',
            }}
          >
            <RecommendedCarpetCard carpet={c} />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={handlePrev}
        className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-sand shadow-lg flex items-center justify-center hover:bg-slate-50 transition active:scale-95 opacity-0 group-hover/slider:opacity-100 focus:opacity-100 transition-opacity duration-300"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 text-ink/75" />
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-sand shadow-lg flex items-center justify-center hover:bg-slate-50 transition active:scale-95 opacity-0 group-hover/slider:opacity-100 focus:opacity-100 transition-opacity duration-300"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 text-ink/75" />
      </button>
    </div>
  );
}
