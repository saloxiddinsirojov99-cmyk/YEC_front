'use client';

import { useState, useRef, useEffect } from 'react';

type Option = {
  value: string;
  label: string;
  subLabel?: string;
  original?: any;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  onAddClick?: () => void;
  required?: boolean;
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '-- Tanlang --',
  disabled = false,
  onAddClick,
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    const term = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  });

  return (
    <div ref={containerRef} className="relative w-full flex gap-2">
      <div className="relative flex-1">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`flex items-center justify-between input-field cursor-pointer min-h-[46px] select-none ${
            disabled ? 'bg-sand/20 cursor-not-allowed opacity-60' : 'bg-white hover:border-primary/45'
          } ${isOpen ? 'border-primary ring-2 ring-primary/10' : ''}`}
        >
          <span className={selectedOption ? 'text-ink font-semibold' : 'text-ink/40'}>
            {selectedOption ? `${selectedOption.label} ${selectedOption.subLabel ? `(${selectedOption.subLabel})` : ''}` : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-ink/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Hidden input to support native form validation (required) */}
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
        />

        {/* Dropdown panel */}
        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl border border-sand bg-white shadow-xl overflow-hidden p-2 animate-scaleIn min-w-[280px]">
            {/* Search Input */}
            <div className="relative mb-2">
              <input
                type="text"
                autoFocus
                placeholder="Qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-sand bg-sand/10 px-3 py-2 pl-8 text-xs text-ink outline-none focus:border-primary/50 focus:bg-white transition-all"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink text-xs font-semibold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink/40">Mos keladigan nom topilmadi</div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex flex-col rounded-xl px-3 py-2 text-xs cursor-pointer select-none transition-colors ${
                      opt.value === value
                        ? 'bg-primary text-white font-semibold'
                        : 'hover:bg-sand/30 text-ink'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.subLabel && (
                      <span className={`text-[10px] ${opt.value === value ? 'text-white/70' : 'text-ink/45'}`}>
                        Kod: {opt.subLabel}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {onAddClick && !disabled && (
        <button
          type="button"
          onClick={onAddClick}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/95 transition active:scale-95 whitespace-nowrap min-h-[46px] flex items-center justify-center gap-1 shadow-md shadow-primary/10"
        >
          <span>➕</span>
          <span className="hidden sm:inline">Yangi nom</span>
        </button>
      )}
    </div>
  );
}
