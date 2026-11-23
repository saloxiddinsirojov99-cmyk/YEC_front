'use client';

import { useState } from 'react';
import useScrollLock from '@/hooks/useScrollLock';
import { OrderStatus } from '@/types/order';
import { formatOrderNumber, formatOrderStatus } from '@/utils/format';
import Portal from '@/components/Portal';

export type CourierOption = {
  id: string;
  name: string;
  phone: string;
  telegramChatId: string | null;
};

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    status: OrderStatus;
    deliveryDate?: string;
    explanation?: string;
    cancelReason?: string;
    courierId?: string;
  }) => void;
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  orderId: string;
  orderCreatedAt?: string | null;
  couriers?: CourierOption[];
  loading?: boolean;
}

export default function OrderStatusModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  targetStatus,
  orderId,
  orderCreatedAt,
  couriers = [],
  loading = false,
}: OrderStatusModalProps) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [explanation, setExplanation] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [courierId, setCourierId] = useState('');

  useScrollLock(isOpen);

  if (!isOpen) return null;

  // Mode detection: if same status → "info mode" (just send message/date, no status change)
  const isInfoMode = targetStatus === currentStatus;
  // Real status change mode
  const isOnWay = targetStatus === 'ON_WAY' && !isInfoMode;
  const isAccepted = targetStatus === 'ACCEPTED' && !isInfoMode;
  const isCancelled = targetStatus === 'CANCELLED' && !isInfoMode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInfoMode) {
      if (isCancelled && !cancelReason.trim()) {
        alert('Iltimos, bekor qilish sababini kiriting.');
        return;
      }
      if (isOnWay && !courierId) {
        alert('Iltimos, kuryer tanlang.');
        return;
      }
      if (isAccepted && !deliveryDate) {
        alert('Iltimos, yetkazib berish sanasini tanlang.');
        return;
      }
    }
    onConfirm({
      status: targetStatus,
      deliveryDate: deliveryDate || undefined,
      explanation: explanation || undefined,
      cancelReason: cancelReason || undefined,
      courierId: courierId || undefined,
    });
  };

  const modalTitle = isInfoMode
    ? "Xabar / Ma'lumot"
    : "Holatni o'zgartirish";

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl">
          <h2 className="font-serif text-2xl text-ink">{modalTitle}</h2>
          <p className="mt-2 text-sm text-ink/60">
            #<span className="font-mono">{formatOrderNumber(orderId, orderCreatedAt)}</span>
            {isInfoMode ? (
              ' buyurtmaga xabar yoki sanani yangilash'
            ) : (
              <>
                {' holatini '}
                <span className="mx-1 font-bold text-primary">{formatOrderStatus(targetStatus)}</span>
                {" ga o'zgartirmoqdamisiz?"}
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Courier picker — only for ON_WAY status change */}
            {isOnWay && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  Kuryer tanlang <span className="text-red-500">*</span>
                </label>
                {couriers.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
                    ⚠️ Hozircha faol kuryer yo'q. Avval kuryerlarni Telegram botda ro'yxatdan o'tkazing.
                  </div>
                ) : (
                  <select
                    required
                    value={courierId}
                    onChange={(e) => setCourierId(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="" disabled>— Kuryer tanlang —</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.telegramChatId}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}{!c.telegramChatId ? ' — ❌ Telegram yo\'q' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Delivery date — for ACCEPTED status change or info mode */}
            {(isAccepted || isInfoMode) && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  Yetkazib berish sanasini tanlang
                  {isAccepted && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="date"
                  {...(isAccepted ? { required: true } : {})}
                  min={new Date().toISOString().split('T')[0]}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}

            {/* Cancel reason */}
            {isCancelled && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-ink/40">
                  Bekor qilish sababi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nima sababdan bekor qilinmoqda?"
                  className="input-field w-full min-h-[100px]"
                />
              </div>
            )}

            {/* Extra explanation — always shown */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ink/40">
                Qo'shimcha tushuntirish <span className="text-ink/25">(Mijozga Telegram orqali yuboriladi)</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder={isInfoMode ? 'Mijozga yuboriladigan xabar matni...' : 'Masalan: Kechga qarab yetib boramiz...'}
                className="input-field w-full min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-2xl border border-sand py-3 text-sm font-bold text-ink transition hover:bg-sand/50 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary rounded-2xl py-3 text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Yuborilmoqda...
                  </>
                ) : isInfoMode ? (
                  'Yuborish'
                ) : (
                  'Tasdiqlash'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}