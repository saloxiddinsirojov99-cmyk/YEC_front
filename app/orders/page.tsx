'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice, getErrorMessage } from '@/services/api';
import { formatOrderNumber, formatOrderStatus } from '@/utils/format';
import useScrollLock from '@/hooks/useScrollLock';
import { getToken } from '@/services/auth.service';
import { getMyOrders, cancelOrder, requestReturn } from '@/services/order.service';
import type { Order } from '@/types/order';
import Portal from '@/components/Portal';

function OrdersPageContent() {
  const [mounted, setMounted] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [orderToReturn, setOrderToReturn] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useScrollLock(!!orderToCancel || !!orderToReturn);

  useEffect(() => setMounted(true), []);

  const hasToken = useMemo(() => (mounted ? Boolean(getToken()) : false), [mounted]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const orderRes = await getMyOrders({ page: 1, limit: 20 });
      setOrders(orderRes.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    void fetchData();
  }, [hasToken]);

  if (!hasToken) {
    return (
      <div className="section-shell py-10">
        <div className="panel max-w-xl p-6">
          <h1 className="font-serif text-3xl">Buyurtmalar</h1>
          <p className="mt-2 text-sm text-ink/70">Buyurtma berish uchun avval login qiling.</p>
          <Link href="/login" className="btn-primary mt-4 inline-block">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell space-y-6 py-8">
      <h1 className="font-serif text-4xl text-ink">Buyurtmalar</h1>

      <section className="panel p-6">
        <h2 className="font-serif text-3xl">Mening buyurtmalarim</h2>
        {loading ? (
          <div className="mt-4 h-36 animate-pulse rounded-xl bg-sand" />
        ) : orders.length === 0 ? (
          <p className="mt-3 text-sm text-ink/70">Buyurtmalar hali mavjud emas.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {orders.map((order) => {
              const total = order.items.reduce(
                (sum, item) => sum + Number(item.price) * item.quantity,
                0,
              );

              const statusColor: Record<string, string> = {
                PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                ACCEPTED: 'bg-sky-100 text-sky-800 border-sky-200',
                CUTTING: 'bg-orange-100 text-orange-800 border-orange-200',
                READY_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                ON_WAY: 'bg-purple-100 text-purple-800 border-purple-200',
                DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200',
                CANCELLED: 'bg-red-100 text-red-800 border-red-200',
                CANCEL_REQUESTED: 'bg-rose-100 text-rose-800 border-rose-200',
                RETURN_REQUESTED: 'bg-amber-100 text-amber-800 border-amber-200',
                RETURN_APPROVED: 'bg-green-100 text-green-800 border-green-200',
                RETURN_REJECTED: 'bg-slate-100 text-slate-800 border-slate-200',
                REFUNDED: 'bg-teal-100 text-teal-800 border-teal-200',
              };

              const canCancel = order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'CUTTING' || order.status === 'READY_FOR_DELIVERY';
              
              let canRequestReturn = false;
              if (order.status === 'DELIVERED' && order.deliveryCompletedAt) {
                const elapsedMs = Date.now() - new Date(order.deliveryCompletedAt).getTime();
                const twentyFourHoursMs = 24 * 60 * 60 * 1000;
                canRequestReturn = elapsedMs <= twentyFourHoursMs;
              }

              return (
                <article key={order.id} className="rounded-xl border border-black/10 p-4 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-ink/70">
                      {mounted ? new Date(order.createdAt).toLocaleString('uz-UZ') : ''}
                    </p>
                    <p className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {formatOrderStatus(order.status)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between border-b border-black/5 pb-3 gap-3">
                    <span className="text-sm font-semibold text-ink">
                      #{formatOrderNumber(order.id, order.createdAt)}
                    </span>
                    <div className="flex gap-2">
                      {canCancel && (
                        <button
                          onClick={() => setOrderToCancel(order.id)}
                          className="flex h-8 items-center justify-center rounded-md bg-red-50 px-4 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100"
                        >
                          Bekor qilish
                        </button>
                      )}
                      {canRequestReturn && (
                        <button
                          onClick={() => {
                            setOrderToReturn(order.id);
                            setReturnReason('');
                          }}
                          className="flex h-8 items-center justify-center rounded-md bg-amber-50 px-4 text-xs font-medium text-amber-700 border border-amber-200 shadow-sm transition-colors hover:bg-amber-100"
                        >
                          Qaytarishni so&apos;rash
                        </button>
                      )}
                      <Link href={`/orders/${order.id}`} className="flex h-8 items-center justify-center rounded-md bg-blue-900 px-4 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-800">
                        Ko'rish
                      </Link>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink/80">
                    <strong>Manzil:</strong> {order.address}
                  </p>
                  {order.locationText && (
                    <p className="text-xs text-ink/60">Lokatsiya: {order.locationText}</p>
                  )}
                  {order.paymentMethod && (
                    <p className="text-xs text-ink/60">
                      To&apos;lov: {order.paymentMethod === 'CARD' ? 'Karta' : 'Naqd'}
                    </p>
                  )}
                  {order.status === 'CANCELLED' && order.cancelReason && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      Sabab: {order.cancelReason}
                    </p>
                  )}
                  <div className="mt-3 space-y-2 text-sm border-t border-black/5 pt-3">
                    {order.items.map((item) => {
                      const isRoll = item.carpet?.type === 'ROLL' || !!item.selectedWidthCm;
                      const widthCm = item.selectedWidthCm ?? item.rollAllocation?.widthCm;
                      const lengthCm = item.selectedLengthCm ?? item.rollAllocation?.lengthCm;
                      const carpetName = item.carpetName || item.carpet?.name || item.carpetId;
                      const barcode = item.carpetBarcode || item.carpet?.barcode;
                      
                      return (
                        <div key={item.id} className="flex flex-col gap-1 py-1 border-b border-black/5 last:border-0">
                          <div className="flex justify-between items-start">
                            <span className="text-ink/70 font-medium">
                              {carpetName} 
                              {barcode && (
                                <span className="ml-1 text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-100">
                                  #{barcode}
                                </span>
                              )}
                              <span className="text-[10px] bg-sand px-1.5 py-0.5 rounded ml-1">x{item.quantity}</span>
                            </span>
                            <span className="font-bold text-ink">{formatPrice(Number(item.price) * item.quantity)}</span>
                          </div>
                          
                          {isRoll && widthCm && lengthCm && (
                            <div className="text-[10px] text-ink/50 bg-slate-50 px-2 py-1 rounded flex justify-between mt-0.5">
                              <span>Kesim: {widthCm / 100} m × {lengthCm / 100} m {item.selectedArea && `(${Number(item.selectedArea).toFixed(2)} m²)`}</span>
                              {item.pricePerM2 && <span>1 m²: {formatPrice(Number(item.pricePerM2))}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-right text-sm font-bold text-ink">
                    Jami: <span className="text-terracotta text-lg ml-1">{formatPrice(total)}</span>
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {message ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 animate-in fade-in slide-in-from-top-2">{message}</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-in fade-in slide-in-from-top-2">{error}</p>
      ) : null}

      {/* Cancellation Modal */}
      {orderToCancel && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden border border-white/60">
                <div className="h-2 w-full bg-red-500" />
                <div className="p-8 text-center">
                   <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                   </div>
                   <h4 className="font-serif text-2xl text-ink">Bekor qilish</h4>
                   <p className="mt-3 text-ink/60 leading-relaxed text-sm">
                      Haqiqatan ham ushbu buyurtmani bekor qilmoqchimisiz? Bu amalni ortga qaytarib bo&apos;lmaydi.
                   </p>
                   
                   <div className="mt-8 flex flex-col gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await cancelOrder(orderToCancel);
                            setOrderToCancel(null);
                            setMessage('Buyurtma muvaffaqiyatli bekor qilindi.');
                            void fetchData();
                          } catch (err) {
                            setError(getErrorMessage(err));
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold transition hover:bg-red-700 active:scale-95"
                      >
                        Ha, bekor qilish
                      </button>
                      <button 
                        onClick={() => setOrderToCancel(null)}
                        className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold transition hover:bg-slate-200"
                      >
                        Yo&apos;q, qolsin
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </Portal>
      )}
      {/* Return Request Modal */}
      {orderToReturn && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-sand">
              <h3 className="text-lg font-bold text-ink">Qaytarish so&apos;rovini yuborish</h3>
              <p className="text-xs text-ink/60 mt-1">Yetkazib berilgan mahsulotni qaytarish sababini batafsil yozib qoldiring.</p>
              
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Qaytarish sababini kiriting (masalan: o'lchami to'g'ri kelmadi, sifati yoqmadi...)"
                rows={4}
                className="w-full mt-4 p-3 border border-sand rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 resize-none bg-slate-50 text-ink"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOrderToReturn(null);
                    setReturnReason('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-ink/70 hover:text-ink transition"
                >
                  Orqaga
                </button>
                <button
                  type="button"
                  disabled={!returnReason.trim() || submittingReturn}
                  onClick={async () => {
                    try {
                      setSubmittingReturn(true);
                      await requestReturn(orderToReturn, returnReason);
                      setOrderToReturn(null);
                      setReturnReason('');
                      setMessage('Qaytarish so\'rovi muvaffaqiyatli yuborildi.');
                      void fetchData();
                    } catch (err) {
                      setError(getErrorMessage(err));
                    } finally {
                      setSubmittingReturn(false);
                    }
                  }}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {submittingReturn ? "Yuborilmoqda..." : "So'rovni yuborish"}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return <OrdersPageContent />;
}
