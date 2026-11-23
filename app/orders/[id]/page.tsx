'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, formatPrice, getErrorMessage } from '@/services/api';
import { formatOrderStatus } from '@/utils/format';
import { getToken } from '@/services/auth.service';
import { getOrderById, confirmOrderDelivery, cancelOrder, requestReturn } from '@/services/order.service';
import type { Order } from '@/types/order';
import Portal from '@/components/Portal';

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

export default function SingleOrderPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = params?.id;
    const id = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

    const [mounted, setMounted] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [submittingReturn, setSubmittingReturn] = useState(false);

    useEffect(() => setMounted(true), []);
    const hasToken = useMemo(() => (mounted ? Boolean(getToken()) : false), [mounted]);

    useEffect(() => {
        if (!id) {
            setError("Buyurtma identifikatori topilmadi.");
            setLoading(false);
            return;
        }

        if (!hasToken) {
            if (mounted) router.push('/login');
            return;
        }

        const fetchOrder = async () => {
            try {
                setLoading(true);
                const data = await getOrderById(id);
                setOrder(data);
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        void fetchOrder();
    }, [id, hasToken, mounted, router]);

    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [returnTimerText, setReturnTimerText] = useState<string>('');
    const [canReturn, setCanReturn] = useState<boolean>(false);

    useEffect(() => {
        if (order?.status !== 'DELIVERED' || !order?.deliveryCompletedAt) return;
        const interval = setInterval(() => {
            const elapsedMs = Date.now() - new Date(order.deliveryCompletedAt!).getTime();
            const twentyFourHoursMs = 24 * 60 * 60 * 1000;
            const remainingMs = twentyFourHoursMs - elapsedMs;

            if (remainingMs <= 0) {
                setCanReturn(false);
                setReturnTimerText('Qaytarish muddati tugagan (Return Window Expired)');
                clearInterval(interval);
            } else {
                setCanReturn(true);
                const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
                setReturnTimerText(`Qaytarish muddati faol: ${hours}s ${minutes}m ${seconds}s qoldi`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [order]);

    const handleConfirm = async () => {
        if (!id) return;
        if (!confirm("Haqiqatdan ham buyurtmani qabul qilib oldingizmi?")) return;
        try {
            await confirmOrderDelivery(id);
            // Refresh order
            const data = await getOrderById(id);
            setOrder(data);
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const handleReturnSubmit = async (data: { reason: string; explanation: string; images?: string[] }) => {
        await api.post(`/orders/${id}/return`, data);
        const updated = await getOrderById(id);
        setOrder(updated);
        alert("Qaytarish so'rovi muvaffaqiyatli yuborildi!");
    };


    if (!mounted) return null;

    if (loading) {
        return (
            <div className="section-shell py-8">
                <div className="h-64 animate-pulse rounded-xl bg-sand" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="section-shell py-8">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                    <h1 className="text-xl font-bold text-red-800">Xatolik yuz berdi</h1>
                    <p className="mt-2 text-red-600">{error || 'Buyurtma topilmadi.'}</p>
                    <Link href="/orders" className="btn-primary mt-6 inline-block">
                        Buyurtmalarga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    const total = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    return (
        <div className="section-shell space-y-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-serif text-3xl text-ink md:text-4xl">Buyurtma tafsilotlari</h1>
                <Link href="/orders" className="btn-outline h-10 px-4">
                    Orqaga
                </Link>
            </div>

            {message ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 animate-in fade-in slide-in-from-top-2">{message}</div>
            ) : null}

            <section className="panel p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6 relative z-10 transition-colors duration-300">
                    <div>
                        <p className="text-sm font-medium text-ink/60 uppercase tracking-widest">Buyurtma sanasi</p>
                        <p className="mt-1 font-bold text-ink text-lg" suppressHydrationWarning>
                            {new Date(order.createdAt).toLocaleString('uz-UZ')}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-ink/60 uppercase tracking-widest mb-1">Holati</p>
                        <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold shadow-sm ${statusColor[order.status] || 'bg-gray-100 text-gray-800'}`}>
                            {formatOrderStatus(order.status)}
                        </span>
                        {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'CUTTING' || order.status === 'READY_FOR_DELIVERY') && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="w-full flex items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200 py-2 text-xs font-bold shadow-sm transition hover:bg-red-100 active:scale-95"
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        )}
                        {order.status === 'ON_WAY' && (
                            <div className="mt-3">
                                <button
                                    onClick={handleConfirm}
                                    className="btn-primary flex w-full items-center justify-center py-2 text-xs font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
                                >
                                    Qabul qildim
                                </button>
                            </div>
                        )}
                        {order.status === 'DELIVERED' && (
                            <div className="mt-3 text-right max-w-[200px] ml-auto">
                                {order.returnRequest ? (
                                    <div className="rounded-lg bg-amber-50 p-2 border border-amber-200 text-xs font-bold text-amber-800 text-center">
                                        Qaytarish so&apos;rovi: {
                                            order.returnRequest.status === 'RETURN_REQUESTED' ? "Ko'rib chiqilmoqda" :
                                            order.returnRequest.status === 'RETURN_UNDER_REVIEW' ? "Tekshirilmoqda" :
                                            order.returnRequest.status === 'RETURN_APPROVED' ? "Tasdiqlangan" :
                                            order.returnRequest.status === 'RETURN_REJECTED' ? "Rad etilgan" :
                                            order.returnRequest.status === 'RETURN_COMPLETED' ? "Yakunlangan" : order.returnRequest.status
                                        }
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-[10px] font-bold text-ink/65 mb-1.5 whitespace-nowrap">{returnTimerText}</p>
                                        {canReturn && (
                                            <button
                                                onClick={() => setIsReturnOpen(true)}
                                                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 text-xs transition active:scale-95 shadow-sm"
                                            >
                                                Qaytarish so&apos;rovi
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {order.status === 'REFUNDED' && (
                    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 font-semibold">
                        Pul muvaffaqiyatli qaytarildi (Refund completed successfully).
                    </div>
                )}

                {/* Order Workflow Timeline */}
                <div className="border-b border-sand py-6">
                    <h3 className="font-serif text-xl text-ink mb-4">Buyurtma tarixi (Timeline)</h3>
                    <div className="relative border-l-2 border-amber-500/35 ml-4 pl-6 space-y-6">
                        {(order as any).auditLogs && (order as any).auditLogs.length > 0 ? (
                            (order as any).auditLogs.map((log: any, idx: number) => (
                                <div key={log.id || idx} className="relative">
                                    <div className="absolute -left-[31px] top-1 bg-amber-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white ring-4 ring-amber-500/10 shadow-sm" />
                                    <div>
                                        <p className="text-sm font-bold text-ink">
                                            {log.action === 'ROLL_RETURN_CONVERTED' ? '♻️ Return converted to inventory' : log.action}
                                        </p>
                                        <p className="text-xs text-ink/60 mt-0.5" suppressHydrationWarning>
                                            {new Date(log.when).toLocaleString('uz-UZ')} &bull; Bajaruvchi: <span className="font-semibold text-amber-600">{log.who}</span>
                                        </p>
                                        {log.reason && (
                                            <p className="text-xs italic text-ink/70 mt-1 bg-sand/20 p-2 rounded border border-sand/40 max-w-md">
                                                Sabab/Izoh: {log.reason}
                                            </p>
                                        )}
                                        {log.action === 'ROLL_RETURN_CONVERTED' && log.newValue && (() => {
                                            try {
                                                const val = JSON.parse(log.newValue);
                                                return (
                                                    <div className="text-xs text-amber-900 mt-2 bg-amber-50/70 border border-amber-200/60 p-3 rounded-2xl max-w-md leading-relaxed shadow-sm">
                                                        <p className="font-bold text-amber-800 mb-1 border-b border-amber-200/50 pb-1">Omborga yangi gilam yozuvi qo&apos;shildi:</p>
                                                        <div><strong>Barcode:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{val.newBarcode}</span></div>
                                                        <div className="mt-1"><strong>SKU:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{val.newSku}</span></div>
                                                        <div className="mt-1"><strong>O&apos;lcham:</strong> {val.area ? `${val.area.toFixed(2)} m²` : ''} ({val.piecePrice ? `${formatPrice(val.piecePrice)}` : ''})</div>
                                                    </div>
                                                );
                                            } catch {
                                                return null;
                                            }
                                        })()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 bg-amber-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white" />
                                <div>
                                    <p className="text-sm font-bold text-ink">Yaratildi</p>
                                    <p className="text-xs text-ink/60 mt-0.5" suppressHydrationWarning>
                                        {new Date(order.createdAt).toLocaleString('uz-UZ')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-8 border-b border-sand py-6 md:grid-cols-2">
                    <div>
                        <h3 className="font-serif text-xl text-ink">Mijoz ma'lumotlari</h3>
                        <ul className="mt-4 space-y-3 text-sm text-ink/80">
                            <li><strong className="text-ink">Ism:</strong> {order.customerName}</li>
                            <li><strong className="text-ink">Telefon 1:</strong> {order.phone}</li>
                            {order.phone2 && (
                                <li><strong className="text-ink">Telefon 2:</strong> {order.phone2}</li>
                            )}
                            {order.comment && (
                                <li className="rounded-lg bg-sand/30 p-3 mt-2"><strong className="text-ink">Izoh:</strong> {order.comment}</li>
                            )}
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-serif text-xl text-ink">Yetkazib berish o'rni</h3>
                        <ul className="mt-4 space-y-3 text-sm text-ink/80">
                            <li><strong className="text-ink">Manzil:</strong> {order.address}</li>
                            {order.locationText && (
                                <li><strong className="text-ink">Lokatsiya izohi:</strong> {order.locationText}</li>
                            )}
                            <li>
                                <strong className="text-ink">To'lov turi:</strong> {order.paymentMethod === 'CARD' ? 'Karta orqali' : 'Naqd pul'}
                            </li>
                        </ul>
                    </div>
                </div>

                {order.status === 'CANCELLED' && order.cancelReason && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                        <h3 className="font-bold text-red-800">Bekor qilinish sababi:</h3>
                        <p className="mt-1 text-red-600">{order.cancelReason}</p>
                    </div>
                )}

                <div className="mt-8">
                    <h3 className="font-serif text-2xl text-ink mb-6">Xarid qilingan gilamlar</h3>
                    <div className="space-y-4">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sand bg-white p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-sand bg-white shadow-sm flex items-center justify-center">
                                        {(item.carpetImage || (item.carpet?.images && item.carpet.images[0])) ? (
                                            <img
                                              src={item.carpetImage || item.carpet?.images?.[0]}
                                              alt={item.carpetName || item.carpet?.name || 'Gilam'}
                                              className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs text-ink/40">Rasm yo'q</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-ink hover:text-primary transition-colors">
                                                {item.carpetName || item.carpet?.name || item.carpetId}
                                            </span>
                                            <Link 
                                              href={`/carpets/${item.carpetId}`}
                                              className="inline-flex items-center justify-center rounded-full bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 transition hover:bg-sky-100 hover:scale-105 active:scale-95 border border-sky-100"
                                            >
                                              Ko&apos;rish
                                            </Link>
                                        </div>
                                        <p className="text-xs text-ink/60 mt-1">
                                            {item.carpet?.size} {item.carpet?.material ? `| ${item.carpet.material}` : ''}
                                            {(item.carpetBarcode || item.carpet?.barcode) ? ` | Shtrixkod: ${item.carpetBarcode || item.carpet?.barcode}` : ''}
                                        </p>
                                        {(item.rollAllocation || item.selectedWidthCm) && (
                                            <p className="text-xs text-primary font-semibold mt-1.5 bg-sky-50/65 px-2.5 py-1 rounded inline-block border border-sky-100/50">
                                                Kesim o&apos;lchamlari: {(item.selectedWidthCm ?? item.rollAllocation?.widthCm) / 100} m × {(item.selectedLengthCm ?? item.rollAllocation?.lengthCm) / 100} m {item.selectedArea && ` (${Number(item.selectedArea).toFixed(2)} m²)`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-ink"><span className="text-ink/50 text-xs">Narxi:</span> {formatPrice(Number(item.price))}</p>
                                    <p className="font-medium text-ink"><span className="text-ink/50 text-xs">Soni:</span> {item.quantity} ta</p>
                                    <p className="font-bold text-primary mt-1"><span className="text-ink/50 text-xs font-medium">Jami:</span> {formatPrice(Number(item.price) * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <div className="rounded-2xl bg-sand/30 p-6 text-right md:min-w-[300px]">
                        <p className="text-sm font-medium text-ink/60">Umumiy hisob:</p>
                        <p className="mt-1 font-serif text-4xl text-terracotta">{formatPrice(total)}</p>
                    </div>
                </div>

            </section>

            <ReturnRequestModal
                isOpen={isReturnOpen}
                onClose={() => setIsReturnOpen(false)}
                onSubmit={handleReturnSubmit}
            />

            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                        <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden border border-sand">
                            <div className="h-2 w-full bg-red-500" />
                            <div className="p-8 text-center">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h4 className="font-serif text-2xl text-ink">Bekor qilish</h4>
                                <p className="mt-3 text-ink/60 leading-relaxed text-sm">
                                    Haqiqatan ham ushbu buyurtmani bekor qilmoqchimisiz?
                                </p>
                                
                                <div className="mt-8 flex flex-col gap-2">
                                    <button 
                                        onClick={async () => {
                                            try {
                                                setLoading(true);
                                                await cancelOrder(id);
                                                setShowCancelModal(false);
                                                setMessage('Buyurtma bekor qilindi / so\'rov yuborildi.');
                                                const updated = await getOrderById(id);
                                                setOrder(updated);
                                            } catch (err) {
                                                alert(getErrorMessage(err));
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold transition hover:bg-red-700 active:scale-95"
                                    >
                                        Ha, bekor qilish
                                    </button>
                                    <button 
                                        onClick={() => setShowCancelModal(false)}
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
        </div>
    );
}

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: string; explanation: string; images?: string[] }) => Promise<void>;
}

function ReturnRequestModal({ isOpen, onClose, onSubmit }: ReturnRequestModalProps) {
  const [reason, setReason] = useState('Sifatli emas / Rangi mos kelmadi');
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      alert('Iltimos, qaytarish sababiga izoh yozing.');
      return;
    }
    setSubmitting(true);
    try {
      const imgArray = imageUrl.trim()
        ? imageUrl.split(',').map((url) => url.trim()).filter((url) => url.length > 0).slice(0, 5)
        : [];
      await onSubmit({
        reason,
        explanation,
        images: imgArray,
      });
      onClose();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 relative text-white">
        <h3 className="font-serif text-xl font-bold border-b border-white/10 pb-3">Mahsulotni qaytarish so&apos;rovi</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Qaytarish sababi:</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
            >
              <option>Sifatli emas / Rangi mos kelmadi</option>
              <option>O&apos;lcham mos kelmadi</option>
              <option>Nusxasi (design) boshqacha</option>
              <option>Ishlab chiqarish nuqsoni (defekt) bor</option>
              <option>Boshqa sabab</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Batafsil izoh:</label>
            <textarea
              required
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              placeholder="Nima sababdan mahsulot sizga to'g'ri kelmaganini yozing..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Rasm URL-lar (vergul bilan ajratilgan, max 5 ta):</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/35"
              placeholder="https://example.com/rasm1.jpg, https://example.com/rasm2.jpg"
            />
          </div>
          
          <div className="pt-2 flex justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-semibold text-slate-400 hover:bg-white/5"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

