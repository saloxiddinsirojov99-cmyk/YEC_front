'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatPrice, formatDateOnly, getErrorMessage } from '@/services/api';
import { getToken, getUserFromToken, isAuthInitializing } from '@/services/auth.service';
import { canUseStorage, safeGet } from '@/utils/safeStorage';
import CarpetCard from '@/components/CarpetCard';
import RecommendedCarpetCard from '@/components/RecommendedCarpetCard';
import OldestCarpetSlider from '@/components/OldestCarpetSlider';
import { getCarpetById, getCarpets } from '@/services/carpet.service';
import { addToCart, getCartItems } from '@/services/cart.service';
import { isCarpetLiked, likeCarpet } from '@/services/like.service';
import { getPricePerM2 } from '@/utils/size';
import { clampDiscountPercent, getDiscountedPrice } from '@/utils/price';
import type { Carpet } from '@/types/carpet';
import { getPrimaryCarpetImage, FALLBACK_CARPET_IMAGE } from '@/utils/carpet-image';
import RollTermsModal from '@/components/RollTermsModal';
import ProductDetailsModal from '@/components/ProductDetailsModal';
import { Heart, Star, ShoppingBag, ArrowLeftRight, ShieldCheck, Truck, ChevronRight, ChevronDown } from 'lucide-react';

const formatDisplaySize = (sizeStr: string): string => {
  if (!sizeStr) return '';
  const clean = sizeStr.toLowerCase().replace(/sm/g, '').replace(/cm/g, '').replace(/см/g, '').replace(/\s+/g, '');
  const parts = clean.split('x');
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const l = parseFloat(parts[1]);
    if (w > 10 && l > 10) {
      const wM = w / 100;
      const lM = l / 100;
      return `${wM}x${lM}`;
    }
  }
  return sizeStr;
};

const placeholder =
  'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1200&q=80';

const parseCmInput = (val: string): number => {
  if (val === '') return 0;
  return parseInt(val) || 0;
};

interface LengthMetrSelectProps {
  value: number | null;
  options: number[];
  placeholder: string;
  onChange: (val: number) => void;
}

