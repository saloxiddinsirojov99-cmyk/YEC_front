'use client';

import { useEffect, useState } from 'react';
import { api, formatPrice, getErrorMessage } from '@/services/api';
import { formatOrderNumber, formatOrderStatus } from '@/utils/format';
import type { OrderStatus } from '@/types/order';
import OrderStatusModal, { CourierOption } from '@/components/admin/OrderStatusModal';
import ConfirmStatusChangeModal from '@/components/admin/ConfirmStatusChangeModal';

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  carpet: {
    name: string;
    size: string;
    material: string;
    barcode?: string;
  };
  rollAllocation?: any;
  selectedWidthCm?: number;
  selectedLengthCm?: number;
  selectedArea?: number;
  pricePerM2?: number;
  carpetName?: string;
  carpetBarcode?: string;
};

type Order = {
  id: string;
  customerName: string;
  phone: string;
  phone2?: string | null;
  address: string;
  locationText?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  paymentMethod?: 'CASH' | 'CARD' | 'CLICK' | 'PAYME' | null;
  comment?: string;
  cancelReason?: string | null;
  status: OrderStatus;
  deliveryDate?: string | null;
  explanation?: string | null;
  createdAt: string;
  items: OrderItem[];
  appliedPromoCode?: string | null;
  appliedPromoPercent?: number | null;
  appliedPromoType?: 'DISCOUNT' | 'GIFT' | null;
  appliedPromoGiftName?: string | null;
  appliedPromoGiftImage?: string | null;
  appliedPromoGiftPrice?: number | null;
  
  depositPercent?: number | null;
  depositAmount?: number | null;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'UNPAID' | 'DEPOSIT_REQUIRED' | 'PAYMENT_PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentPaidAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  deliveryCompletedAt?: string | null;
  returnRequest?: any;
  paymentTransactions?: any[];
};



