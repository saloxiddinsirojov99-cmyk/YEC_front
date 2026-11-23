'use client';

import { useEffect, useRef, useState } from 'react';
import AccordionSection from './AccordionSection';
import useScrollLock from '@/hooks/useScrollLock';
import Portal from './Portal';
import type { Carpet } from '@/types/carpet';
import { formatDateOnly } from '@/services/api';
import { getUserFromToken } from '@/services/auth.service';
import { canUseStorage, safeGet } from '@/utils/safeStorage';

type ProductDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  carpet: Carpet;
  isRoll: boolean;
  selectedWidth: number | null;
  lengthM: string;
  lengthCm: string;
};

// Reusable sub-components
export function DeliveryInfo() {
  return (
    <ul className="list-disc pl-4 space-y-2">
      <li>Toshkent shahri bo&apos;ylab tezkor kuryerlik yetkazib berish xizmati.</li>
      <li>Buyurtma tasdiqlangandan so&apos;ng 24 soat ichida yetkaziladi.</li>
      <li>Katta o&apos;lchamli yoki metraj buyurtmalar uchun maxsus transport xizmati ko&apos;rsatiladi.</li>
      <li>Yetkazib berishdan oldin kuryer siz bilan bog&apos;lanadi.</li>
    </ul>
  );
}

export function ReturnPolicy() {
  return (
    <ul className="list-disc pl-4 space-y-2">
      <li>Mahsulot yetkazib berilgandan keyin 24 soat ichida qaytarish uchun murojaat qilish mumkin.</li>
      <li>Metraj gilamlar maxsus o&apos;lchamda kesilganligi sababli, faqat ishlab chiqarish nuqsoni (brak) bo&apos;lgandagina almashtiriladi.</li>
      <li>Qaytariladigan mahsulotlar tovar ko&apos;rinishi va yorliqlari buzilmagan holatda bo&apos;lishi lozim.</li>
    </ul>
  );
}

export function CareInstructions() {
  return (
    <ul className="list-disc pl-4 space-y-2">
      <li>Muntazam ravishda yumshoq cho&apos;tkali changyutgich bilan tozalang.</li>
      <li>Suyuqlik to&apos;kilsa, darhol nam shimuvchi quruq mato bilan arting (ishqalamang).</li>
      <li>Kimyoviy tozalash (ximchistka) tavsiya etiladi.</li>
      <li>Tuklarining yo&apos;nalishi bo&apos;yicha tozalash gilam umrini uzaytiradi.</li>
    </ul>
  );
}

