'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle2, ChevronRight, Loader2, Sparkles, AlertCircle, RefreshCw, XCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { formatPrice } from '@/services/api';
import Link from 'next/link';

interface OrderDetails {
  id: string;
  customerName: string;
  totalAmount?: number;
  paidAmount: number | string;
  remainingAmount: number | string;
  depositAmount: number | string;
  depositPercent: number;
  paymentStatus: string;
  status: string;
  paymentMethod: string;
  phone: string;
  createdAt: string;
}

export default function CheckoutPaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams ? searchParams.get('orderId') : null;
  const transactionId = searchParams ? searchParams.get('transactionId') : null;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // Compute calculated amounts locally for safety
  const orderTotal = useMemo(() => {
    if (!order) return 0;
    const paid = Number(order.paidAmount || 0);
    const rem = Number(order.remainingAmount || 0);
    return paid + rem;
  }, [order]);

  const depositAmt = useMemo(() => {
    if (!order) return 0;
    return Number(order.depositAmount || 0);
  }, [order]);

  const remainingAmt = useMemo(() => {
    if (!order) return 0;
    return Number(order.remainingAmount || 0);
  }, [order]);

  const isDev = useMemo(() => {
    return process.env.NODE_ENV === 'development';
  }, []);

  const fetchOrderStatus = async (showLoader = false) => {
    if (!orderId) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load order:', err);
      setError("Buyurtma tafsilotlarini yuklab bo'lmadi.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Poll order status
  useEffect(() => {
    fetchOrderStatus(true);
    const interval = setInterval(() => {
      fetchOrderStatus(false);
    }, 3000);
    setPollInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId]);

  // Handle mock payment simulation (dev mode only)
  const handleSimulatePayment = async (provider: 'CLICK' | 'PAYME', status: 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'TIMEOUT') => {
    if (!orderId || !transactionId) return;
    setIsSimulating(true);
    setSimStatus(null);
    try {
      if (provider === 'CLICK') {
        const payload = {
          orderId,
          transactionId,
          amount: depositAmt,
          status,
          failureReason: status !== 'SUCCESS' ? `Simulated failure status: ${status}` : undefined,
        };
        await api.post('/payment-webhooks/click', payload, {
          headers: {
            'click-signature': 'bypass-mock-signature',
          },
        });
      } else {
        const payload = {
          orderId,
          transactionId,
          amount: depositAmt,
          status,
          failureReason: status !== 'SUCCESS' ? `Simulated failure status: ${status}` : undefined,
        };
        await api.post('/payment-webhooks/payme', payload, {
          headers: {
            'authorization': 'Basic bypass-mock-password',
          },
        });
      }
      setSimStatus(`Simulyatsiya bajarildi: ${status}`);
      // Re-fetch order status immediately
      await fetchOrderStatus(false);
    } catch (err: any) {
      console.error('Simulation request failed:', err);
      alert("Simulyatsiya so'rovida xatolik yuz berdi.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRealRedirect = (provider: 'CLICK' | 'PAYME') => {
    alert(`Production rejimida ushbu havola ${provider} to'lov sahifasiga yo'naltiradi.`);
  };

  const isDepositPaid = order?.paymentStatus === 'PARTIALLY_PAID' || order?.paymentStatus === 'PAID' || order?.paymentStatus === 'FULLY_PAID';
  const isFailed = order?.paymentStatus === 'FAILED';

  if (loading && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <p className="text-slate-400 text-sm">To'lov sahifasi yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-slate-900/50 p-8 text-center backdrop-blur-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold">Xatolik yuz berdi</h3>
          <p className="text-slate-400 text-sm mt-2">{error || "Buyurtma ID si topilmadi."}</p>
          <Link href="/orders" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition">
            <ArrowLeft className="w-4 h-4" />
            Mening buyurtmalarimga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-6">
        <AnimatePresence mode="wait">
          {isDepositPaid ? (
            <motion.div
              key="success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-slate-900/40 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl relative"
            >
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-emerald-500/10 p-5 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-16 h-16 animate-bounce" />
                </div>
              </div>

              <h2 className="text-3xl font-serif text-white">Sizning depozitingiz muvaffaqiyatli qabul qilindi.</h2>
              <p className="text-sm text-slate-400 mt-4 leading-relaxed font-sans">
                Buyurtma #{(orderId || '').substring(0, 8).toUpperCase()} uchun to'lov qabul qilindi. Tez orada buyurtmangiz qayta ishlanib yetkazishga tayyorlanadi.
              </p>

              <div className="my-6 rounded-2xl bg-white/5 p-4 text-xs text-slate-400 space-y-2 text-left font-sans">
                <div className="flex justify-between">
                  <span>To'lov holati:</span>
                  <span className="font-bold text-emerald-400">{order?.paymentStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>Buyurtma holati:</span>
                  <span className="font-bold text-sky-400">{order?.status}</span>
                </div>
              </div>

              <Link
                href="/orders"
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-[0_15px_40px_rgba(16,185,129,0.3)] transition hover:-translate-y-0.5 active:translate-y-0 font-sans"
              >
                Buyurtmalarimga o'tish
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="checkout"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/30 p-8 shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl relative"
            >
              <div className="h-2 w-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 absolute top-0 left-0" />
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-wide">Buyurtma To'lovi</h2>
                <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider font-semibold">
                  Buyurtma ID: #{(orderId || '').substring(0, 8).toUpperCase()}
                </p>
              </div>

              {isFailed && (
                <div className="mb-6 flex items-center gap-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span>Avvalgi to'lov urinishi bekor qilindi yoki rad etildi. Qayta urinib ko'ring.</span>
                </div>
              )}

              {/* Amount Breakdown Summary */}
              <div className="mb-8 rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3.5 font-sans">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Umumiy buyurtma summasi:</span>
                  <span className="font-semibold text-slate-200">{formatPrice(orderTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Talab qilingan depozit ({order?.depositPercent}%):</span>
                  <span className="font-bold text-amber-400">{formatPrice(depositAmt)}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Depozitdan keyin qoladigan qoldiq:</span>
                  <span className="font-semibold text-sky-400">{formatPrice(remainingAmt)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">To'lov tizimlari orqali to'lash:</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => isDev ? handleSimulatePayment('CLICK', 'SUCCESS') : handleRealRedirect('CLICK')}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-sky-500/40 transition-all duration-300 group"
                  >
                    <span className="text-lg font-black tracking-wide text-sky-400 group-hover:scale-105 transition-transform">CLICK</span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1 font-sans">Online to'lov</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => isDev ? handleSimulatePayment('PAYME', 'SUCCESS') : handleRealRedirect('PAYME')}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition-all duration-300 group"
                  >
                    <span className="text-lg font-black tracking-wide text-cyan-400 group-hover:scale-105 transition-transform">PAYME</span>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1 font-sans">Online to'lov</span>
                  </button>
                </div>
              </div>

              {/* Dev mode webhook simulation suite */}
              {isDev && (
                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider font-sans">
                    <Sparkles className="w-4 h-4" />
                    <span>Dev Webhook Simulator (Faqat localda ko'rinadi)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-white/80 font-sans">
                    <button
                      onClick={() => handleSimulatePayment('CLICK', 'FAILED')}
                      disabled={isSimulating}
                      className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-center transition disabled:opacity-50"
                    >
                      Click FAILED simulation
                    </button>
                    <button
                      onClick={() => handleSimulatePayment('PAYME', 'FAILED')}
                      disabled={isSimulating}
                      className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-center transition disabled:opacity-50"
                    >
                      Payme FAILED simulation
                    </button>
                    <button
                      onClick={() => handleSimulatePayment('CLICK', 'EXPIRED')}
                      disabled={isSimulating}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-center transition disabled:opacity-50"
                    >
                      Click EXPIRED simulation
                    </button>
                    <button
                      onClick={() => handleSimulatePayment('PAYME', 'CANCELLED')}
                      disabled={isSimulating}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-center transition disabled:opacity-50"
                    >
                      Payme CANCELLED simulation
                    </button>
                  </div>

                  {simStatus && (
                    <div className="rounded-xl bg-slate-950 border border-white/5 p-3 text-xs text-sky-400 text-center font-mono">
                      {simStatus}
                    </div>
                  )}

                  {isSimulating && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-sans">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      <span>Webhook signaturalari simulyatsiya qilinmoqda...</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
