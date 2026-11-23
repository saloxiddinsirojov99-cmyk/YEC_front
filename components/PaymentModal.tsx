'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle2, ChevronRight, Loader2, Sparkles, ShieldCheck, Lock, Smartphone } from 'lucide-react';
import Portal from './Portal';
import { formatPrice } from '@/services/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  isFreeDelivery?: boolean;
  onSuccess: (paymentMethod: 'CLICK' | 'PAYME') => Promise<any>;
}

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  isFreeDelivery = false,
  onSuccess,
}: PaymentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Method & Card, 2: SMS Verification, 3: Success
  const [selectedMethod, setSelectedMethod] = useState<'CLICK' | 'PAYME'>('CLICK');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const depositAmount = useMemo(() => {
    return Math.round(totalAmount * 0.15);
  }, [totalAmount]);

  const remainingAmount = useMemo(() => {
    return totalAmount - depositAmount;
  }, [totalAmount, depositAmount]);

  // Format Card Number (8600 0000 0000 0000)
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
    setCardExpiry(formatted);
  };

  const cardType = useMemo(() => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.startsWith('8600')) return 'UZCARD';
    if (digits.startsWith('9860')) return 'HUMO';
    if (digits.startsWith('4')) return 'VISA';
    if (digits.startsWith('5')) return 'MASTERCARD';
    return 'CARD';
  }, [cardNumber]);

  const handleStartPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCard = cardNumber.replace(/\D/g, '');
    if (rawCard.length < 16) {
      setErrorMsg("Iltimos, 16 xonali karta raqamini to'liq kiriting.");
      return;
    }
    setErrorMsg('');
    setIsProcessing(true);

    // Simulate contacting Click/Payme gateway
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
      setSmsCode('778899'); // Pre-fill sample SMS code for seamless UX
    }, 1200);
  };

  const handleConfirmSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || smsCode.length < 4) {
      setErrorMsg("Iltimos, SMS tasdiqlash kodini kiriting.");
      return;
    }
    setErrorMsg('');
    setIsProcessing(true);

    try {
      // Execute order creation callback
      const res = await onSuccess(selectedMethod);
      setIsProcessing(false);
      if (res && res.checkoutSession) {
        window.location.href = res.checkoutSession.checkoutUrl;
      } else {
        setStep(3);
        setTimeout(() => {
          onClose();
          window.location.href = res?.id ? `/orders/${res.id}` : '/orders';
        }, 1800);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(err?.message || "To'lovni rasmiylashtirishda xatolik yuz berdi.");
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-900 text-white shadow-[0_35px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
              {/* Method Brand Header Line */}
              <div
                className={`h-2.5 w-full transition-colors duration-500 ${
                  selectedMethod === 'CLICK'
                    ? 'bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-600'
                    : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-500'
                }`}
              />

              <div className="p-7 md:p-8">
                {/* Steps Header */}
                <div className="mb-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="text-sky-400 border-b-2 border-sky-400 pb-0.5">1. Karta va Tizim</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span>2. SMS Kodu</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span>3. Qabul Qilindi</span>
                </div>

                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                    <ShieldCheck className="w-3.5 h-3.5" /> 15% Oldindan to'lov
                  </span>
                  <h3 className="mt-2 text-2xl font-serif text-white">To'lov ilovasini tanlang</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Buyurtmani tasdiqlash uchun 15% deposit to'lanadi. Qolgan 85% yetkazilganda to'lanadi.
                  </p>
                </div>

                {/* Amount Summary Box */}
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Umumiy buyurtma:</span>
                    <span className="font-semibold text-slate-200">{formatPrice(totalAmount)}</span>
                  </div>
                  {isFreeDelivery && (
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                      <span>Yetkazib berish:</span>
                      <span className="font-bold">BEPUL (Toshkent 5M+)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Qolgan summa (85% yetkazilganda):</span>
                    <span className="font-semibold text-slate-400">{formatPrice(remainingAmount)}</span>
                  </div>
                  <div className="h-px bg-white/10 my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Oldindan to'lanadi (15%):</span>
                    <span className="text-xl font-black text-amber-400">{formatPrice(depositAmount)}</span>
                  </div>
                </div>

                {/* Payment Gateway Toggle */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CLICK')}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                      selectedMethod === 'CLICK'
                        ? 'border-blue-500 bg-blue-500/15 shadow-[0_0_25px_rgba(59,130,246,0.25)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl font-black tracking-wider text-blue-400">CLICK</span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1">Click Evolution</span>
                    {selectedMethod === 'CLICK' && (
                      <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('PAYME')}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                      selectedMethod === 'PAYME'
                        ? 'border-cyan-400 bg-cyan-400/15 shadow-[0_0_25px_rgba(34,211,238,0.25)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl font-black tracking-wider text-cyan-400">payme</span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1">Payme Gateway</span>
                    {selectedMethod === 'PAYME' && (
                      <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-cyan-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Card Payment Form */}
                <form onSubmit={handleStartPayment} className="space-y-4">
                  {errorMsg && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400 text-center">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Karta raqami (Uzcard / Humo / Visa)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="8600 0000 0000 0000"
                        value={cardNumber}
                        onChange={handleCardChange}
                        required
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3.5 text-base font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                      <span className="absolute right-3.5 top-3.5 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-sky-300">
                        {cardType}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Amal qilish muddati
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        required
                        className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3.5 text-center font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Xavfsizlik
                      </label>
                      <div className="flex h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                        <Lock className="w-3.5 h-3.5" /> 256-bit SSL
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 flex items-center justify-center gap-2 ${
                        selectedMethod === 'CLICK'
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-400/30'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{selectedMethod} shlyuzi bog'lanmoqda...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>15% Oldindan to'lovni bajarish ({formatPrice(depositAmount)})</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isProcessing}
                      className="py-2.5 text-xs text-slate-400 hover:text-white transition text-center"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-900 text-white p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <Smartphone className="w-7 h-7 animate-pulse" />
              </div>

              <h3 className="text-xl font-serif text-white">SMS Tasdiqlash Kodi</h3>
              <p className="text-xs text-slate-400 mt-1.5">
                {selectedMethod} tomonidan kartangizga bog'langan telefon raqamingizga SMS tasdiqlash kodi yuborildi.
              </p>

              <form onSubmit={handleConfirmSms} className="mt-6 space-y-4">
                {errorMsg && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs font-semibold text-red-400">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="778899"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-sky-400/40 bg-slate-950 px-4 py-3.5 text-center text-2xl font-mono font-bold tracking-[0.4em] text-amber-400 placeholder-slate-700 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>

                <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-xs text-slate-300 flex items-center justify-between">
                  <span>To'lanayotgan 15% deposit:</span>
                  <span className="font-bold text-amber-400">{formatPrice(depositAmount)}</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Tasdiqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>To'lovni Tasdiqlash va Yuborish</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-emerald-500/30 bg-slate-900 text-white p-8 text-center shadow-[0_35px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
              <div className="flex justify-center mb-5">
                <div className="rounded-full bg-emerald-500/15 p-4 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-16 h-16 animate-bounce" />
                </div>
              </div>

              <h3 className="text-2xl font-serif text-white">15% Oldindan to'lov qabul qilindi!</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {selectedMethod} orqali <b>{formatPrice(depositAmount)}</b> (15%) deposit muvaffaqiyatli to'landi.
              </p>
              <p className="text-xs text-emerald-400 mt-2 font-semibold">
                Qolgan {formatPrice(remainingAmount)} (85%) yetkazib berilganda qabul qilinadi.
              </p>
              <div className="mt-5 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Portal>
  );
}