export default function ProductDetailsModal({
  isOpen,
  onClose,
  carpet,
  isRoll,
  selectedWidth,
  lengthM,
  lengthCm,
}: ProductDetailsModalProps) {
  const [activeSection, setActiveSection] = useState<string | null>('dimensions');
  const [isAdminOrSuperAdmin, setIsAdminOrSuperAdmin] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Apply custom scroll lock hook
  useScrollLock(isOpen);

  // Keyboard navigation & Esc key close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      modal.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Deriving specs for material details
  const getSpecs = () => {
    const isTurkish =
      (carpet.category?.name ?? '').toLowerCase().includes('turk') ||
      carpet.name.toLowerCase().includes('turkish') ||
      carpet.name.toLowerCase().includes('istanbul');
    const hasWool =
      carpet.material.toLowerCase().includes('jun') ||
      carpet.material.toLowerCase().includes('wool');

    let pileHeight = '11 mm';
    if (carpet.pileHeight && Number(carpet.pileHeight) > 0) {
      pileHeight = `${carpet.pileHeight} mm`;
    } else if (carpet.material.toLowerCase().includes('micro')) pileHeight = '12 mm';
    else if (hasWool) pileHeight = '10 mm';
    else if (carpet.material.toLowerCase().includes('acrylic')) pileHeight = '14 mm';

    let density = '1 200 000 nuqta/m²';
    if (isTurkish) density = '1 500 000 nuqta/m²';
    else if (hasWool) density = '800 000 nuqta/m²';

    let weight = '2.8 kg/m²';
    if (carpet.weightKg && Number(carpet.weightKg) > 0) {
      weight = `${carpet.weightKg} kg`;
    } else if (hasWool) weight = '3.2 kg/m²';
    else if (carpet.material.toLowerCase().includes('micro')) weight = '2.5 kg/m²';

    const barcodeVal =
      carpet.barcode ||
      (carpet as any).qoShimchaKod ||
      carpet.qo_shimchaKod ||
      (carpet as any).inventoryItems?.[0]?.barcode ||
      carpet.uniqueCode ||
      null;

    return {
      brand: carpet.brand || carpet.category?.name || 'YEC Market',
      model: carpet.name,
      designCode: carpet.designCode || `YEC-${carpet.id.slice(-4).toUpperCase()}`,
      barcode: barcodeVal,
      material: carpet.material,
      pileHeight,
      weavingType: "Mashinada to'qilgan",
      density,
      weight,
      country: isTurkish ? 'Turkiya' : "O'zbekiston",
    };
  };

  const specs = getSpecs();

  // Calculated dimension/area
  const lm = parseInt(lengthM) || 0;
  const lc = parseInt(lengthCm) || 0;
  const totalLengthCm = lm * 100 + lc;
  const areaM2 = selectedWidth ? (selectedWidth * totalLengthCm) / 10000 : 0;

  const toggleSection = (id: string) => {
    setActiveSection((prev) => (prev === id ? null : id));
  };

  return (
    <Portal>
      <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[120] flex items-end md:items-center md:justify-center p-0 md:p-6 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main modal container */}
      <div
        ref={modalRef}
        className="relative w-full h-[85vh] md:h-auto md:max-h-[80vh] md:max-w-[750px] md:w-[750px] bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slideUp md:animate-scaleIn z-10 border border-sand/40"
      >
        {/* Mobile drag handle line */}
        <div className="flex justify-center pt-3 pb-2 md:hidden select-none">
          <div className="w-12 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-sand">
          <h2 id="modal-title" className="font-serif text-lg sm:text-xl font-extrabold text-ink leading-tight pr-8">
            Xarakteristikalar va ma&apos;lumotlar
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Modalni yopish"
            className="w-8 h-8 rounded-full bg-sand/40 hover:bg-sand/80 text-ink flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 select-none active:scale-90 shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content - Only this part scrolls */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          {/* 📏 O'lchamlar */}
          <AccordionSection
            title="📏 O'lchamlar"
            isOpen={activeSection === 'dimensions'}
            onToggle={() => toggleSection('dimensions')}
          >
            {isRoll ? (
              <div className="space-y-2 text-xs sm:text-sm text-ink/75 font-semibold">
                <div className="flex justify-between border-b border-sand pb-1.5">
                  <span className="text-ink/50 font-medium">Tanlangan kenglik:</span>
                  <span className="text-ink font-bold">{selectedWidth ? `${selectedWidth} sm` : '-'}</span>
                </div>
                <div className="flex justify-between border-b border-sand pb-1.5">
                  <span className="text-ink/50 font-medium">Tanlangan uzunlik:</span>
                  <span className="text-ink font-bold">{lengthM && Number(lengthM) > 0 ? `${lengthM} m` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink/50 font-medium">Jami yuzasi:</span>
                  <span className="text-primary font-bold">{areaM2.toFixed(2)} m²</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between text-xs sm:text-sm text-ink/75 font-semibold">
                <span className="text-ink/50 font-medium">Gilam o&apos;lchami:</span>
                <span className="text-ink font-bold">{carpet.size} sm</span>
              </div>
            )}
          </AccordionSection>

          {/* ♻️ Qaytarilgan mahsulot tarixi */}
          {(carpet.type === 'RETURN_ROLL' || carpet.type === 'RETURN_READY') && (
            <AccordionSection
              title="♻️ Qaytarilgan gilam tarixi (Lineage)"
              isOpen={activeSection === 'returnedLineage'}
              onToggle={() => toggleSection('returnedLineage')}
            >
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs sm:text-sm font-semibold text-ink/75">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Holati (Status)</span>
                  <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 inline-block">{(carpet as any).inventoryStatus || 'ACTIVE'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Manba (Source)</span>
                  <span className="font-bold text-ink">{(carpet as any).inventorySource || 'RETURN'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Shtrixkod (Barcode)</span>
                  <span className="font-mono font-bold text-ink">{carpet.barcode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">SKU</span>
                  <span className="font-mono font-bold text-ink">{(carpet as any).sku || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Original xarid sanasi</span>
                  <span className="font-bold text-ink" suppressHydrationWarning>
                    {(carpet as any).originalDeliveredAt ? new Date((carpet as any).originalDeliveredAt).toLocaleDateString('uz-UZ') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Qaytarilgan sana</span>
                  <span className="font-bold text-ink" suppressHydrationWarning>
                    {(carpet as any).returnCreatedAt ? new Date((carpet as any).returnCreatedAt).toLocaleDateString('uz-UZ') : 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Qaytarilish sababi</span>
                  <p className="text-xs italic text-ink/70 mt-1 bg-slate-50 p-2 rounded border border-sand">
                    {(carpet as any).returnedReason || 'N/A'}: {(carpet as any).returnedCondition || ''}
                  </p>
                </div>
              </div>
            </AccordionSection>
          )}

          {/* 📦 Material */}
          <AccordionSection
            title="📦 Material va Xususiyatlar"
            isOpen={activeSection === 'material'}
            onToggle={() => toggleSection('material')}
          >
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs sm:text-sm font-semibold">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Brend</span>
                <span className="font-bold text-ink">{specs.brand}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Model</span>
                <span className="font-bold text-ink">{specs.model}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Gul kodi</span>
                <span className="font-bold text-ink">{specs.designCode}</span>
              </div>
              {specs.barcode && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Shtrix-kod</span>
                  <span className="font-mono font-bold text-ink">{specs.barcode}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Tarkibi</span>
                <span className="font-bold text-ink">{specs.material}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Tuk balandligi</span>
                <span className="font-bold text-ink">{specs.pileHeight}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">To&apos;qilish usuli</span>
                <span className="font-bold text-ink">{specs.weavingType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Zichligi</span>
                <span className="font-bold text-ink">{specs.density}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Og&apos;irligi</span>
                <span className="font-bold text-ink">{specs.weight}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase font-bold text-ink/40 block">Ishlab chiqarilgan davlat</span>
                <span className="font-bold text-ink">{specs.country}</span>
              </div>
              {isAdminOrSuperAdmin && (carpet.createdAt || (carpet as any).created_at) && (
                <div className="col-span-2 border-t border-sand pt-2.5">
                  <span className="text-[10px] uppercase font-bold text-ink/40 block">Yaratilgan sana</span>
                  <span className="font-bold text-ink" suppressHydrationWarning>
                    {formatDateOnly(carpet.createdAt || (carpet as any).created_at)}
                  </span>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* 🚚 Yetkazib berish */}
          <AccordionSection
            title="🚚 Yetkazib berish"
            isOpen={activeSection === 'delivery'}
            onToggle={() => toggleSection('delivery')}
          >
            <DeliveryInfo />
          </AccordionSection>



          {/* ↩️ Qaytarish */}
          <AccordionSection
            title="↩️ Qaytarish shartlari"
            isOpen={activeSection === 'returns'}
            onToggle={() => toggleSection('returns')}
          >
            <ReturnPolicy />
          </AccordionSection>

          {/* 🧼 Parvarish */}
          <AccordionSection
            title="🧼 Parvarishlash yo'riqnomasi"
            isOpen={activeSection === 'care'}
            onToggle={() => toggleSection('care')}
          >
            <CareInstructions />
          </AccordionSection>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-sand bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full md:w-auto py-3 px-8 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-100 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
          >
            Tushunarli
          </button>
        </div>
      </div>

      <style jsx global>{`
        .animate-slideUp {
          animation: slideUp 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-scaleIn {
          animation: scaleIn 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      </div>
    </Portal>
  );
}
