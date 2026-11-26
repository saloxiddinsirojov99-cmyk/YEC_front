'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { getErrorMessage } from '@/services/api';
import {
  requestForgotPassword,
  resetPassword as resetPasswordRequest,
} from '@/services/auth.service';
import { toast } from '@/components/ui/Toast';

const wrapCls =
  'icon-input-wrap flex h-12 items-center overflow-hidden rounded-2xl border border-[#EAE2D3] bg-white transition-all duration-200 focus-within:border-[#D4A853] focus-within:ring-2 focus-within:ring-[#D4A853]/20';

const iconCls = 'pointer-events-none shrink-0 pl-4 pr-2.5 text-[#8C7A5B]';
const labelCls = 'block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get('mode');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [devOtpCode, setDevOtpCode] = useState('');
  const [error, setError] = useState('');

  const handleRequestOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      const msg = "To'g'ri email manzilini kiriting.";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      setDevOtpCode('');

      const data = await requestForgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setMessage(data.message);
      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
      }
      toast.success(data.message || 'Tasdiqlash kodi yuborildi.');
      setStep(2);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || loading) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    try {
      setResending(true);
      setError('');
      const data = await requestForgotPassword(normalizedEmail);
      setMessage(data.message);
      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
      }
      toast.success('Tasdiqlash kodi qayta yuborildi.');
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 4) {
      const msg = 'Tasdiqlash kodini to‘liq kiriting.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword.length < 6) {
      const msg = "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      setError('');

      await resetPasswordRequest({
        email: normalizedEmail,
        otp: cleanOtp,
        newPassword,
      });

      const successMsg =
        "Parol muvaffaqiyatli o'zgartirildi! Kirish sahifasiga yo'naltirilmoqdasiz...";
      setMessage(successMsg);
      toast.success("Parol muvaffaqiyatli o'zgartirildi!");
      setTimeout(() => router.push('/login'), 1800);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-76px)] w-full items-center justify-center bg-[#FAF8F3] px-4 py-8 sm:px-6 sm:py-12">
      <div className="animate-fade-up w-full max-w-[440px] rounded-3xl border border-[#EAE2D3] bg-white p-6 shadow-[0_20px_60px_-15px_rgba(11,20,38,0.08)] sm:p-9">
        {/* Header */}
        <div className="mb-6">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B88428]">
            YEC Market
          </span>
          <h1 className="mt-1.5 font-['Cormorant_Garamond',serif] text-3xl font-bold leading-tight text-[#0B1426] sm:text-4xl">
            {step === 1 ? 'Parolni tiklash' : "Yangi parol o'rnatish"}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#5C6475]">
            {step === 1
              ? 'Hisobingizga ulangan email manzilini kiriting — tasdiqlash kodi yuboriladi.'
              : `${email} manziliga yuborilgan kodni va yangi parolni kiriting.`}
          </p>
        </div>

        {initialMode === 'phone' && step === 1 && (
          <div className="mb-5 rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] px-4 py-3 text-xs leading-relaxed text-[#5C6475]">
            Parolni tiklash kodi hisobingizdagi <strong className="text-[#0B1426]">email manziliga</strong> yuboriladi.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs font-medium text-emerald-800">
            {message}
          </div>
        )}

        {devOtpCode && step === 2 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Test kodi: <strong>{devOtpCode}</strong>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className={labelCls}>
                Email manzil
              </label>
              <div className={wrapCls}>
                <span className={iconCls} aria-hidden="true">
                  <Mail size={18} strokeWidth={1.9} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    if (error) setError('');
                    setEmail(e.target.value);
                  }}
                  className="outline-none placeholder-[#B4A88F] text-[#1A2235]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1426] px-6 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-8px_rgba(11,20,38,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162442] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                'Tasdiqlash kodini yuborish'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-otp" className={labelCls}>
                Tasdiqlash kodi
              </label>
              <div className={wrapCls}>
                <span className={iconCls} aria-hidden="true">
                  <KeyRound size={18} strokeWidth={1.9} />
                </span>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="6 xonali kod"
                  value={otp}
                  onChange={(e) => {
                    if (error) setError('');
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  maxLength={6}
                  className="outline-none placeholder-[#B4A88F] text-[#1A2235] font-mono tracking-[0.3em]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="forgot-new-password" className={labelCls}>
                Yangi parol
              </label>
              <div className={wrapCls}>
                <span className={iconCls} aria-hidden="true">
                  <LockKeyhole size={18} strokeWidth={1.9} />
                </span>
                <input
                  id="forgot-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Kamida 6 ta belgi"
                  value={newPassword}
                  onChange={(e) => {
                    if (error) setError('');
                    setNewPassword(e.target.value);
                  }}
                  minLength={6}
                  className="outline-none placeholder-[#B4A88F] text-[#1A2235]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="shrink-0 pr-4 text-[#7A8291] transition-colors hover:text-[#0B1426] focus:outline-none"
                  aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                >
                  {showPassword ? <EyeOff size={19} strokeWidth={2} /> : <Eye size={19} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || loading}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-[#EAE2D3] bg-white px-4 text-xs font-semibold text-[#4A5366] transition-colors hover:border-[#D4A853] hover:text-[#0B1426] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0B1426] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(11,20,38,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162442] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  'Parolni yangilash'
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
                setMessage('');
                setOtp('');
                setNewPassword('');
                setDevOtpCode('');
              }}
              className="w-full pt-1 text-center text-xs font-medium text-[#5C6475] underline underline-offset-2 hover:text-[#0B1426]"
            >
              Emailni o&apos;zgartirish
            </button>
          </form>
        )}

        <div className="mt-7 border-t border-[#EAE2D3] pt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D96B27] transition-colors hover:text-[#B55216] hover:underline"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            <span>Kirish sahifasiga qaytish</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="flex min-h-[calc(100vh-76px)] w-full items-center justify-center bg-[#FAF8F3] px-4 py-8">
          <div className="w-full max-w-[440px] rounded-3xl border border-[#EAE2D3] bg-white p-8 text-center text-sm text-[#5C6475] shadow-sm">
            Yuklanmoqda...
          </div>
        </section>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