type OrdersResponse = {
  items: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type Stats = {
  usersCount: number;
  carpetsCount: number;
  orders: {
    total: number;
    pending: number;
    accepted: number;
    delivered: number;
    cancelled: number;
  };
};

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: formatOrderStatus('PENDING'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  ACCEPTED: { label: formatOrderStatus('ACCEPTED'), color: 'bg-sky-100 text-sky-800 border-sky-200' },
  CUTTING: { label: formatOrderStatus('CUTTING'), color: 'bg-orange-100 text-orange-800 border-orange-200' },
  READY_FOR_DELIVERY: { label: formatOrderStatus('READY_FOR_DELIVERY'), color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  ON_WAY: { label: formatOrderStatus('ON_WAY'), color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DELIVERED: { label: formatOrderStatus('DELIVERED'), color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  COMPLETED: { label: formatOrderStatus('COMPLETED'), color: 'bg-gray-100 text-gray-800 border-gray-200' },
  CANCELLED: { label: formatOrderStatus('CANCELLED'), color: 'bg-red-100 text-red-800 border-red-200' },
  CANCEL_REQUESTED: { label: formatOrderStatus('CANCEL_REQUESTED'), color: 'bg-rose-100 text-rose-800 border-rose-200' },
  RETURN_REQUESTED: { label: formatOrderStatus('RETURN_REQUESTED'), color: 'bg-amber-100 text-amber-800 border-amber-200' },
  RETURN_APPROVED: { label: formatOrderStatus('RETURN_APPROVED'), color: 'bg-green-100 text-green-800 border-green-200' },
  RETURN_REJECTED: { label: formatOrderStatus('RETURN_REJECTED'), color: 'bg-slate-100 text-slate-800 border-slate-200' },
  REFUNDED: { label: formatOrderStatus('REFUNDED'), color: 'bg-teal-100 text-teal-800 border-teal-200' },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [couriers, setCouriers] = useState<CourierOption[]>([]);

  // Two-step modal flow: confirm then detail
  const [confirmModal, setConfirmModal] = useState<{ id: string; targetStatus: OrderStatus; currentStatus: OrderStatus } | null>(null);
  const [detailModal, setDetailModal] = useState<{ id: string; targetStatus: OrderStatus; currentStatus: OrderStatus } | null>(null);
  const [updatingLoading, setUpdatingLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    void loadStats();
    void loadCouriers();

    const subscribe = async () => {
      try {
        const { subscribeUserToPush } = await import('@/services/notification.service');
        await subscribeUserToPush();
      } catch (e) {
        console.warn('Admin push subscription failed', e);
      }
    };
    void subscribe();
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [statusFilter]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const { data } = await api.get<Stats>('/users/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadCouriers = async () => {
    try {
      const { data } = await api.get<CourierOption[]>('/users/couriers');
      setCouriers(data);
    } catch {
      // ignore
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<OrdersResponse>('/orders', {
        params: {
          page: 1,
          limit: 50,
          status: statusFilter || undefined
        },
      });
      setOrders(data.items);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 1: User selects a new status from dropdown → open confirmation modal
  const handleSelectStatus = (orderId: string, currentStatus: OrderStatus, targetStatus: OrderStatus) => {
    if (targetStatus === currentStatus) return;
    setConfirmModal({ id: orderId, targetStatus, currentStatus });
  };

  // Step 2: User confirms → open detail modal
  const handleConfirmChange = () => {
    if (!confirmModal) return;
    setDetailModal({ id: confirmModal.id, targetStatus: confirmModal.targetStatus, currentStatus: confirmModal.currentStatus });
    setConfirmModal(null);
  };

  // Step 3: User submits detail modal → actual API call
  const handleUpdateStatus = async (data: {
    status: OrderStatus;
    deliveryDate?: string;
    explanation?: string;
    cancelReason?: string;
    courierId?: string;
  }) => {
    if (!detailModal) return;
    setUpdatingLoading(true);
    try {
      await api.patch(`/orders/${detailModal.id}/status`, data);
      setDetailModal(null);
      await loadOrders();
      await loadStats();
      if (data.status === 'ON_WAY') {
        await loadCouriers();
      }
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUpdatingLoading(false);
    }
  };

  // Handle "Xabar / Sana" button click (info mode, no status change)
  const handleInfo = (order: Order) => {
    setDetailModal({ id: order.id, targetStatus: order.status, currentStatus: order.status });
  };

  const handleConfirmRemainingPayment = async (orderId: string) => {
    if (!confirm("Haqiqatan ham qolgan pul to'langanligini tasdiqlaysizmi?")) return;
    try {
      await api.patch(`/orders/${orderId}/confirm-remaining-payment`);
      await loadOrders();
      await loadStats();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleMarkAsCut = async (orderId: string, orderItemId: string) => {
    if (!confirm("Ushbu metraj gilam kesilganligini tasdiqlaysizmi?")) return;
    try {
      await api.patch(`/orders/${orderId}/item/${orderItemId}/cut`);
      await loadOrders();
      alert("Kesish holati tasdiqlandi!");
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleReviewReturn = async (orderId: string, status: 'RETURN_APPROVED' | 'RETURN_REJECTED') => {
    if (!confirm(`Haqiqatan ham ushbu qaytarish so'rovini ${status === 'RETURN_APPROVED' ? 'tasdiqlaysizmi' : 'rad etasizmi'}?`)) return;
    try {
      await api.patch(`/orders/${orderId}/return-review`, { status });
      await loadOrders();
      await loadStats();
      alert("Qaytarish so'rovi holati yangilandi!");
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleReturnAction = async (orderId: string, action: 'RESTOCKED' | 'DISCARDED') => {
    if (!confirm(`Haqiqatan ham ushbu mahsulotni ${action === 'RESTOCKED' ? 'ombordagi joriy uzunlikka qo\'shasizmi' : 'yaroqsizga chiqarib tashlaysizmi'}?`)) return;
    try {
      await api.post(`/orders/${orderId}/return-action`, { action });
      await loadOrders();
      await loadStats();
      alert("Qaytarish jarayoni yakunlandi!");
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };



  if (loading && orders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="section-shell py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-4xl leading-[1.15] text-ink">Buyurtmalar boshqaruvi</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/60 whitespace-nowrap">Holati:</span>
          <select
            className="input-field py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Barchasi</option>
            <option value="PENDING">{formatOrderStatus('PENDING')}</option>
            <option value="ACCEPTED">{formatOrderStatus('ACCEPTED')}</option>
            <option value="ON_WAY">{formatOrderStatus('ON_WAY')}</option>
            <option value="DELIVERED">{formatOrderStatus('DELIVERED')}</option>
            <option value="CANCELLED">{formatOrderStatus('CANCELLED')}</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`panel border-amber-200 bg-amber-50/30 p-4 transition-all duration-300 ${statusFilter === 'PENDING' ? 'ring-2 ring-amber-500' : 'cursor-pointer hover:ring-1 hover:ring-amber-300'}`} onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')}>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Kutilmoqda</p>
          <p className={`mt-1 text-2xl font-bold text-ink ${statsLoading ? 'animate-pulse' : ''}`}>{statsLoading ? '...' : stats?.orders.pending ?? '-'}</p>
        </div>
        <div className={`panel border-blue-200 bg-blue-50/30 p-4 transition-all duration-300 ${statusFilter === 'ACCEPTED' ? 'ring-2 ring-blue-500' : 'cursor-pointer hover:ring-1 hover:ring-blue-300'}`} onClick={() => setStatusFilter(statusFilter === 'ACCEPTED' ? '' : 'ACCEPTED')}>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Qabul qilindi</p>
          <p className={`mt-1 text-2xl font-bold text-ink ${statsLoading ? 'animate-pulse' : ''}`}>{statsLoading ? '...' : stats?.orders.accepted ?? '-'}</p>
        </div>
        <div className={`panel border-emerald-200 bg-emerald-50/30 p-4 transition-all duration-300 ${statusFilter === 'DELIVERED' ? 'ring-2 ring-emerald-500' : 'cursor-pointer hover:ring-1 hover:ring-emerald-300'}`} onClick={() => setStatusFilter(statusFilter === 'DELIVERED' ? '' : 'DELIVERED')}>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Yetkazildi</p>
          <p className={`mt-1 text-2xl font-bold text-ink ${statsLoading ? 'animate-pulse' : ''}`}>{statsLoading ? '...' : stats?.orders.delivered ?? '-'}</p>
        </div>
        <div className={`panel border-red-200 bg-red-50/30 p-4 transition-all duration-300 ${statusFilter === 'CANCELLED' ? 'ring-2 ring-red-500' : 'cursor-pointer hover:ring-1 hover:ring-red-300'}`} onClick={() => setStatusFilter(statusFilter === 'CANCELLED' ? '' : 'CANCELLED')}>
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">Bekor qilindi</p>
          <p className={`mt-1 text-2xl font-bold text-ink ${statsLoading ? 'animate-pulse' : ''}`}>{statsLoading ? '...' : stats?.orders.cancelled ?? '-'}</p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mt-6 space-y-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-ink/40">Hozircha buyurtmalar yo'q.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="panel group overflow-hidden border-sand-dark/10 border-l-[8px] border-l-black shadow-[rgba(37,99,235,0.14)_20px_0_60px_-15px] transition-all hover:shadow-[rgba(37,99,235,0.2)_25px_0_70px_-10px]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand bg-sand/30 p-5 group-hover:bg-sand/40 transition-colors">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">ID</p>
                    <p className="text-sm font-mono font-bold text-ink">#{formatOrderNumber(order.id, order.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/30">Sana</p>
                    <p className="text-sm font-medium text-ink" suppressHydrationWarning>
                      {mounted ? new Date(order.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleInfo(order)}
                    className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 hover:bg-primary/5 transition"
                  >
                    Xabar / Sana
                  </button>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMap[order.status].color}`}>
                    {statusMap[order.status].label}
                  </span>

                  <select
                    className="input-field py-1 text-xs disabled:opacity-50 disabled:bg-gray-50"
                    value={order.status}
                    disabled={order.status === 'DELIVERED' || order.status === 'CANCELLED'}
                    onChange={(e) => {
                      const nextStatus = e.target.value as OrderStatus;
                      if (nextStatus === order.status) return;
                      handleSelectStatus(order.id, order.status, nextStatus);
                    }}
                  >
                    <option value={order.status} disabled>{formatOrderStatus(order.status)}</option>
                    {order.status === 'PENDING' && <option value="ACCEPTED">Qabul qilish</option>}
                    {order.status === 'PENDING' && <option value="CANCELLED">Bekor qilish</option>}
                    {order.status === 'ACCEPTED' && <option value="ON_WAY">Yo&apos;lda (Yetkazib berish)</option>}
                    {order.status === 'ACCEPTED' && <option value="CANCELLED">Bekor qilish</option>}
                    {order.status === 'ON_WAY' && <option value="DELIVERED">Yetkazildi ✓</option>}
                    {order.status === 'ON_WAY' && <option value="CANCELLED">Bekor qilish</option>}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 p-4 md:grid-cols-3">

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink/40">Mijoz ma'lumotlari</h3>
                  <div className="mt-2 space-y-1">
                    <p className="font-semibold text-ink">{order.customerName}</p>
                    <p className="text-sm text-ink/75">Tel 1: {order.phone}</p>
                    {order.phone2 ? <p className="text-sm text-ink/75">Tel 2: {order.phone2}</p> : null}
                    {order.deliveryDate && (
                      <p className="text-sm font-bold text-primary" suppressHydrationWarning>
                        Yetkazib berish sanasi: {mounted ? new Date(order.deliveryDate).toLocaleDateString('uz-UZ') : '--'}
                      </p>
                    )}
                    <p className="text-sm text-ink/75">{order.address}</p>
                    {order.locationText && <p className="text-xs text-ink/60">Lokatsiya: {order.locationText}</p>}
                    {order.paymentMethod && (
                      <p className="text-xs text-ink/60">To'lov: {order.paymentMethod === 'CARD' ? 'Karta' : 'Naqd'}</p>
                    )}
                    {order.comment && (
                      <p className="mt-2 rounded-lg bg-sand/30 p-2 text-xs italic text-ink/60">"{order.comment}"</p>
                    )}
                    {order.appliedPromoCode && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
                        Promokod: {order.appliedPromoCode}
                        {order.appliedPromoType === 'DISCOUNT' && order.appliedPromoPercent ? ` (-${order.appliedPromoPercent}%)` : ''}
                        {order.appliedPromoType === 'GIFT' && order.appliedPromoGiftName
                          ? ` | Sovg'a: ${order.appliedPromoGiftName} (${formatPrice(order.appliedPromoGiftPrice ?? 0)})`
                          : ''}
                      </div>
                    )}
                    {order.status === 'CANCELLED' && order.cancelReason && (
                      <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">Sabab: {order.cancelReason}</p>
                    )}
                  </div>
                </div>

                {/* To'lov ma'lumotlari (Payment Card) */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink/40">To'lov ma'lumotlari</h3>
                  <div className="mt-2 space-y-1.5 text-sm text-ink/85">
                    <p className="flex justify-between border-b border-sand/50 pb-1">
                      <span className="text-ink/65">Umumiy summa:</span>
                      <span className="font-bold">{formatPrice(order.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}</span>
                    </p>
                    <p className="flex justify-between border-b border-sand/50 pb-1">
                      <span className="text-ink/65">Deposit foizi:</span>
                      <span className="font-semibold text-sky-600">{order.depositPercent ?? 0}%</span>
                    </p>
                    <p className="flex justify-between border-b border-sand/50 pb-1">
                      <span className="text-ink/65">To'langan deposit:</span>
                      <span className="font-semibold text-emerald-700">{formatPrice(order.paidAmount ?? 0)}</span>
                    </p>
                    <p className="flex justify-between border-b border-sand/50 pb-1">
                      <span className="text-ink/65">Qolgan summa:</span>
                      <span className="font-bold text-amber-600">{formatPrice(order.remainingAmount ?? 0)}</span>
                    </p>
                    <p className="flex justify-between border-b border-sand/50 pb-1">
                      <span className="text-ink/65">To'lov usuli:</span>
                      <span className="font-semibold">{order.paymentMethod ?? 'Noma\'lum'}</span>
                    </p>
                    <p className="flex justify-between border-b border-sand/50 pb-1">
                      <span className="text-ink/65">To'lov holati:</span>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        order.paymentStatus === 'FULLY_PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {order.paymentStatus === 'FULLY_PAID' && 'To\'liq to\'langan'}
                        {order.paymentStatus === 'PARTIALLY_PAID' && 'Qisman to\'langan'}
                        {order.paymentStatus === 'UNPAID' && 'To\'lanmagan'}
                        {order.paymentStatus === 'REFUNDED' && 'Qaytarilgan'}
                      </span>
                    </p>
                    {order.paymentPaidAt && (
                      <p className="text-xs text-ink/50" suppressHydrationWarning>
                        To'lov sanasi: {mounted ? new Date(order.paymentPaidAt).toLocaleString('uz-UZ') : '--'}
                      </p>
                    )}

                    {/* Payment transactions log */}
                    {order.paymentTransactions && order.paymentTransactions.length > 0 && (
                      <div className="mt-4 border-t border-sand/50 pt-3 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-ink/40">Tranzaksiyalar tarixi</p>
                        {order.paymentTransactions.map((tx: any) => (
                          <div key={tx.id} className="rounded-lg bg-sand/30 p-2.5 text-xs space-y-1">
                            <div className="flex justify-between font-semibold">
                              <span className="text-slate-600">{tx.provider} ({tx.paymentType})</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                                tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>{tx.status}</span>
                            </div>
                            <p className="text-ink/75 font-mono">ID: {tx.transactionId}</p>
                            <p className="text-ink/65 font-medium">Summa: {formatPrice(Number(tx.amount))}</p>
                            {tx.paidAt && (
                              <p className="text-[10px] text-ink/50" suppressHydrationWarning>
                                Sana: {mounted ? new Date(tx.paidAt).toLocaleString('uz-UZ') : '--'}
                              </p>
                            )}
                            {tx.failureReason && (
                              <p className="text-[10px] text-red-500 font-medium">Sabab: {tx.failureReason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {order.cancelledAt && (
                      <div className="mt-2 text-xs text-red-600">
                        <p suppressHydrationWarning>Bekor qilingan: {mounted ? new Date(order.cancelledAt).toLocaleString('uz-UZ') : '--'}</p>
                        <p>Tomonidan: {order.cancelledBy === 'CUSTOMER' ? 'Mijoz' : 'Admin'}</p>
                      </div>
                    )}
                    
                    {order.paymentStatus !== 'FULLY_PAID' && order.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmRemainingPayment(order.id)}
                        className="mt-3 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 text-xs transition active:scale-95 shadow-sm"
                      >
                        ✓ Qolgan pul to'landi
                      </button>
                    )}

                    {order.status === 'DELIVERED' && order.deliveryCompletedAt && (
                      <div className="mt-3 text-xs border-t border-sand/50 pt-2 text-ink/75 space-y-1">
                        <p suppressHydrationWarning>Yetkazilgan vaqt: {mounted ? new Date(order.deliveryCompletedAt).toLocaleString('uz-UZ') : '--'}</p>
                        {(() => {
                          const elapsedMs = Date.now() - new Date(order.deliveryCompletedAt).getTime();
                          const remainingMs = 24 * 60 * 60 * 1000 - elapsedMs;
                          if (remainingMs <= 0) {
                            return <p className="text-red-600 font-bold">Qaytarish muddati tugagan (24s o'tgan)</p>;
                          } else {
                            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
                            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                            return <p className="text-emerald-700 font-semibold">Qaytarish muddati faol: {hours}s {minutes}m qoldi</p>;
                          }
                        })()}
                      </div>
                    )}

                    {order.returnRequest && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2 text-xs">
                        <h4 className="font-bold text-amber-900">Qaytarish so&apos;rovi (Return Request)</h4>
                        <p><strong>Sababi:</strong> {order.returnRequest.reason}</p>
                        <p><strong>Izoh:</strong> {order.returnRequest.explanation}</p>
                        {order.returnRequest.images && order.returnRequest.images.length > 0 && (
                          <div>
                            <strong>Rasm:</strong>
                            <img src={order.returnRequest.images[0]} alt="Return request" className="mt-1 max-h-32 object-contain rounded border border-sand" />
                          </div>
                        )}
                        <p><strong>Holati:</strong> <span className="font-bold text-slate-700">{
                          order.returnRequest.status === 'RETURN_REQUESTED' ? 'Yuborilgan' :
                          order.returnRequest.status === 'RETURN_UNDER_REVIEW' ? 'Ko\'rib chiqilmoqda' :
                          order.returnRequest.status === 'RETURN_APPROVED' ? 'Tasdiqlangan' :
                          order.returnRequest.status === 'RETURN_REJECTED' ? 'Rad etilgan' :
                          order.returnRequest.status === 'RETURN_COMPLETED' ? 'Yakunlangan' : order.returnRequest.status
                        }</span></p>
                        
                        {(order.returnRequest.status === 'RETURN_REQUESTED' || order.returnRequest.status === 'RETURN_UNDER_REVIEW') && (
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => handleReviewReturn(order.id, 'RETURN_APPROVED')}
                              className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 transition active:scale-95"
                            >
                              Tasdiqlash
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewReturn(order.id, 'RETURN_REJECTED')}
                              className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 transition active:scale-95"
                            >
                              Rad etish
                            </button>
                          </div>
                        )}

                        {order.returnRequest.status === 'RETURN_APPROVED' && (
                          <div className="flex flex-col gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={() => handleReturnAction(order.id, 'RESTOCKED')}
                              className="w-full rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1.5 transition active:scale-95 text-center"
                            >
                              Omborga qaytarish (RESTOCKED)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReturnAction(order.id, 'DISCARDED')}
                              className="w-full rounded-lg bg-slate-500 hover:bg-slate-600 text-white font-bold py-1.5 transition active:scale-95 text-center"
                            >
                              Yaroqsizga chiqarish (DISCARDED)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>


                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink/40">Mahsulotlar</h3>
                  <div className="mt-2 divide-y divide-sand">
                    {order.items.map((item) => {
                      const carpetName = item.carpetName || item.carpet?.name || "O'chirilgan mahsulot";
                      const barcode = item.carpetBarcode || item.carpet?.barcode;
                      
                      return (
                        <div key={item.id} className="py-2 border-b border-sand/40 last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-ink">
                                {carpetName}
                                {barcode && (
                                  <span className="ml-2 text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                                    #{barcode}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-ink/60">{item.carpet ? `${item.carpet.size} | ${item.carpet.material}` : "Ma'lumotlar yo'q"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">{formatPrice(item.price)}</p>
                              <p className="text-xs text-ink/40">{item.quantity} dona</p>
                            </div>
                          </div>

                        {/* Metraj (ROLL) Gilam Kesim Ma'lumotlari */}
                        {(item.rollAllocation || item.selectedWidthCm) && (
                          <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col gap-1.5 text-xs text-ink/80">
                            <div className="flex justify-between items-center">
                              <span>
                                Metraj: <strong className="text-slate-800">
                                  {(item.selectedWidthCm ?? item.rollAllocation?.widthCm)}sm × {(item.selectedLengthCm ?? item.rollAllocation?.lengthCm)}sm
                                  {item.selectedArea && ` (${Number(item.selectedArea).toFixed(2)} m²)`}
                                </strong>
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.rollAllocation?.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                                item.rollAllocation?.status === 'CUTTING' ? 'bg-blue-100 text-blue-800' :
                                item.rollAllocation?.status === 'CUT' ? 'bg-green-100 text-green-800' :
                                item.rollAllocation?.status === 'DELIVERED' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {item.rollAllocation?.status || 'Noma\'lum'}
                              </span>
                            </div>
                            
                            {item.rollAllocation?.status === 'CUTTING' && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsCut(order.id, item.id)}
                                className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1.5 rounded-lg transition text-[11px]"
                              >
                                ✂ Kesish yakunlandi (CUT)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    <div className="mt-2 pt-2 flex items-center justify-between border-t border-sand">
                      <p className="font-bold text-ink">Jami:</p>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(order.items.reduce((acc, item) => acc + item.price * item.quantity, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Step 1: Confirmation modal */}
      {confirmModal && orders.find(o => o.id === confirmModal.id) && (() => {
        const order = orders.find(o => o.id === confirmModal.id)!;
        return (
          <ConfirmStatusChangeModal
            isOpen={true}
            onClose={() => setConfirmModal(null)}
            onConfirm={handleConfirmChange}
            orderId={confirmModal.id}
            customerName={order.customerName}
            totalAmount={order.items.reduce((acc, item) => acc + item.price * item.quantity, 0)}
            currentStatus={confirmModal.currentStatus}
            targetStatus={confirmModal.targetStatus}
            orderCreatedAt={order.createdAt}
          />
        );
      })()}

      {/* Step 2: Detail modal */}
      <OrderStatusModal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        onConfirm={handleUpdateStatus}
        orderId={detailModal?.id ?? ''}
        orderCreatedAt={detailModal ? (orders.find((o) => o.id === detailModal.id)?.createdAt ?? null) : null}
        currentStatus={detailModal?.currentStatus ?? 'PENDING'}
        targetStatus={detailModal?.targetStatus ?? 'PENDING'}
        couriers={couriers}
        loading={updatingLoading}
      />
    </div>
  );
}