'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, AlertTriangle, Check, Info } from 'lucide-react';
import type { RollInventory } from '@/types/carpet';
import { formatPrice } from '@/services/api';
import { getDiscountedPrice } from '@/utils/price';

interface WidthVariantSelectorProps {
  rollInventories: RollInventory[];
  selectedWidth: number | null;
  onSelectWidth: (width: number | null) => void;
  lengthM: string;
  onChangeLengthM: (val: string) => void;
  lengthCm: string;
  onChangeLengthCm: (val: string) => void;
  discountPercent: number;
}

export default function WidthVariantSelector({
  rollInventories,
  selectedWidth,
  onSelectWidth,
  lengthM,
  onChangeLengthM,
  lengthCm,
  onChangeLengthCm,
  discountPercent,
}: WidthVariantSelectorProps) {
  // Check if all variants are sold out
  const allSoldOut = rollInventories.every((roll) => {
    const available = roll.currentLengthCm - roll.reservedLengthCm;
    return available <= 0;
  });

  const selectedVariant = rollInventories.find((r) => r.widthCm === selectedWidth);
  const totalLengthCm = (parseInt(lengthM) || 0) * 100 + (parseInt(lengthCm) || 0);
  const rollArea = (selectedWidth && totalLengthCm) ? (selectedWidth * totalLengthCm) / 10000 : 0;
  const pricePerM2 = selectedVariant ? Number(selectedVariant.pricePerM2) : 0;
  const rollPrice = Math.round(rollArea * pricePerM2);
  const rollDiscountedPrice = getDiscountedPrice(rollPrice, discountPercent);
  const maxAvailableLengthCm = selectedVariant ? (selectedVariant.currentLengthCm - selectedVariant.reservedLengthCm) : 0;

  return (
    <div className="space-y-6">
      {/* Banner if all variants are sold out */}
      {allSoldOut && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 border border-red-200/50 text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">
            Hozirda ushbu modelning barcha kengliklari tugagan.
          </span>
        </div>
      )}

      {/* Grid wrapper */}
      <div>
        <span className="block text-sm font-bold text-ink/75 mb-3" id="width-variant-label">
          Kenglikni tanlang (Width Variant Selector):
        </span>
        
        <div 
          className="grid gap-3 grid-cols-2 md:grid-cols-3" 
          role="radiogroup" 
          aria-labelledby="width-variant-label"
        >
          {rollInventories.map((roll) => {
            const availableCm = roll.currentLengthCm - roll.reservedLengthCm;
            const availableM = availableCm / 100;
            const isSoldOut = availableCm <= 0;
            const isSelected = selectedWidth === roll.widthCm;
            
            // Status text
            let statusText = '';
            let statusColor = '';
            if (isSoldOut) {
              statusText = '? Tugagan';
              statusColor = 'text-red-500';
            } else if (availableM < 10) {
              statusText = `?? Oxirgi ${availableM.toFixed(2)} m`;
              statusColor = 'text-amber-600 font-bold';
            } else {
              statusText = `?? ${availableM.toFixed(2)} m mavjud`;
              statusColor = 'text-emerald-600 font-medium';
            }

            return (
              <div
                key={roll.id}
                tabIndex={isSoldOut ? -1 : 0}
                role="radio"
                aria-checked={isSelected}
                aria-disabled={isSoldOut}
                aria-label={`${roll.widthCm} sm kenglik, ${isSoldOut ? 'Tugagan' : 'Mavjud'}`}
                onKeyDown={(e) => {
                  if (!isSoldOut && (e.key === ' ' || e.key === 'Enter')) {
                    e.preventDefault();
                    onSelectWidth(roll.widthCm);
                  }
                }}
                onClick={() => {
                  if (!isSoldOut) {
                    onSelectWidth(isSelected ? null : roll.widthCm);
                  }
                }}
                className={`relative overflow-hidden group cursor-pointer flex flex-col justify-between p-4 min-h-[110px] rounded-2xl border bg-white select-none transition-all duration-300 ${
                  isSoldOut
                    ? 'opacity-50 cursor-not-allowed border-slate-200'
                    : isSelected
                      ? 'border-primary ring-2 ring-primary/20 scale-[1.02] shadow-md z-10'
                      : 'border-slate-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Diagonal line if sold out */}
                {isSoldOut && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="100" y2="100" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="1.5" />
                    </svg>
                  </div>
                )}

                {/* Selected Checkmark badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 rounded-full bg-primary text-white p-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Tooltip if sold out */}
                {isSoldOut && (
                  <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all pointer-events-none rounded-lg bg-slate-950 text-white text-[10px] py-1.5 px-2.5 shadow-md">
                    Hozirda ushbu kenglik omborda mavjud emas.
                  </div>
                )}

                <div className="space-y-1">
                  <span className="flex items-center gap-1 text-sm font-extrabold text-ink">
                    <Ruler className="w-4 h-4 text-ink/50" />
                    {roll.widthCm} sm
                  </span>
                  <span className="block text-[11px] text-ink/50 font-bold">
                    1 m�: {formatPrice(Number(roll.pricePerM2))}
                  </span>
                </div>

                <div className={`text-xs mt-2 ${statusColor}`}>
                  {statusText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accordion alternative: Fade + Slide animation block */}
      <AnimatePresence initial={false}>
        {selectedWidth && selectedVariant && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4 shadow-sm">
              <span className="block text-sm font-bold text-ink/75">Uzunlikni kiriting:</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink/60 mb-1.5">Metr:</label>
                  <input
                    type="number"
                    min="0"
                    value={lengthM}
                    onChange={(e) => onChangeLengthM(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/35 text-ink"
                    placeholder="Metr masalan: 5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink/60 mb-1.5">Santimetr:</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={lengthCm}
                    onChange={(e) => onChangeLengthCm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/35 text-ink"
                    placeholder="Santimetr masalan: 51"
                  />
                </div>
              </div>

              {/* Real-time calculations display */}
              <div className="rounded-xl bg-amber-50/20 p-4 border border-amber-200/20 space-y-2 text-xs text-ink/80">
                <p className="flex justify-between items-center">
                  <span>Maksimal mavjud uzunlik:</span>
                  <span className="font-bold text-slate-700">{maxAvailableLengthCm / 100} metr</span>
                </p>
                <p className="flex justify-between items-center">
                  <span>Tanlangan uzunlik:</span>
                  <span className="font-bold text-slate-700">{(totalLengthCm / 100).toFixed(2)} metr</span>
                </p>
                <p className="flex justify-between items-center border-t border-slate-200/50 pt-2 text-sm">
                  <span className="font-bold">Maydon (Area):</span>
                  <span className="font-extrabold text-sky-700">{rollArea.toFixed(3)} m�</span>
                </p>
                <p className="flex justify-between items-center text-sm">
                  <span className="font-bold">Hisoblangan narx:</span>
                  <span className="font-extrabold text-emerald-700">{formatPrice(rollDiscountedPrice)}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
