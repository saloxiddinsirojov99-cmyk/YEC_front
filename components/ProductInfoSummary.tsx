'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';

type ProductInfoSummaryProps = {
  size: string;
  isRoll: boolean;
  selectedWidth: number | null;
  lengthM: string;
  lengthCm: string;
  onShowDetails: () => void;
};

type AvailabilityResponse = {
  dateString: string;
  label: string;
  available: number;
};

export default function ProductInfoSummary({
  size,
  isRoll,
  selectedWidth,
  lengthM,
  lengthCm,
  onShowDetails,
}: ProductInfoSummaryProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [deliveryLabel, setDeliveryLabel] = useState('🟣 Yuklanmoqda...');
  const [deliveryLoading, setDeliveryLoading] = useState(true);

  // Fetch delivery slot availability
  useEffect(() => {
    let active = true;
    const fetchDelivery = async () => {
      try {
        setDeliveryLoading(true);
        const { data } = await api.get<AvailabilityResponse>('/delivery/availability');
        if (active) {
          setDeliveryLabel(data.label);
        }
      } catch (err) {
        console.error('Failed to load delivery availability:', err);
        if (active) {
          setDeliveryLabel('📅 Tez orada yetkaziladi');
        }
      } finally {
        if (active) {
          setDeliveryLoading(false);
        }
      }
    };
    void fetchDelivery();
    return () => {
      active = false;
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);
    onShowDetails();

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  const formatRollSize = () => {
    if (!selectedWidth) return "Kenglik tanlanmagan";
    const lm = parseInt(lengthM) || 0;
    const lc = parseInt(lengthCm) || 0;
    
    let lengthText = "";
    if (lm > 0) lengthText += `${lm} m `;
    if (lc > 0 || lm === 0) lengthText += `${lc} sm`;
    
    return `${selectedWidth} sm × ${lengthText.trim()}`;
  };

  return (
    <div className="mt-6 border-t border-sand pt-6 space-y-5">
      {/* 📏 O'lcham Section */}
      <div className="space-y-1.5">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50 select-none">
          📏 O&apos;lcham
        </h4>
        <div className="text-sm font-semibold text-ink pl-5.5">
          {isRoll ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-ink/40 font-bold uppercase">Metraj:</span>
              <span className="text-base text-primary font-bold">{formatRollSize()}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-ink/40 font-bold uppercase">Tayyor gilam:</span>
              <span className="text-base text-slate-800 font-bold">{size} sm</span>
            </div>
          )}
        </div>
      </div>

      {/* 🚚 Yetkazib berish Section */}
      <div className="space-y-1.5">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50 select-none">
          🚚 Yetkazib berish
        </h4>
        <div className="pl-5.5">
          {deliveryLoading ? (
            <div className="h-6 w-36 bg-sand/30 animate-pulse rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-base text-ink font-bold">{deliveryLabel}</span>
              <span className="text-[10px] text-ink/40 font-semibold">Toshkent shahri bo&apos;ylab yetkazib beriladi</span>
            </div>
          )}
        </div>
      </div>

      {/* ⭐️ Afzalliklari Section */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50 select-none">
          ⭐️ Afzalliklari
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-ink/75 pl-5.5">
          <li className="flex items-center gap-2">
            <span className="text-primary text-[10px] select-none">•</span> Yumshoq va qulay
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary text-[10px] select-none">•</span> Changni kam ushlaydi
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary text-[10px] select-none">•</span> Oqartirmaydi
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary text-[10px] select-none">•</span> Oson tozalanadi
          </li>
          <li className="flex items-center gap-2 sm:col-span-2">
            <span className="text-primary text-[10px] select-none">•</span> Issiqlikni yaxshi saqlaydi
          </li>
        </ul>
      </div>

      {/* 📄 Batafsil Ma'lumot Card */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleCardClick}
          className="group relative w-full flex items-center justify-between p-4.5 rounded-2xl border border-sand bg-white text-left transition-all duration-300 hover:border-primary/30 hover:shadow-md active:shadow-sm overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              style={{
                position: 'absolute',
                borderRadius: '50%',
                backgroundColor: 'rgba(var(--primary-rgb, 219, 139, 48), 0.15)',
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                transform: 'scale(0)',
                animation: 'ripple-anim 600ms ease-out',
                pointerEvents: 'none',
              }}
            />
          ))}

          <div className="flex items-start gap-3.5 z-10">
            <span className="text-2xl mt-0.5 select-none">📄</span>
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-ink group-hover:text-primary transition-colors">
                Batafsil ma&apos;lumot
              </span>
              <p className="text-xs text-ink/40 font-semibold leading-relaxed">
                Mahsulot tavsifi, yetkazib berish, qaytarish va parvarish
              </p>
            </div>
          </div>

          <span className="text-base text-ink/30 group-hover:text-primary group-hover:translate-x-1.5 transition-all duration-300 z-10 select-none">
            →
          </span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes ripple-anim {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
