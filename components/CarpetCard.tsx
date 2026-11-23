'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Carpet } from '@/types/carpet';
import { api, formatPrice } from '@/services/api';
import { Trash2 } from 'lucide-react';
import { getPricePerM2 } from '@/utils/size';
import { clampDiscountPercent, getDiscountedPrice } from '@/utils/price';
import {
  addToCart,
  getCartItems,
  type CartChangeEventDetail,
} from '@/services/cart.service';
import { getToken, getUserFromToken, isAuthInitializing } from '@/services/auth.service';
import { canUseStorage, safeGet } from '@/utils/safeStorage';
import { isCarpetLiked, likeCarpet } from '@/services/like.service';
import {
  FALLBACK_CARPET_IMAGE,
  getPrimaryCarpetImage,
} from '@/utils/carpet-image';
import { buildAdminCarpetEditUrl } from '@/utils/admin-carpet-edit';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

type Props = {
  carpet: Carpet & { likes?: number }; // Fallback optional likes just in case
};

export default function CarpetCard({ carpet }: Props) {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [isDeleted, setIsDeleted] = useState(false);
  
  // Use DB likes as initial source of truth
  const initialLikes = typeof carpet.likes === 'number' ? carpet.likes : 0;
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(
    typeof carpet.isLiked === 'boolean' ? carpet.isLiked : false,
  );
  
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discountPercent = clampDiscountPercent(carpet.discountPercent);
  const discountedPrice = getDiscountedPrice(carpet.price, discountPercent);
  const isRoll = carpet.type === 'ROLL' || (carpet as any).productType === 'METRAJ';
  const isPrayer = (carpet.category?.name ?? '').toLowerCase().includes('joynamoz');
  const resolvedSize = carpet.size || (carpet as any).inventoryItems?.[0]?.size;
  const pricePerM2 = !isRoll && !isPrayer && resolvedSize ? getPricePerM2(discountedPrice, resolvedSize) : null;
  const resolvedStock = carpet.stock !== undefined ? carpet.stock : ((carpet as any).inventoryItems?.length ?? 0);
  const imageCandidate = useMemo(
    () => getPrimaryCarpetImage(carpet),
    [carpet],
  );
  const adminEditUrl = useMemo(() => buildAdminCarpetEditUrl(carpet), [carpet]);
  const [imageSrc, setImageSrc] = useState(imageCandidate.primary);

  useEffect(() => {
    setImageSrc(imageCandidate.primary);
  }, [imageCandidate.primary]);
  
  const openDetail = () => {
    router.push(`/carpets/${carpet.id}`);
  };

  useEffect(() => {
    const syncAddedState = () => {
      const items = getCartItems();
      setIsAdded(items.some((item) => item.carpetId === carpet.id));
    };

    const handleCartChange = (event: Event) => {
      const detail = (event as CustomEvent<CartChangeEventDetail>).detail;

      if (detail?.action === 'clear') {
        setIsAdded(false);
        return;
      }

      if (detail?.carpetId && detail.carpetId !== carpet.id) {
        return;
      }

      syncAddedState();
    };

    syncAddedState();
    window.addEventListener('yec-cart-changed', handleCartChange);
    return () => window.removeEventListener('yec-cart-changed', handleCartChange);
  }, [carpet.id]);

  useEffect(() => {
    const syncLikeState = () => {
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
      const detail = (event as CustomEvent<{ id?: string; liked?: boolean; count?: number }>).detail;
      if (!detail?.id || detail.id === carpet.id) {
        if (typeof detail?.liked === 'boolean') {
          setIsLiked(detail.liked);
        } else {
          syncLikeState();
        }
        if (typeof detail?.count === 'number') {
          setLikeCount(detail.count);
        }
      }
    };

    window.addEventListener('yec-like-changed', handleLikeChange);
    return () => window.removeEventListener('yec-like-changed', handleLikeChange);
  }, [carpet.id, carpet.isLiked]);

  useEffect(() => {
    const syncAdminState = () => {
      const userRole = getUserFromToken()?.role || (canUseStorage() ? safeGet('yec_user_role') : null);
      setIsAdmin(userRole === 'ADMIN' || userRole === 'SUPERADMIN');
    };

    syncAdminState();
    window.addEventListener('yec-auth-changed', syncAdminState);
    return () => window.removeEventListener('yec-auth-changed', syncAdminState);
  }, []);

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isAuthInitializing()) {
      return;
    }
    // Check in-memory token first, then fall back to persisted session flag
    const isLoggedIn = getToken() || (canUseStorage() && safeGet('yec_has_session') === 'true');
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (resolvedStock <= 0 || isAdded) return;

    addToCart(
      {
        carpetId: carpet.id,
        name: carpet.name,
        price: discountedPrice,
        originalPrice: Number(carpet.price),
        productDiscountPercent: discountPercent,
        image: imageSrc,
        size: resolvedSize,
        material: carpet.material,
      },
      1,
    );

    setIsAdded(true);
    setShowToast(true);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setShowToast(false), 2000);
  };

  const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isAuthInitializing()) {
      return;
    }
    // Check in-memory token first, then fall back to persisted session flag
    const isLoggedIn = getToken() || (canUseStorage() && safeGet('yec_has_session') === 'true');
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    // Optimistic UI updates
    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    setLikeCount((prev) => nextLikedState ? prev + 1 : Math.max(0, prev - 1));

    // Send to backend
    const result = await likeCarpet(carpet.id);
    
    // In case of any desync or rollback, we can trust the result here
    setIsLiked(result.liked);
    if (typeof result.count === 'number') {
      setLikeCount(result.count);
    }
  };

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    try {
      await api.delete(`/carpets/${carpet.id}`);
      setIsDeleteModalOpen(false);
      setIsDeleted(true);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`Xatolik yuz berdi: ${err.response?.data?.message || err.message}`);
    }
  };

  if (isDeleted) {
    return null;
  }

  return (
    <article
      className="classic-carpet-card relative overflow-hidden group cursor-pointer min-w-0 flex flex-col h-full bg-white"
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDetail();
        }
      }}
      role="link"
      tabIndex={0}
    >
      {showToast ? (
        <div className="fixed top-20 right-4 z-50 rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-xl fade-up">
          Buyurtmangiz savatingizga qo&apos;shildi
        </div>
      ) : null}
      <div className="relative aspect-[3/4] overflow-hidden sm:aspect-[4/5]">
        <img
          src={imageSrc}
          alt={carpet.name}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => {
            if (imageCandidate.fallback && imageSrc !== imageCandidate.fallback) {
              setImageSrc(imageCandidate.fallback);
              return;
            }
            if (imageSrc !== FALLBACK_CARPET_IMAGE) {
              setImageSrc(FALLBACK_CARPET_IMAGE);
            }
          }}
          className="h-full w-full object-contain bg-slate-50 transition-transform duration-700 ease-premium-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {isAdmin ? (
          <button
            onClick={handleDelete}
            className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-red-600 hover:scale-110 active:scale-95 sm:left-4 sm:top-4"
            title="O'chirish"
          >
            <Trash2 size={16} />
          </button>
        ) : null}

        {discountPercent > 0 ? (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg sm:right-4 sm:top-4">
            -{discountPercent}%
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleLike}
          className={`absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-lg transition-colors duration-300 sm:left-4 sm:top-4 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px] ${
            isLiked
              ? 'border-primary bg-primary text-white'
              : 'border-white/10 bg-black/40 text-white backdrop-blur-md hover:bg-white hover:text-background'
          }`}
          aria-label="Like"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          <span className="tabular-nums font-black">{likeCount}</span>
        </button>
        
        {/* Stock Badge */}
        {carpet.stock <= 0 ? (
          <div
            className={`absolute right-3 z-10 rounded-full bg-slate-900/90 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg ${
              discountPercent > 0 ? 'top-14 sm:top-16' : 'top-3 sm:top-4'
            }`}
          >
            Sotilgan
          </div>
        ) : !isPrayer && resolvedStock === 1 ? (
          <div
            className={`absolute right-3 z-10 flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg animate-pulse ${
              discountPercent > 0 ? 'top-14 sm:top-16' : 'top-3 sm:top-4'
            }`}
          >
            <span>Faqat 1 ta!</span>
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 line-clamp-1 mb-1">
            {carpet.category?.name || 'YEC MARKET'}
          </p>
          <h3 className="line-clamp-1 font-serif text-2xl font-bold text-white transition-colors duration-500 sm:text-3xl">
            {carpet.name}
          </h3>
        </div>
      </div>

      <div className="p-5 sm:p-8 flex flex-col flex-1">
        {resolvedSize ? (
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9h16M4 15h16M2 4h20v16H2z"/>
              </svg>
              {resolvedSize}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 mt-auto">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              {resolvedStock <= 0 ? (
                <p className="text-lg font-bold tracking-tight text-ink/20 line-through sm:text-2xl">
                  {formatPrice(carpet.price)}{isRoll ? ' / m²' : ''}
                </p>
              ) : (
                <div className="max-w-full space-y-0.5 sm:space-y-1">
                  {!isRoll && resolvedStock > 0 && !isPrayer && pricePerM2 ? (
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary sm:text-xs sm:tracking-[0.14em] mb-0.5 sm:mb-1">
                      {formatPrice(Math.round(pricePerM2))} / m²
                    </p>
                  ) : null}
                  {discountPercent > 0 ? (
                    <p className="text-[10px] font-bold text-ink/30 line-through decoration-red-500 sm:text-sm lg:text-base">
                      {formatPrice(carpet.price)}{isRoll ? ' / m²' : ''}
                    </p>
                  ) : null}
                  <p className="text-[18px] font-black leading-tight tracking-tight text-ink sm:text-3xl lg:text-[2.15rem]">
                    {formatPrice(discountedPrice)}{isRoll ? <span className="text-xs sm:text-base font-bold text-ink/60 lowercase"> / m²</span> : ''}
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={resolvedStock <= 0 || isAdded}
              title={resolvedStock <= 0 ? 'Mavjud emas' : isAdded ? 'Savatda' : "Savatga qo'shish"}
              className={`sm:hidden inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2 transition-all ${
                resolvedStock <= 0
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-ink/30'
                  : isAdded
                    ? 'cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary/5'
              }`}
              aria-label={resolvedStock <= 0 ? 'Mavjud emas' : isAdded ? 'Savatda' : "Savatga qo'shish"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.5a1 1 0 0 0 1-.8L21 7H7" />
              </svg>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <div className={`${isPrayer ? 'block' : 'hidden'} sm:block space-y-1`}>
            <p className="text-[11px] font-semibold tracking-wider uppercase text-ink/50 sm:text-xs sm:tracking-widest sm:text-ink/40 line-clamp-1">
              Material: {carpet.material}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openDetail();
              }}
              className="btn-premium min-w-[85px] flex-1 !px-2 !py-2.5 text-[9px] font-black uppercase tracking-wider sm:min-w-[100px] sm:text-[10px]"
            >
              Batafsil
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={resolvedStock <= 0 || isAdded}
              className={`flex min-w-[85px] flex-1 items-center justify-center rounded-xl px-2 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all sm:min-w-[100px] sm:text-[10px] ${
                resolvedStock <= 0
                  ? 'cursor-not-allowed bg-slate-100 text-ink/30'
                  : isAdded
                    ? 'cursor-not-allowed bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {resolvedStock <= 0 ? 'Yo\'q' : isAdded ? "Savatda" : "Savatga"}
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  router.push(adminEditUrl);
                }}
                className="flex min-w-full items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-2 py-2.5 text-[9px] font-black uppercase tracking-wider text-amber-700 transition-all hover:bg-amber-500 hover:text-white sm:text-[10px]"
              >
                Tahrirlash
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {isDeleteModalOpen ? (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={executeDelete}
          carpetName={carpet.name || ''}
          carpetCode={carpet.uniqueCode || ''}
        />
      ) : null}
    </article>
  );
}