function LengthMetrSelect({ value, options, placeholder, onChange }: LengthMetrSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-2xl border border-sand bg-white px-4 py-3 text-sm font-semibold text-ink outline-none hover:bg-slate-50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer select-none"
      >
        <span className="text-ink">{value !== null ? `${value} m` : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-ink/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-sand bg-white p-1.5 shadow-xl animate-scaleIn">
          {options.map((m) => {
            const isSelected = value === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(m);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-primary text-white font-bold'
                    : 'text-ink hover:bg-slate-50 hover:text-primary'
                }`}
              >
                <span>{m} m</span>
                {isSelected && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default function CarpetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [activeId, setActiveId] = useState<string | undefined>(id);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const lastParamIdRef = useRef(id);

  // Sync activeId with URL param if it changes from back/forward navigation
  useEffect(() => {
    if (id && id !== lastParamIdRef.current) {
      lastParamIdRef.current = id;
      resetProductSelectionState(id);
    }
  }, [id]);

  const [carpet, setCarpet] = useState<Carpet | null>(null);
  const [isAdminOrSuperAdmin, setIsAdminOrSuperAdmin] = useState(false);

  useEffect(() => {
    const syncRole = () => {
      const tokenUser = getUserFromToken();
      const storedRole = canUseStorage() ? safeGet('yec_user_role') : null;
      const roleStr = (tokenUser?.role || storedRole || '').toUpperCase();
      setIsAdminOrSuperAdmin(
        roleStr.includes('ADMIN') ||
        roleStr === 'SUPERADMIN' ||
        roleStr === 'SUPER_ADMIN'
      );
    };
    syncRole();
    window.addEventListener('yec-auth-changed', syncRole);
    return () => window.removeEventListener('yec-auth-changed', syncRole);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [activeImage, setActiveImage] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const [isTouch, setIsTouch] = useState(false);
  const [showZoomCta, setShowZoomCta] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [similarCarpets, setSimilarCarpets] = useState<Carpet[]>([]);
  const [discoverCarpets, setDiscoverCarpets] = useState<Carpet[]>([]);
  const [oldestCarpets, setOldestCarpets] = useState<Carpet[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [loadingOldest, setLoadingOldest] = useState(false);
  const [similarDesigns, setSimilarDesigns] = useState<Carpet[]>([]);
  const [loadingSimilarDesigns, setLoadingSimilarDesigns] = useState(false);
  const [loadedCollection, setLoadedCollection] = useState<string>('');
  const [collectionCarpets, setCollectionCarpets] = useState<Carpet[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const currentProductRequestId = useRef(0);
  const currentRecommendationRequestId = useRef(0);
  const recommendationsCache = useRef<Map<string, Carpet[]>>(new Map());
  const activeThumbnailRef = useRef<HTMLButtonElement | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollPositionRef.current = e.currentTarget.scrollLeft;
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollPositionRef.current;
    }
  }, [similarDesigns]);

  // Centering active thumbnail scroll alignment
  useEffect(() => {
    const btn = activeThumbnailRef.current;
    const container = scrollContainerRef.current;
    if (btn && container) {
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
        btn.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [carpet?.id]);

  const getCollectionName = (name: string) => {
    let source = String(name ?? '').trim();
    source = source.replace(/\boval\b/gi, '').trim().replace(/\s+/g, ' ');
    const parts = source.split(' ');
    while (
      parts.length > 1 &&
      /^[a-zA-Z]{0,4}\d{1,6}[a-zA-Z0-9]{0,4}$/i.test(parts[parts.length - 1].replace(/[^a-z0-9]/gi, ''))
    ) {
      parts.pop();
    }
    return parts.join(' ').trim().toLowerCase();
  };

  const currentCollection = useMemo(() => {
    return carpet ? getCollectionName(carpet.name) : '';
  }, [carpet?.name]);

  const resetPurchaseState = () => {
    setSelectedWidth(null);
    setLengthMetr(null);
    setLengthCmStr('00');
    setReadyQty(1);
  };

  const resetZoomState = () => {
    setActiveImage(0);
    setIsZoomOpen(false);
    setZoomLevel(1);
    setIsHovering(false);
  };

  const resetProductSelectionState = (newActiveId: string) => {
    setActiveImage(0);
    setIsZoomOpen(false);
    setZoomLevel(1);
    setZoomOrigin('50% 50%');
    setIsTouch(false);
    setIsHovering(false);
    setShowZoomCta(false);
    setSelectedWidth(null);
    setLengthMetr(null);
    setLengthCmStr('00');
    setReadyQty(1);
    setIsDetailsOpen(false);
    setIsTermsOpen(false);
    lastParamIdRef.current = newActiveId;
    setActiveId(newActiveId);
  };
  const [selectedWidth, setSelectedWidth] = useState<number | null>(null);
  const [lengthMetr, setLengthMetr] = useState<number | null>(null);
  const [lengthCmStr, setLengthCmStr] = useState<string>('00');
  const lengthCm = parseCmInput(lengthCmStr);
  const selectedLengthM = lengthMetr !== null ? (lengthMetr + lengthCm / 100) : null;
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Ready carpet quantity state (using buttons, no text inputs)
  const [readyQty, setReadyQty] = useState(1);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  useEffect(() => {
    if (!activeId) return;

    const controller = new AbortController();
    const isInitial = !carpet;
    const reqId = ++currentProductRequestId.current;

    const load = async () => {
      if (isInitial) {
        setLoading(true);
      }
      try {
        setError('');
        const data = await getCarpetById(activeId, controller.signal);
        
        if (!controller.signal.aborted && reqId === currentProductRequestId.current) {
          setCarpet(data);
          
          // Silently replace the URL bar state on success
          window.history.replaceState(null, '', `/carpets/${activeId}`);
          
          if (!isInitial) {
            const imgCount = data.images?.length ?? 0;
            if (activeImage >= imgCount) {
              setActiveImage(0);
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === 'canceled') {
          return;
        }
        if (reqId !== currentProductRequestId.current) {
          return;
        }
        if (isInitial) {
          setError(getErrorMessage(err));
        } else {
          showToast('error', "Ma'lumotni yuklashda xatolik yuz berdi.");
        }
      } finally {
        if (isInitial && !controller.signal.aborted && reqId === currentProductRequestId.current) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [activeId]);

  // Auto-select first available width when carpet loads
  useEffect(() => {
    if (carpet?.type === 'ROLL' && carpet.rollInventories && carpet.rollInventories.length > 0) {
      const firstAvailable = carpet.rollInventories.find(
        (roll) => (roll.currentLengthCm - roll.reservedLengthCm) > 0
      );
      if (firstAvailable) {
        setSelectedWidth(firstAvailable.widthCm);
      } else {
        setSelectedWidth(carpet.rollInventories[0].widthCm);
      }
    }
  }, [carpet]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => {
      setIsTouch(mq.matches || navigator.maxTouchPoints > 0);
    };
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsZoomOpen(false);
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen]);

  useEffect(() => {
    if (!carpet) return;

    const syncLikeState = () => {
      setLikeCount(typeof carpet.likes === 'number' ? carpet.likes : 0);
      if (!getToken()) {
        setIsLiked(false);
        return;
      }
      if (typeof carpet.isLiked === 'boolean') {
        setIsLiked(carpet.isLiked);
        return;
      }
      setIsLiked(isCarpetLiked(carpet.id));
    };

    syncLikeState();
    const handleLikeChange = (event: Event) => {
      const detail = (
        event as CustomEvent<{ id?: string; liked?: boolean; count?: number }>
      ).detail;
      if (!detail?.id || detail.id === carpet.id) {
        if (typeof detail?.liked === 'boolean') {
          setIsLiked(detail.liked);
        } else {
          setIsLiked(isCarpetLiked(carpet.id));
        }
        if (typeof detail?.count === 'number') {
          setLikeCount(detail.count);
        }
      }
    };

    window.addEventListener('yec-like-changed', handleLikeChange);
    return () => window.removeEventListener('yec-like-changed', handleLikeChange);
  }, [carpet?.id]);

  // Load similar carpets (filter current out)
  useEffect(() => {
    if (!carpet?.categoryId) return;

    const loadSimilar = async () => {
      try {
        setLoadingSimilar(true);
        const [response, randomResponse] = await Promise.all([
          getCarpets({
            page: 1,
            limit: 100,
            categoryId: carpet.categoryId,
            sortBy: 'oldest',
          }),
          getCarpets({
            page: 1,
            limit: 100,
            showAll: true,
            sortBy: 'oldest',
          })
        ]);

        const categoryItems = response.items ?? [];
        const allItems = randomResponse.items ?? [];

        // Group similar items and filter out current (unique names)
        const seenSimilarNames = new Set<string>();
        const uniqueSimilar: Carpet[] = [];
        for (const item of categoryItems) {
          if (item.id === carpet.id || item.name.toLowerCase() === carpet.name.toLowerCase()) {
            continue;
          }
          const nameKey = item.name.trim().toLowerCase();
          if (!seenSimilarNames.has(nameKey)) {
            seenSimilarNames.add(nameKey);
            uniqueSimilar.push(item);
          }
        }
        
        let similar = uniqueSimilar.sort(() => Math.random() - 0.5);

        // Group discover items and filter out duplicates and active
        const activeIds = new Set([carpet.id, ...similar.map((s) => s.id)]);
        const seenDiscoverNames = new Set<string>();
        
        // Exclude current carpet name and already matched similar names from discover
        seenDiscoverNames.add(carpet.name.trim().toLowerCase());
        similar.forEach(s => seenDiscoverNames.add(s.name.trim().toLowerCase()));

        const uniqueDiscover: Carpet[] = [];
        for (const item of allItems) {
          if (activeIds.has(item.id)) {
            continue;
          }
          const nameKey = item.name.trim().toLowerCase();
          if (!seenDiscoverNames.has(nameKey)) {
            seenDiscoverNames.add(nameKey);
            uniqueDiscover.push(item);
          }
        }

        const discover = uniqueDiscover.sort(() => Math.random() - 0.5);

        // If similar has less than 4 items, fill it from discover
        if (similar.length < 4) {
          const needed = 4 - similar.length;
          const fillItems = discover.slice(0, needed);
          similar = [...similar, ...fillItems];
          
          const filledIds = new Set(fillItems.map(f => f.id));
          const remainingDiscover = discover.filter(d => !filledIds.has(d.id));
          
          setSimilarCarpets(similar);
          setDiscoverCarpets(remainingDiscover.slice(0, 12));
        } else {
          setSimilarCarpets(similar.slice(0, 4));
          setDiscoverCarpets(discover.slice(0, 12));
        }
      } catch {
        setSimilarCarpets([]);
        setDiscoverCarpets([]);
      } finally {
        setLoadingSimilar(false);
      }
    };

    void loadSimilar();
  }, [carpet?.id, carpet?.categoryId, carpet?.name]);

  // Load oldest top 10 carpets
  useEffect(() => {
    const loadOldest = async () => {
      try {
        setLoadingOldest(true);
        const res = await getCarpets({
          page: 1,
          limit: 100,
          sortBy: 'oldest',
          showAll: true,
        });
        const items = res.items ?? [];
        
        // Filter by unique name to avoid duplicates
        const seenNames = new Set<string>();
        const uniqueItems: Carpet[] = [];
        for (const item of items) {
          const nameKey = item.name.trim().toLowerCase();
          if (!seenNames.has(nameKey)) {
            seenNames.add(nameKey);
            uniqueItems.push(item);
          }
        }
        
        // Shuffle and limit to 10
        const shuffled = uniqueItems.sort(() => Math.random() - 0.5);
        setOldestCarpets(shuffled.slice(0, 10));
      } catch (err) {
        console.error('Failed to load oldest carpets:', err);
      } finally {
        setLoadingOldest(false);
      }
    };
    void loadOldest();
  }, []);

  // Load visual similar designs for ROLL carpets (priority on same collection, unique designCode)
  useEffect(() => {
    if (!carpet?.id || carpet.type !== 'ROLL' || !currentCollection) {
      setSimilarDesigns([]);
      setLoadedCollection('');
      setCollectionCarpets([]);
      return;
    }

    const controller = new AbortController();
    const activeCollectionAtStart = currentCollection;
    const reqId = ++currentRecommendationRequestId.current;

    const loadCollectionAndDesigns = async () => {
      let rollsToProcess = collectionCarpets;

      // Check Memory Cache First
      const cached = recommendationsCache.current.get(currentCollection);
      if (cached) {
        rollsToProcess = cached;
      } else {
        if (currentCollection !== loadedCollection || collectionCarpets.length === 0) {
          try {
            setLoadingSimilarDesigns(true);
            const res = await getCarpets(
              {
                page: 1,
                limit: 100,
                collection: currentCollection,
                excludeId: carpet.id,
                kind: 'roll',
                showAll: true,
                raw: true,
              },
              controller.signal
            );
            
            if (
              controller.signal.aborted ||
              reqId !== currentRecommendationRequestId.current ||
              currentCollection !== activeCollectionAtStart
            ) {
              return;
            }

            const items = res.items ?? [];
            rollsToProcess = items;
            
            recommendationsCache.current.set(currentCollection, items);
            // Evict oldest cache keys when size exceeds 30
            if (recommendationsCache.current.size > 30) {
              const firstKey = recommendationsCache.current.keys().next().value;
              if (firstKey !== undefined) {
                recommendationsCache.current.delete(firstKey);
              }
            }
            setCollectionCarpets(items);
            setLoadedCollection(currentCollection);
          } catch (err: any) {
            if (err.name === 'AbortError' || err.message === 'canceled') {
              return;
            }
            console.error('Failed to load collection carpets:', err);
            if (reqId === currentRecommendationRequestId.current) {
              setSimilarDesigns([]);
            }
            return;
          } finally {
            if (!controller.signal.aborted && reqId === currentRecommendationRequestId.current) {
              setLoadingSimilarDesigns(false);
            }
          }
        }
      }

      if (
        reqId !== currentRecommendationRequestId.current ||
        currentCollection !== activeCollectionAtStart
      ) {
        return;
      }

      // 1. Raw list is rollsToProcess
      let list = [...rollsToProcess];

      // 2. Remove archived carpets
      list = list.filter((item) => !(item as any).isArchived);

      // 3. Remove current carpet
      list = list.filter((item) => item.id.trim().toLowerCase() !== carpet.id.trim().toLowerCase());

      // 4. Remove duplicate IDs
      const seenIds = new Set<string>();
      list = list.filter((item) => {
        if (!item.id) return false;
        const cleanId = item.id.trim().toLowerCase();
        if (seenIds.has(cleanId)) return false;
        seenIds.add(cleanId);
        return true;
      });

      // 5. Remove duplicate designCodes
      const seenCodes = new Set<string>();
      if (carpet.designCode) {
        seenCodes.add(carpet.designCode.trim().toLowerCase());
      }
      list = list.filter((item) => {
        const code = (item.designCode ?? '').trim().toLowerCase();
        if (!code) return true;
        if (seenCodes.has(code)) return false;
        seenCodes.add(code);
        return true;
      });

      // 6. Remove invalid products
      list = list.filter((item) => item && typeof item === 'object');

      // 7. Resolve primary image & Remove products without valid image
      list = list.filter((item) => {
        const primaryImg = getPrimaryCarpetImage(item).primary;
        return primaryImg && primaryImg !== FALLBACK_CARPET_IMAGE;
      });

      // 8. Shuffle
      const shuffled = list.sort(() => Math.random() - 0.5);

      // 9. Take first 9
      const rendered = shuffled.slice(0, 9);

      setSimilarDesigns(rendered);

      // 10. Image preloading
      rendered.forEach((design) => {
        const imgUrl = getPrimaryCarpetImage(design).primary;
        if (imgUrl && imgUrl !== FALLBACK_CARPET_IMAGE) {
          const img = new Image();
          img.onload = () => {
            img.onload = null;
            img.onerror = null;
          };
          img.onerror = () => {
            img.onload = null;
            img.onerror = null;
          };
          img.src = imgUrl;
        }
      });
    };

    void loadCollectionAndDesigns();

    return () => {
      controller.abort();
    };
  }, [carpet?.id, currentCollection]);

  if (loading && !carpet) {
    return (
      <div className="section-shell py-12 max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-2 animate-pulse">
          <div className="space-y-4">
            <div className="aspect-square w-full rounded-3xl bg-sand/40" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 w-20 rounded-xl bg-sand/30" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-8 bg-sand/50 rounded-xl w-3/4" />
            <div className="h-6 bg-sand/30 rounded-xl w-1/2" />
            <div className="h-20 bg-sand/20 rounded-2xl w-full" />
            <div className="h-12 bg-sand/40 rounded-xl w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!carpet) {
    return (
      <div className="section-shell py-12 max-w-6xl mx-auto">
        <p className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
          {error || "Gilam ma'lumoti topilmadi."}
        </p>
      </div>
    );
  }

  const images = carpet.images?.length > 0 ? carpet.images : [placeholder];
  const discountPercent = clampDiscountPercent(carpet.discountPercent);
  const discountedPrice = getDiscountedPrice(Number(carpet.price), discountPercent);
  const isPrayer = (carpet.category?.name ?? '').toLowerCase().includes('joynamoz');
  const resolvedSize = carpet.size || (carpet as any).inventoryItems?.[0]?.size;
  const pricePerM2 = resolvedSize ? getPricePerM2(discountedPrice, resolvedSize) : null;
  const resolvedStock = carpet.stock !== undefined ? carpet.stock : ((carpet as any).inventoryItems?.length ?? 0);

  const isRoll = carpet.type === 'ROLL';

  // Find the selected roll inventory variant matching the selected width
  const selectedVariant = isRoll
    ? carpet.rollInventories?.find((r) => r.widthCm === selectedWidth)
    : null;

  const availableLengthCm = selectedVariant
    ? selectedVariant.currentLengthCm - selectedVariant.reservedLengthCm
    : 0;

  const maxMeters = Math.floor(availableLengthCm / 100);
  const lengthOptions = Array.from({ length: maxMeters + 1 }, (_, i) => i);

  // Price calculations
  const totalLengthCm = selectedLengthM ? Math.round(selectedLengthM * 100) : 0;
  const maxAllowedCm = selectedVariant && lengthMetr !== null
    ? (lengthMetr === Math.floor(availableLengthCm / 100) ? availableLengthCm % 100 : 99)
    : 99;
  const isCmInvalid = lengthMetr !== null && lengthCm > maxAllowedCm;
  const rollArea = selectedWidth && totalLengthCm ? (selectedWidth * totalLengthCm) / 10000 : 0;
  const rollPricePerM2 = selectedVariant ? Number(selectedVariant.pricePerM2) : 0;
  const rollPrice = Math.round(rollArea * rollPricePerM2);
  const rollDiscountedPrice = getDiscountedPrice(rollPrice, discountPercent);

  const handleMeterChange = (m: number) => {
    setLengthMetr(m);
  };

  const handleCmChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    setLengthCmStr(cleaned);
  };

  const handleCmBlur = () => {
    if (lengthCmStr === '') {
      setLengthCmStr('00');
      return;
    }
    const parsed = parseInt(lengthCmStr) || 0;
    setLengthCmStr(String(parsed).padStart(2, '0'));
  };

  const zoomImage = images[activeImage];

  const openZoom = () => {
    setIsZoomOpen(true);
    setZoomLevel(1);
    setZoomOrigin('50% 50%');
  };

  const handleLike = async () => {
    if (isAuthInitializing()) {
      return;
    }
    const isLoggedIn = getToken() || (canUseStorage() && safeGet('yec_has_session') === 'true');
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    setLikeCount((prev) => (nextLikedState ? prev + 1 : Math.max(0, prev - 1)));

    const result = await likeCarpet(carpet.id);
    setIsLiked(result.liked);
    if (typeof result.count === 'number') {
      setLikeCount(result.count);
    }
  };

  const allRollsSoldOut = isRoll && carpet.rollInventories
    ? carpet.rollInventories.every((roll) => (roll.currentLengthCm - roll.reservedLengthCm) <= 0)
    : false;

  return (
    <div className="section-shell py-8 max-w-6xl mx-auto">
      {/* Breadcrumb / Back link */}
      <div className="flex items-center gap-1 text-xs text-ink/40 mb-6 font-medium">
        <Link href="/" className="hover:text-primary transition">Bosh sahifa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={isRoll ? '/metraj-gilamlar' : '/carpets'} className="hover:text-primary transition">
          {isRoll ? 'Metraj gilamlar' : 'Gilamlar'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink/80 truncate font-semibold">{carpet.name}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Left Side: Images & Gallery Thumbnail */}
        <div className="space-y-4">
          <div
            className="group relative w-full overflow-hidden rounded-3xl border border-sand bg-white shadow-soft cursor-zoom-in aspect-square flex items-center justify-center"
            onClick={openZoom}
            onMouseEnter={() => !isTouch && setIsHovering(true)}
            onMouseLeave={() => !isTouch && setIsHovering(false)}
          >
            <img
              src={zoomImage}
              alt={carpet.name}
              className="w-full h-full object-contain p-4 bg-white transition-opacity duration-300"
              {...({ fetchPriority: 'high' } as any)}
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow">
                -{discountPercent}% chegirma
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                    activeImage === idx ? 'border-primary ring-4 ring-primary/10' : 'border-transparent opacity-65 hover:opacity-100'
                  }`}
                >
                  <img src={img} className="h-full w-full object-cover" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>
          )}

          {/* Similar Designs moved under gallery thumbnails in the left column */}
          {isRoll && (
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
                🖼️ O&apos;xshash dizaynlar (Similar Designs)
              </span>
              
              {loadingSimilarDesigns ? (
                // Skeleton loading state: rectangular layout matching desktop/tablet/mobile
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-4 lg:grid-cols-5 sm:overflow-x-visible">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-24 h-24 sm:w-auto sm:aspect-square rounded-lg bg-sand/35 animate-pulse border border-sand/50 flex-shrink-0"
                    />
                  ))}
                </div>
              ) : (
                // Rectangular Thumbnail grid
                <div className="relative">
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none sm:grid sm:grid-cols-4 lg:grid-cols-5 sm:overflow-x-visible"
                  >
                    {(() => {
                      const uniqueRenderList: Carpet[] = [];
                      const seenRenderIds = new Set<string>();

                      if (carpet && carpet.id) {
                        uniqueRenderList.push(carpet);
                        seenRenderIds.add(carpet.id.trim().toLowerCase());
                      }

                      similarDesigns.forEach((design) => {
                        if (design && design.id) {
                          const cleanId = design.id.trim().toLowerCase();
                          if (!seenRenderIds.has(cleanId)) {
                            uniqueRenderList.push(design);
                            seenRenderIds.add(cleanId);
                          }
                        }
                      });

                      return uniqueRenderList.map((design) => {
                        const isSelected = design.id === carpet.id;
                        const imageObj = getPrimaryCarpetImage(design);
                        const imageUrl = imageObj.primary;
                        
                        return (
                          <button
                            key={`${design.id}-${design.designCode || 'code'}`}
                            ref={isSelected ? activeThumbnailRef : undefined}
                            type="button"
                            disabled={isSelected}
                            onClick={() => {
                              router.push(`/carpets/${design.id}`, { scroll: false });
                            }}
                          className={`relative flex-shrink-0 w-24 h-24 sm:w-auto sm:aspect-square rounded-lg overflow-hidden border-2 bg-white transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary/45 ${
                            isSelected
                              ? 'border-yellow-400 scale-[1.05] shadow-md ring-2 ring-yellow-400/20 z-10 cursor-default'
                              : 'border-sand hover:scale-105 opacity-80 hover:opacity-100 cursor-pointer shadow-sm hover:shadow'
                          }`}
                          title={design.name}
                          aria-label={`Tanlash: ${design.name}`}
                        >
                          <img
                            src={imageUrl}
                            alt={design.name}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_CARPET_IMAGE;
                            }}
                            className="w-full h-full object-cover rounded-md"
                            loading="lazy"
                            decoding="async"
                            {...({ fetchPriority: 'low' } as any)}
                          />
                          
                          {/* Active badge */}
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 bg-yellow-400 text-ink rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border border-white shadow animate-scaleIn">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Product Details & Options */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                  4.9
                </span>
                <span className="text-xs text-ink/40 font-semibold">12 sharhlar</span>
                <span className="h-3 w-px bg-sand" />
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                  {(() => {
                    const charSum = carpet.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
                    const count = (charSum % 80) + 20;
                    return `${count}+ buyurtma`;
                  })()}
                </span>
              </div>

              {/* Wishlist Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                  isLiked
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-sand bg-white text-ink/60 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600 stroke-rose-600' : ''}`} />
                <span>{likeCount}</span>
              </button>
            </div>

            <h1 className="mt-3 font-serif text-3xl md:text-4xl text-ink font-bold leading-tight flex flex-wrap items-center gap-3">
              {carpet.name}
              {(carpet.type === 'RETURN_ROLL' || carpet.type === 'RETURN_READY') && (
                <span 
                  className="inline-flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 cursor-help transition"
                  title="Ushbu gilam avval sotilgan va qaytarilgan mahsulot hisoblanadi. U ko'rsatilgan o'lchamda sotiladi. Kesib berish xizmati mavjud emas."
                >
                  ♻️ Qaytarilgan gilam
                </span>
              )}
            </h1>
            {carpet.brand && (
              <p className="mt-1 text-xs font-semibold text-ink/40">
                Brend: <span className="text-primary font-bold">{carpet.brand}</span>
              </p>
            )}

            {/* Key Specifications (Shtrix-kod, Og'irlik, Qalinligi, Yaratilgan sana) for all carpets */}
            {(() => {
              const displayBarcode =
                carpet.barcode ||
                (carpet as any).qoShimchaKod ||
                carpet.qo_shimchaKod ||
                (carpet as any).inventoryItems?.[0]?.barcode ||
                carpet.uniqueCode;

              const createdAtVal = carpet.createdAt || (carpet as any).created_at;

              return (
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs font-bold text-ink/70">
                  {displayBarcode ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-slate-800">
                      🏷️ Shtrix-kod: <strong className="font-mono text-ink">{String(displayBarcode)}</strong>
                    </span>
                  ) : null}

                  {isAdminOrSuperAdmin && createdAtVal ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 border border-amber-200 text-amber-900 font-bold">
                      📅 Yaratilgan sana: <strong className="font-mono text-ink" suppressHydrationWarning>{formatDateOnly(createdAtVal)}</strong>
                    </span>
                  ) : null}

                  {carpet.weightKg && Number(carpet.weightKg) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-slate-800">
                      ⚖️ Og&apos;irligi: <strong className="text-ink">{Number(carpet.weightKg)} kg</strong>
                    </span>
                  ) : null}

                  {carpet.pileHeight && Number(carpet.pileHeight) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-slate-800">
                      📐 Qalinligi (Tuk): <strong className="text-ink">{carpet.pileHeight} mm</strong>
                    </span>
                  ) : null}
                </div>
              );
            })()}

            {/* Prominent & Larger Size Badge */}
            {!isRoll && resolvedSize && (
              <div className="mt-3.5 inline-flex items-center gap-3 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-amber-50/50 to-sand/20 px-5 py-2.5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 8h16M4 16h16M9 4v16M15 4v16" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold uppercase tracking-widest text-ink/50">
                    Gilam o&apos;lchami
                  </span>
                  <span className="text-xl font-black tracking-tight text-ink">
                    {formatDisplaySize(resolvedSize)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <hr className="border-sand" />

          {/* Real-time pricing display */}
          <div className="space-y-1">
            {isRoll ? (
              selectedWidth && selectedLengthM && selectedVariant ? (
                <div className="animate-scaleIn">
                  <p className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">Tanlangan o&apos;lcham narxi</p>
                  {discountPercent > 0 ? (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold text-red-600 transition-all">
                        {formatPrice(rollDiscountedPrice)}
                      </span>
                      <span className="text-xs font-bold text-ink/30 line-through decoration-red-500/50">
                        {formatPrice(rollPrice)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-primary transition-all">
                      {formatPrice(rollPrice)}
                    </p>
                  )}
                  <p className="text-[10px] font-bold text-ink/45 mt-1.5">
                    Hisoblash: {selectedWidth} sm × {selectedLengthM} m = {rollArea.toFixed(2)} m² (1 m²: {formatPrice(Number(selectedVariant.pricePerM2))})
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">m² boshlang&apos;ich narxi</p>
                  <p className="text-2xl font-bold text-orange-700 mt-1">
                    {formatPrice(Number(carpet.price))} <span className="text-xs font-semibold text-ink/50">/ m²</span>
                  </p>
                  <p className="text-xs font-medium text-ink/45 mt-1">
                    Variantni ko&apos;rish uchun kenglik va uzunlikni tanlang.
                  </p>
                </div>
              )
            ) : (
              // Ready/Prayer Carpets Pricing
              <div>
                {resolvedStock > 0 && !isPrayer && pricePerM2 ? (
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary sm:text-xs sm:tracking-[0.14em] mb-1.5 animate-scaleIn">
                    {formatPrice(Math.round(pricePerM2))} / m²
                  </p>
                ) : null}
                <p className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">Narxi</p>
                {discountPercent > 0 ? (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-red-600">
                      {formatPrice(discountedPrice * readyQty)}
                    </span>
                    <span className="text-xs font-bold text-ink/30 line-through">
                      {formatPrice(Number(carpet.price) * readyQty)}
                    </span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatPrice(Number(carpet.price) * readyQty)}
                  </p>
                )}
                {readyQty > 1 && (
                  <p className="text-[10px] text-ink/40 font-semibold mt-1">
                    Dona narxi: {formatPrice(discountPercent > 0 ? discountedPrice : Number(carpet.price))}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Availability details */}
          <div className="flex items-center text-xs font-bold">
            {isRoll ? (
              allRollsSoldOut ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-100">
                  ❌ Omborda qolmagan
                </span>
              ) : selectedWidth && selectedVariant ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 border border-emerald-100 animate-scaleIn">
                  ✅ Omborda mavjud (Qolgan: {((selectedVariant.currentLengthCm - selectedVariant.reservedLengthCm) / 100).toFixed(1)} metr)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 text-slate-500 px-3 py-1.5 border border-slate-100">
                  ⚡ Mavjud kenglikni tanlang
                </span>
              )
            ) : resolvedStock <= 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-100">
                ❌ Sotilgan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 border border-emerald-100">
                ✅ Omborda mavjud
              </span>
            )}
          </div>

          <hr className="border-sand" />



          {/* 2. Roll Width selector chips */}
          {isRoll && carpet.rollInventories && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
                📏 Gilam kengligi (Kenglik)
              </span>
              <div className="flex flex-wrap gap-2">
                {carpet.rollInventories.map((roll) => {
                  const available = roll.currentLengthCm - roll.reservedLengthCm;
                  const isSoldOut = available <= 0;
                  const isSelected = selectedWidth === roll.widthCm;

                  return (
                    <button
                      key={roll.id}
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => {
                        setSelectedWidth(roll.widthCm);
                        setLengthMetr(null);
                        setLengthCmStr('00');
                      }}
                      className={`rounded-2xl border px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                        isSoldOut
                          ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                          : isSelected
                            ? 'border-primary bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                            : 'border-sand bg-white text-ink hover:bg-slate-50'
                      }`}
                    >
                      {roll.widthCm} sm
                      {available / 100 < 5 && !isSoldOut && (
                        <span className="ml-1.5 text-[8px] uppercase bg-amber-500 text-white px-1 py-0.5 rounded-full font-bold">
                          Oxirgi
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Roll Length selection */}
          {isRoll && selectedWidth && (
            <div className="space-y-3.5 animate-scaleIn">
              <span className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
                📐 Gilam uzunligi
              </span>
              {availableLengthCm < 100 && availableLengthCm > 0 ? (
                <p className="text-xs text-amber-600 font-semibold">
                  ⚠️ Afsuski, ushbu kenglik bo&apos;yicha omborda 1 metrdan kam qoldiq qolgan.
                </p>
              ) : availableLengthCm <= 0 ? (
                <p className="text-xs text-amber-600 font-semibold">
                  ⚠️ Afsuski, ushbu kenglik bo&apos;yicha omborda qoldiq qolmagan.
                </p>
              ) : (
                <>
                  {/* Metr & Sm Inputs */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1.5">
                      <span className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider pl-1">
                        Metr
                      </span>
                      <LengthMetrSelect
                        value={lengthMetr}
                        options={lengthOptions}
                        placeholder="Uzunlikni tanlang"
                        onChange={(val) => handleMeterChange(val)}
                      />
                    </div>

                    <div className="w-28 space-y-1.5">
                      <span className="block text-[10px] font-bold text-ink/40 uppercase tracking-wider pl-1">
                        Santimetr
                      </span>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={lengthMetr === null}
                          value={lengthCmStr}
                          onChange={(e) => handleCmChange(e.target.value)}
                          onBlur={handleCmBlur}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-ink text-center outline-none focus:ring-4 transition-all ${
                            isCmInvalid
                              ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-red-100'
                              : 'border-sand bg-white disabled:bg-slate-50/70 disabled:text-ink/30 disabled:cursor-not-allowed focus:border-primary/50 focus:ring-primary/10'
                          }`}
                          placeholder="00"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink/40 pointer-events-none">
                          sm
                        </span>
                      </div>
                    </div>
                  </div>

                  {isCmInvalid && lengthMetr !== null && (
                    <p className="text-xs font-bold text-red-600 animate-scaleIn pl-1">
                      ⚠️ Maksimal mavjud uzunlik {lengthMetr} m {maxAllowedCm} sm.
                    </p>
                  )}

                  {/* Real-time details */}
                  {lengthMetr !== null && (
                    <div className="rounded-2xl border border-sand bg-slate-50/50 p-4.5 space-y-2.5 animate-scaleIn text-xs font-semibold">
                      <div className="flex justify-between text-ink/50">
                        <span>Mavjud rulon:</span>
                        <span className="text-ink font-bold">{(availableLengthCm / 100).toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between text-primary font-bold text-sm">
                        <span>Tanlangan uzunlik:</span>
                        <span className="font-extrabold">{(selectedLengthM || 0).toFixed(2)} m</span>
                      </div>
                      <div className="flex justify-between border-t border-sand pt-2 text-ink/70">
                        <span>Qoladi:</span>
                        <span className="text-ink font-bold">
                          {Math.max(0, (availableLengthCm - totalLengthCm) / 100).toFixed(2)} m
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Ready Carpet Quantity selection */}
          {!isRoll && resolvedStock > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
                Dona (Soni)
              </span>
              {(carpet.type === 'RETURN_ROLL' || carpet.type === 'RETURN_READY') ? (
                <div className="text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-200/50 p-3 rounded-xl inline-block">
                  ♻️ Qaytarilgan gilam bo&apos;lagi faqat 1 dona sotiladi.
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={readyQty <= 1}
                    onClick={() => setReadyQty((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 border border-sand rounded-xl bg-white text-ink text-lg font-bold flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    -
                  </button>
                  <span className="w-12 h-10 border border-sand rounded-xl flex items-center justify-center font-bold text-sm text-ink bg-slate-50">
                    {readyQty}
                  </span>
                  <button
                    type="button"
                    disabled={readyQty >= resolvedStock}
                    onClick={() => setReadyQty((prev) => Math.min(resolvedStock, prev + 1))}
                    className="w-10 h-10 border border-sand rounded-xl bg-white text-ink text-lg font-bold flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delivery & Benefits Section (Uzum Market Style) */}
          <div className="rounded-3xl bg-sand/15 p-4 border border-sand/40 space-y-3 text-xs text-ink/70">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-800">Tezkor yetkazib berish</p>
                <p className="text-[10px] text-emerald-700/80">Toshkent shahrida 1 kunda bepul yetkaziladi</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-ink">Sifat kafolati</p>
                <p className="text-[10px] text-ink/50">Biz faqat eng sifatli gilam va materiallarni taklif qilamiz</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800">Qaytarish va almashtirish</p>
                <p className="text-[10px] text-amber-700/80">Mahsulotda nuqson bo&apos;lsa, 3 kunda bepul almashtiriladi</p>
              </div>
            </div>
          </div>

          {/* Add to Cart Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {/* Left Button: Batafsil ma'lumot */}
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="flex-1 min-h-[50px] rounded-2xl border border-sand bg-white text-ink/85 hover:text-ink hover:bg-slate-50 hover:border-slate-300 font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
              >
                <span>📄 Batafsil ma&apos;lumot</span>
              </button>

              {/* Right Button: Savatga qo'shish */}
              {isRoll ? (
                <button
                  type="button"
                  disabled={!selectedWidth || !selectedLengthM || isCmInvalid}
                  onClick={() => {
                    const isLoggedIn = getToken() || (canUseStorage() && safeGet('yec_has_session') === 'true');
                    if (!isLoggedIn) {
                      router.push('/login');
                      return;
                    }
                    setIsTermsOpen(true);
                  }}
                  className={`flex-1 min-h-[50px] rounded-2xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 ${
                    !selectedWidth || !selectedLengthM || isCmInvalid
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-100 focus:ring-emerald-500/50 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  <span>Savatga qo&apos;shish</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={resolvedStock <= 0}
                  onClick={() => {
                    const isLoggedIn = getToken() || (canUseStorage() && safeGet('yec_has_session') === 'true');
                    if (!isLoggedIn) {
                      router.push('/login');
                      return;
                    }
                    if (resolvedStock <= 0) return;
                    setIsTermsOpen(true);
                  }}
                  className={`flex-1 min-h-[50px] rounded-2xl flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 ${
                    resolvedStock <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-100 focus:ring-emerald-500/50 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-4.5 h-4.5" />
                  <span>{resolvedStock <= 0 ? "Sotuvda yo'q" : "Savatga qo'shish"}</span>
                </button>
              )}
            </div>

            {/* Savatga o'tish link */}
            <Link
              href="/cart"
              onClick={(event) => {
                const isLoggedIn = getToken() || (canUseStorage() && safeGet('yec_has_session') === 'true');
                if (!isLoggedIn) {
                  event.preventDefault();
                  router.push('/login');
                }
              }}
              className="w-full py-2.5 rounded-xl border border-sand bg-slate-50 hover:bg-slate-100 text-ink/60 hover:text-ink font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              Savatingizni ko&apos;rish (Savatga o&apos;tish)
            </Link>
          </div>
        </div>
      </div>

      {/* Similar Carpets (Sizga yoqishi mumkin) */}
      {similarCarpets.length > 0 && (
        <section className="mt-16 border-t border-sand/40 pt-10">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Sizga yoqishi mumkin</p>
            <h2 className="font-serif text-3xl md:text-4xl text-ink font-bold mt-1">Shu kolleksiyadagi mahsulotlar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {similarCarpets.map((c) => (
              <RecommendedCarpetCard key={c.id} carpet={c} />
            ))}
          </div>
        </section>
      )}

      {/* Discover more random carpets */}
      {discoverCarpets.length > 0 && (
        <section className="mt-16 border-t border-sand/40 pt-10">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Tavsiyalar</p>
            <h2 className="font-serif text-3xl md:text-4xl text-ink font-bold mt-1 font-serif">Kashf eting</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {discoverCarpets.map((c) => (
              <RecommendedCarpetCard key={c.id} carpet={c} />
            ))}
          </div>
        </section>
      )}

      {/* Oldest carpets horizontal slider */}
      {oldestCarpets.length > 0 && (
        <section className="mt-16 border-t border-sand/40 pt-10">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Tavsiyalar</p>
            <h2 className="font-serif text-3xl md:text-4xl text-ink font-bold mt-1">Shunga o&apos;xshash gilamlar</h2>
          </div>
          <OldestCarpetSlider carpets={oldestCarpets} />
        </section>
      )}

      {/* Roll terms confirmation modal */}
      <RollTermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        onConfirm={() => {
          if (isRoll) {
            if (isCmInvalid) return;
            addToCart(
              {
                carpetId: carpet.id,
                name: `${carpet.name} (${selectedWidth} sm)`,
                price: rollDiscountedPrice,
                originalPrice: rollPrice,
                productDiscountPercent: discountPercent,
                image: images[0],
                size: `${selectedWidth} sm × ${selectedLengthM} m`,
                material: carpet.material,
                widthCm: selectedWidth || undefined,
                lengthCm: totalLengthCm || undefined,
              },
              1,
            );
          } else {
            addToCart(
              {
                carpetId: carpet.id,
                name: carpet.name,
                price: discountedPrice,
                originalPrice: Number(carpet.price),
                productDiscountPercent: discountPercent,
                image: images[0],
                size: resolvedSize || 'Noma\'lum',
                material: carpet.material,
              },
              readyQty,
            );
          }
          setIsTermsOpen(false);
          resetPurchaseState();
          resetZoomState();
          showToast('success', "Savatga muvaffaqiyatli qo'shildi.");
        }}
      />

      <ProductDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        carpet={carpet}
        isRoll={isRoll}
        selectedWidth={selectedWidth}
        lengthM={String(selectedLengthM || 0)}
        lengthCm="0"
      />

      {/* Custom float Toast notification */}
      {message && (
        <div className={`fixed bottom-8 right-8 z-[9999] rounded-2xl px-6 py-4 shadow-xl border flex items-center gap-2 animate-scaleIn select-none ${
          messageType === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{messageType === 'success' ? '✅' : '❌'}</span>
          <p className="text-sm font-bold">{message}</p>
        </div>
      )}

      {/* Image zoom portal */}
      {isZoomOpen && mounted ? (
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 transition-all duration-300 animate-in fade-in"
            onClick={() => {
              setIsZoomOpen(false);
              setZoomLevel(1);
            }}
          >
            <div
              className="relative flex h-full w-full flex-col items-center justify-center p-2 sm:p-8"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur-xl transition-all hover:bg-white/20 active:scale-90"
                onClick={() => {
                  setIsZoomOpen(false);
                  setZoomLevel(1);
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>

              <div
                className="relative flex h-[85vh] w-full items-center justify-center overflow-hidden"
                onMouseMove={(event) => {
                  if (zoomLevel === 1 || isTouch) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - rect.left) / rect.width) * 100;
                  const y = ((event.clientY - rect.top) / rect.height) * 100;
                  setZoomOrigin(`${x}% ${y}%`);
                }}
                onMouseLeave={() => setZoomOrigin('50% 50%')}
              >
                <img
                  src={zoomImage}
                  alt={`${carpet.name} zoom`}
                  className={`max-h-full max-w-full bg-white object-contain transition-transform duration-300 rounded-lg shadow-2xl ${
                    zoomLevel > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: zoomOrigin,
                  }}
                  onClick={() => setZoomLevel((prev) => (prev === 1 ? 2.5 : 1))}
                />
              </div>
              
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                 <p className="rounded-full bg-black/40 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md animate-pulse">
                   {zoomLevel > 1 ? 'Kichraytirish uchun bosing' : 'Yaqinlashtirish uchun bosing'}
                 </p>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
}
