'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Carpet } from '@/types/carpet';
import { clampDiscountPercent, getDiscountedPrice } from '@/utils/price';
import { addToCart, getCartItems } from '@/services/cart.service';
import { getToken, isAuthInitializing } from '@/services/auth.service';
import { canUseStorage, safeGet } from '@/utils/safeStorage';
import { isCarpetLiked, likeCarpet } from '@/services/like.service';
import { FALLBACK_CARPET_IMAGE, getPrimaryCarpetImage } from '@/utils/carpet-image';

type Props = {
  carpet: Carpet & { likes?: number };
};

export default function RecommendedCarpetCard({ carpet }: Props) {
  const router = useRouter();
  const [isAdded, setIsAdded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(carpet.likes || 0);

  const discountPercent = clampDiscountPercent(carpet.discountPercent);
  const discountedPrice = getDiscountedPrice(carpet.price, discountPercent);
  const imageCandidate = useMemo(() => getPrimaryCarpetImage(carpet), [carpet]);
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
    syncAddedState();
    window.addEventListener('yec-cart-changed', syncAddedState);
    return () => window.removeEventListener('yec-cart-changed', syncAddedState);
  }, [carpet.id]);

  useEffect(() => {
    const syncLikeState = () => {
      if (!getToken()) {
        setIsLiked(false);
        return;
      }
      setIsLiked(isCarpetLiked(carpet.id));
    };
    syncLikeState();
    const handleLikeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; liked?: boolean; count?: number }>).detail;
      if (!detail?.id || detail.id === carpet.id) {
        if (typeof detail?.liked === 'boolean') setIsLiked(detail.liked);
        if (typeof detail?.count === 'number') setLikeCount(detail.count);
      }
    };
    window.addEventListener('yec-like-changed', handleLikeChange);
    return () => window.removeEventListener('yec-like-changed', handleLikeChange);
  }, [carpet.id]);

  const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isAuthInitializing()) return;
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
    if (typeof result.count === 'number') setLikeCount(result.count);
  };

  const formattedNumber = useMemo(() => {
    const abs = Math.abs(Math.round(discountedPrice)).toString();
    return abs.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); // non-breaking space
  }, [discountedPrice]);

  return (
    <article
      onClick={openDetail}
      className="group relative flex flex-col justify-between bg-white rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border border-slate-100"
      style={{
        width: '100%',
        maxWidth: '320px',
        minWidth: '290px',
        padding: '24px', // padding 20-24px
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
      }}
      // Hover styles: translateY(-6px), premium shadow, transition 0.3s
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.08)';
        e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)';
        e.currentTarget.style.borderColor = 'rgba(241, 245, 249, 1)'; // slate-100
      }}
    >
      {/* Image container: Height 360px, object-fit cover */}
      <div className="relative w-full rounded-2xl overflow-hidden mb-5" style={{ height: '360px' }}>
        <img
          src={imageSrc}
          alt={carpet.name}
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
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-md">
            -{discountPercent}%
          </span>
        )}

        {/* Like Button */}
        <button
          type="button"
          onClick={handleLike}
          className={`absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-md transition-colors duration-300 ${
            isLiked
              ? 'border-red-500 bg-red-500 text-white'
              : 'border-white/10 bg-black/40 text-white backdrop-blur-md hover:bg-white hover:text-slate-900'
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          <span className="tabular-nums">{likeCount}</span>
        </button>
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Category Label */}
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
          {carpet.category?.name || 'Kolleksiya'}
        </p>

        {/* Product Name: Max 2 line, ellipsis */}
        <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-snug mb-1 min-h-[2.5rem] select-none">
          {carpet.name}
        </h3>

        {/* Material: Smaller and secondary text */}
        <p className="text-xs text-slate-400 font-medium mb-3">
          Material: {carpet.material || 'Kiritilmagan'}
        </p>

        {/* Price Section: Single line, flex layout */}
        <div className="mt-auto">
          <div
            style={{
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'flex-start',
              gap: '6px',
              flexWrap: 'nowrap',
            }}
            className="mb-4"
          >
            <span
              style={{
                fontSize: '40px', // font-size: 38-42px;
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
              className="text-slate-900 font-extrabold"
            >
              {formattedNumber}
            </span>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
              }}
              className="text-slate-900 font-bold"
            >
              so&apos;m
            </span>
          </div>

          {/* Button: Batafsil, fixed at the bottom */}
          <button
            type="button"
            className="w-full py-3 bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl transition hover:bg-slate-800"
          >
            Batafsil
          </button>
        </div>
      </div>
    </article>
  );
}
