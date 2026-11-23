'use client';

import { useRef, useEffect } from 'react';

type AccordionSectionProps = {
  title: string;
  icon?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export default function AccordionSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus trap / keyboard compatibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="border-b border-sand last:border-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-4 px-1 text-left text-sm font-bold text-ink hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
      >
        <span className="flex items-center gap-2.5">
          {icon && <span className="text-base leading-none select-none">{icon}</span>}
          <span>{title}</span>
        </span>
        <span
          className={`text-xs text-ink/40 transition-transform duration-300 ease-out select-none ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        >
          ▼
        </span>
      </button>

      <div
        ref={contentRef}
        style={{
          height: isOpen ? `${contentRef.current?.scrollHeight}px` : '0px',
        }}
        className="transition-[height] duration-300 ease-out overflow-hidden"
      >
        <div className="pb-5 pt-1 px-1 text-xs leading-6 text-ink/75">
          {children}
        </div>
      </div>
    </div>
  );
}
