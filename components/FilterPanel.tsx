import { useEffect, useRef, useState } from 'react';
import type { Category } from '@/types/carpet';
import { PRICE_RANGES } from '@/constants/filters';
import { normalizeSearchValue } from '@/utils/search';
import { getFilterNames, getFilterMaterials, getFilterSizes } from '@/services/carpet.service';
import { Search, X, ChevronDown, Check, Loader2 } from 'lucide-react';

export type CarpetFiltersState = {
  kind: 'carpet' | 'oval' | 'prayer';
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  size: string;
  material: string; // comma separated: 'Paxta,Jun'
  sortBy: string;
};

type Props = {
  categories: Category[];
  filters: CarpetFiltersState;
  onChange: (next: CarpetFiltersState) => void;
  onReset: () => void;
};

export default function FilterPanel({
  categories,
  filters,
  onChange,
  onReset,
}: Props) {
  const formatSizeLabel = (val: string) => {
    if (!val) return '';
    const trimmed = val.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('sm') ||
      lower.includes('cm') ||
      lower.includes('m') ||
      lower.includes('см')
    ) {
      return trimmed;
    }
    return `${trimmed} sm`;
  };

  // DB distinct values cache/state
  const [dbNames, setDbNames] = useState<string[]>([]);
  const [dbMaterials, setDbMaterials] = useState<string[]>([]);
  const [dbSizes, setDbSizes] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingSizes, setLoadingSizes] = useState(false);

  // Select Dropdowns Open state
  const [openSelect, setOpenSelect] = useState<'name' | 'material' | 'price' | 'size' | null>(null);

  // Debounced search text state for Name Select internal input
  const [nameSearch, setNameSearch] = useState('');
  const [debouncedNameSearch, setDebouncedNameSearch] = useState('');

  // Debounced search text state for Material Select internal input
  const [materialSearch, setMaterialSearch] = useState('');

  // Debounced search text state for Size Select internal input
  const [sizeSearch, setSizeSearch] = useState('');
  const [debouncedSizeSearch, setDebouncedSizeSearch] = useState('');
  
  // Keyboard index references
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Refs for outside click detections
  const nameRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);

  // Limit constants for infinite scroll / rendering optimization
  const RENDER_LIMIT = 80;

  // Fetch names, materials, and sizes dynamically when category kind changes
  useEffect(() => {
    async function loadFilters() {
      try {
        setLoadingNames(true);
        setLoadingMaterials(true);
        setLoadingSizes(true);
        const [names, materials, sizes] = await Promise.all([
          getFilterNames(filters.kind),
          getFilterMaterials(filters.kind),
          getFilterSizes(filters.kind),
        ]);
        setDbNames(names);
        setDbMaterials(materials);
        setDbSizes(sizes);
      } catch (err) {
        console.error('Filter panel loading errors:', err);
      } finally {
        setLoadingNames(false);
        setLoadingMaterials(false);
        setLoadingSizes(false);
      }
    }
    void loadFilters();
  }, [filters.kind]);



  // Debounce Name search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameSearch(nameSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameSearch]);

  // Debounce Size search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSizeSearch(sizeSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [sizeSearch]);

  // Handle Outside Click to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        openSelect === 'name' &&
        nameRef.current &&
        !nameRef.current.contains(event.target as Node)
      ) {
        setOpenSelect(null);
      }
      if (
        openSelect === 'material' &&
        materialRef.current &&
        !materialRef.current.contains(event.target as Node)
      ) {
        setOpenSelect(null);
      }
      if (
        openSelect === 'price' &&
        priceRef.current &&
        !priceRef.current.contains(event.target as Node)
      ) {
        setOpenSelect(null);
      }
      if (
        openSelect === 'size' &&
        sizeRef.current &&
        !sizeRef.current.contains(event.target as Node)
      ) {
        setOpenSelect(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSelect]);

  // Reset focus index when dropdown opens
  useEffect(() => {
    setFocusedIndex(-1);
  }, [openSelect]);

  // Normalized distinct items computed from state
  const filteredNames = dbNames.filter((name) => {
    if (!debouncedNameSearch) return true;
    return normalizeSearchValue(name).includes(normalizeSearchValue(debouncedNameSearch));
  });

  const filteredMaterials = dbMaterials.filter((mat) => {
    if (!materialSearch) return true;
    return normalizeSearchValue(mat).includes(normalizeSearchValue(materialSearch));
  });

  const filteredSizes = dbSizes.filter((size) => {
    if (!debouncedSizeSearch) return true;
    return size.toLowerCase().includes(debouncedSizeSearch.toLowerCase());
  });

  // Current active materials array
  const activeMaterials = filters.material
    ? filters.material.split(',').filter(Boolean)
    : [];

  const handleMaterialToggle = (mat: string) => {
    let nextMats = [...activeMaterials];
    if (nextMats.includes(mat)) {
      nextMats = nextMats.filter((m) => m !== mat);
    } else {
      nextMats.push(mat);
    }
    onChange({
      ...filters,
      material: nextMats.join(','),
    });
  };

  const handlePriceSelect = (min: number, max: number) => {
    onChange({
      ...filters,
      minPrice: String(min),
      maxPrice: String(max),
    });
    setOpenSelect(null);
  };

  const getSelectedPriceLabel = () => {
    if (!filters.minPrice && !filters.maxPrice) return '';
    const match = PRICE_RANGES.find(
      (r) => r.min === Number(filters.minPrice) && r.max === Number(filters.maxPrice)
    );
    return match ? match.label : `${Number(filters.minPrice).toLocaleString()} – ${Number(filters.maxPrice).toLocaleString()} so'm`;
  };

  // Keyboard navigation helper
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    type: 'name' | 'material' | 'price' | 'size',
    itemsLength: number,
    onSelectIndex: (index: number) => void
  ) => {
    if (openSelect !== type) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpenSelect(type);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpenSelect(null);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % itemsLength);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + itemsLength) % itemsLength);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < itemsLength) {
        onSelectIndex(focusedIndex);
      }
    }
  };

  return (
    <section className="relative w-full">
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Parametrlar sarlavhasi */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Qidirish parametrlari
          </p>
          <div className="ml-4 h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        {/* Filtr elementlari paneli */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          
          {/* Turlar selecti */}
          <div className="flex flex-col space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kategoriya turi
            </label>
            <div className="relative">
              <select
                value={filters.kind}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    kind: event.target.value as CarpetFiltersState['kind'],
                    categoryId: '',
                  })
                }
                className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 pl-5 pr-10 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="carpet">Gilamlar</option>
                <option value="oval">Oval gilamlar</option>
                <option value="prayer">Joynamozlar</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Saralash (Sort) Selecti */}
          <div className="flex flex-col space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Saralash
            </label>
            <div className="relative">
              <select
                value={filters.sortBy || 'standard'}
                onChange={(event) => onChange({ ...filters, sortBy: event.target.value })}
                className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 pl-5 pr-10 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="standard">Standart / Oxirgilari</option>
                <option value="popular">Mashhurlar (Saralangan)</option>
                <option value="price_desc">Qimmatdan arzonga</option>
                <option value="price_asc">Arzondan qimmatga</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Kolleksiya bo'limi selecti (Gilam turlari) */}
          {filters.kind === 'carpet' && (
            <div className="flex flex-col space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Gilam turi / Kolleksiya
              </label>
              <div className="relative">
                <select
                  value={filters.categoryId || ''}
                  onChange={(event) => onChange({ ...filters, categoryId: event.target.value })}
                  className="w-full appearance-none rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 pl-5 pr-10 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Barcha turlar</option>
                  {categories
                    .filter((c) => c.name.toLowerCase() !== 'categoryname')
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}

          {/* 1. Gilam nomi - Custom Searchable Dropdown */}
          <div className="flex flex-col space-y-2" ref={nameRef}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Gilam nomi
            </label>
            <div
              className="relative"
              role="combobox"
              aria-expanded={openSelect === 'name'}
              aria-haspopup="listbox"
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  'name',
                  filteredNames.slice(0, RENDER_LIMIT).length,
                  (idx) => {
                    const selected = filteredNames[idx];
                    onChange({ ...filters, search: selected });
                    setNameSearch('');
                    setOpenSelect(null);
                  }
                )
              }
            >
              <button
                type="button"
                onClick={() => setOpenSelect(openSelect === 'name' ? null : 'name')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <span className={filters.search ? 'text-slate-800' : 'text-slate-400 font-normal'}>
                  {filters.search || 'Gilam nomini tanlang'}
                </span>
                <div className="flex items-center space-x-1.5 text-slate-400">
                  {filters.search && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...filters, search: '' });
                      }}
                      className="hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {/* Dropdown Options List */}
              {openSelect === 'name' && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-100 bg-white/95 shadow-[0_16px_36px_rgba(0,0,0,0.12)] backdrop-blur-md overflow-hidden">
                  {/* Select Search Box */}
                  <div className="flex items-center border-b border-slate-100 px-4 py-2.5">
                    <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      placeholder="Nomini kiriting..."
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Options items */}
                  <ul
                    className="max-h-60 overflow-y-auto py-1 text-sm scrollbar-thin scrollbar-thumb-slate-200"
                    role="listbox"
                  >
                    {loadingNames ? (
                      <li className="flex items-center justify-center py-6 text-slate-400 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Yuklanmoqda...
                      </li>
                    ) : filteredNames.length === 0 ? (
                      <li className="px-5 py-4 text-center text-slate-400">
                        Bunday nomli gilam topilmadi
                      </li>
                    ) : (
                      filteredNames.slice(0, RENDER_LIMIT).map((name, index) => {
                        const isSelected = filters.search === name;
                        const isFocused = index === focusedIndex;
                        return (
                          <li
                            key={name}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              onChange({ ...filters, search: name });
                              setNameSearch('');
                              setOpenSelect(null);
                            }}
                            className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors duration-150 ${
                              isSelected
                                ? 'bg-blue-50/80 font-bold text-blue-600'
                                : isFocused
                                ? 'bg-slate-50 text-slate-800'
                                : 'text-slate-600 hover:bg-slate-50/50'
                            }`}
                          >
                            <span>{name}</span>
                            {isSelected && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
                          </li>
                        );
                      })
                    )}
                    {filteredNames.length > RENDER_LIMIT && (
                      <li className="px-5 py-2 text-center text-[11px] text-slate-400 font-semibold border-t border-slate-50 bg-slate-50/30">
                        Yana {filteredNames.length - RENDER_LIMIT} ta variant bor... Qidiruvdan foydalaning.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 2. Material - Custom Multi-Select */}
          <div className="flex flex-col space-y-2" ref={materialRef}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Material
            </label>
            <div
              className="relative"
              role="combobox"
              aria-expanded={openSelect === 'material'}
              aria-haspopup="listbox"
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  'material',
                  filteredMaterials.slice(0, RENDER_LIMIT).length,
                  (idx) => {
                    const mat = filteredMaterials[idx];
                    handleMaterialToggle(mat);
                  }
                )
              }
            >
              <button
                type="button"
                onClick={() => setOpenSelect(openSelect === 'material' ? null : 'material')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 min-h-[48px]"
              >
                <div className="flex flex-wrap gap-1.5 pr-2 max-w-[90%]">
                  {activeMaterials.length === 0 ? (
                    <span className="text-slate-400 font-normal">Materiallarni tanlang</span>
                  ) : (
                    activeMaterials.map((mat) => (
                      <span
                        key={mat}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600 border border-blue-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMaterialToggle(mat);
                        }}
                      >
                        {mat}
                        <X className="h-3 w-3 hover:text-blue-800" />
                      </span>
                    ))
                  )}
                </div>
                <div className="flex items-center space-x-1 text-slate-400 shrink-0">
                  {activeMaterials.length > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...filters, material: '' });
                      }}
                      className="hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {/* Dropdown Options */}
              {openSelect === 'material' && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-100 bg-white/95 shadow-[0_16px_36px_rgba(0,0,0,0.12)] backdrop-blur-md overflow-hidden">
                  {/* Select Search Box */}
                  <div className="flex items-center border-b border-slate-100 px-4 py-2.5">
                    <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      placeholder="Material qidirish..."
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  {/* Options List */}
                  <ul
                    className="max-h-60 overflow-y-auto py-1 text-sm scrollbar-thin scrollbar-thumb-slate-200"
                    role="listbox"
                  >
                    {loadingMaterials ? (
                      <li className="flex items-center justify-center py-6 text-slate-400 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Yuklanmoqda...
                      </li>
                    ) : filteredMaterials.length === 0 ? (
                      <li className="px-5 py-4 text-center text-slate-400">
                        Bunday material topilmadi
                      </li>
                    ) : (
                      filteredMaterials.slice(0, RENDER_LIMIT).map((mat, index) => {
                        const isSelected = activeMaterials.includes(mat);
                        const isFocused = index === focusedIndex;
                        return (
                          <li
                            key={mat}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              handleMaterialToggle(mat);
                            }}
                            className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors duration-150 ${
                              isSelected
                                ? 'bg-blue-50/80 font-bold text-blue-600'
                                : isFocused
                                ? 'bg-slate-50 text-slate-800'
                                : 'text-slate-600 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span>{mat}</span>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 3. Narx - Custom Range Select */}
          <div className="flex flex-col space-y-2" ref={priceRef}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Narx oralig'i
            </label>
            <div
              className="relative"
              role="combobox"
              aria-expanded={openSelect === 'price'}
              aria-haspopup="listbox"
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  'price',
                  PRICE_RANGES.length,
                  (idx) => {
                    const range = PRICE_RANGES[idx];
                    handlePriceSelect(range.min, range.max);
                  }
                )
              }
            >
              <button
                type="button"
                onClick={() => setOpenSelect(openSelect === 'price' ? null : 'price')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <span className={getSelectedPriceLabel() ? 'text-slate-800' : 'text-slate-400 font-normal'}>
                  {getSelectedPriceLabel() || "Narx oralig'ini tanlang"}
                </span>
                <div className="flex items-center space-x-1 text-slate-400 shrink-0">
                  {(filters.minPrice || filters.maxPrice) && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...filters, minPrice: '', maxPrice: '' });
                      }}
                      className="hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {/* Price Options List */}
              {openSelect === 'price' && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-100 bg-white/95 shadow-[0_16px_36px_rgba(0,0,0,0.12)] backdrop-blur-md overflow-hidden">
                  <ul className="py-1.5 text-sm" role="listbox">
                    {PRICE_RANGES.map((range, index) => {
                      const isSelected =
                        Number(filters.minPrice) === range.min &&
                        Number(filters.maxPrice) === range.max;
                      const isFocused = index === focusedIndex;
                      return (
                        <li
                          key={range.label}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            handlePriceSelect(range.min, range.max);
                          }}
                          className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? 'bg-blue-50/80 font-bold text-blue-600'
                              : isFocused
                              ? 'bg-slate-50 text-slate-800'
                              : 'text-slate-600 hover:bg-slate-50/50'
                          }`}
                        >
                          <span>{range.label}</span>
                          {isSelected && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 4. O'lcham (Size) - Custom Searchable Select (Bittalik) */}
          <div className="flex flex-col space-y-2" ref={sizeRef}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              O'lcham / Razmer
            </label>
            <div
              className="relative"
              role="combobox"
              aria-expanded={openSelect === 'size'}
              aria-haspopup="listbox"
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  'size',
                  filteredSizes.slice(0, RENDER_LIMIT).length,
                  (idx) => {
                    const selected = filteredSizes[idx];
                    onChange({ ...filters, size: selected });
                    setSizeSearch('');
                    setOpenSelect(null);
                  }
                )
              }
            >
              <button
                type="button"
                onClick={() => setOpenSelect(openSelect === 'size' ? null : 'size')}
                className="w-full flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 py-3.5 px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              >
                <span className={filters.size ? 'text-slate-800' : 'text-slate-400 font-normal'}>
                  {filters.size ? formatSizeLabel(filters.size) : "O'lchamni tanlang"}
                </span>
                <div className="flex items-center space-x-1.5 text-slate-400">
                  {filters.size && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...filters, size: '' });
                      }}
                      className="hover:text-slate-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {/* Size Options Dropdown */}
              {openSelect === 'size' && (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-100 bg-white/95 shadow-[0_16px_36px_rgba(0,0,0,0.12)] backdrop-blur-md overflow-hidden">
                  <div className="flex items-center border-b border-slate-100 px-4 py-2.5">
                    <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={sizeSearch}
                      onChange={(e) => setSizeSearch(e.target.value)}
                      placeholder="O'lcham qidirish (masalan: 2x3)..."
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  <ul
                    className="max-h-60 overflow-y-auto py-1 text-sm scrollbar-thin scrollbar-thumb-slate-200"
                    role="listbox"
                  >
                    {loadingSizes ? (
                      <li className="flex items-center justify-center py-6 text-slate-400 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Yuklanmoqda...
                      </li>
                    ) : filteredSizes.length === 0 ? (
                      <li className="px-5 py-4 text-center text-slate-400">
                        Bunday o'lcham topilmadi
                      </li>
                    ) : (
                      filteredSizes.slice(0, RENDER_LIMIT).map((size, index) => {
                        const isSelected = filters.size === size;
                        const isFocused = index === focusedIndex;
                        return (
                          <li
                            key={size}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              onChange({ ...filters, size: size });
                              setSizeSearch('');
                              setOpenSelect(null);
                            }}
                            className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors duration-150 ${
                              isSelected
                                ? 'bg-blue-50/80 font-bold text-blue-600'
                                : isFocused
                                ? 'bg-slate-50 text-slate-800'
                                : 'text-slate-600 hover:bg-slate-50/50'
                            }`}
                          >
                            <span>{formatSizeLabel(size)}</span>
                            {isSelected && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Tozalash (Reset) tugmasi - Premium To'q Rangda */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-2xl bg-slate-800 hover:bg-slate-900 active:bg-slate-950 py-3.5 text-sm font-black text-white transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer text-center"
            >
              Filtrlarni tozalash
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
