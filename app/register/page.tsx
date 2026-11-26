'use client';

import Link from 'next/link';
import { Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/services/api';
import {
  getGoogleLoginUrl,
  requestPhoneOtp,
  requestRegisterOtp,
  saveTokens,
  verifyPhoneOtp,
  verifyRegisterOtp,
} from '@/services/auth.service';
import { formatPhoneNumber, normalizePhoneNumber } from '@/utils/format';

type EmailStep = 'register' | 'verify' | 'done';
type SmsStep = 'request' | 'verify';
type AuthMode = 'sms' | 'email';

export default function RegisterPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('sms');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+998');

  const [emailStep, setEmailStep] = useState<EmailStep>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [emailDevOtpCode, setEmailDevOtpCode] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResending, setEmailResending] = useState(false);

  const [smsStep, setSmsStep] = useState<SmsStep>('request');
  const [smsOtp, setSmsOtp] = useState('');
  const [smsPassword, setSmsPassword] = useState('');
  const [showSmsPassword, setShowSmsPassword] = useState(false);
  const [smsDevOtpCode, setSmsDevOtpCode] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResending, setSmsResending] = useState(false);

  const [error, setError] = useState('');
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleLoginUrl = getGoogleLoginUrl();

  const showError = (message: string) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setError(message);
    const duration = Math.min(15000, 7000 + Math.floor(message.length / 50) * 1000);
    errorTimeoutRef.current = setTimeout(() => setError(''), duration);
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(event.target.value));
  };

  const handleNameChange = (value: string, setter: (v: string) => void) => {
    let sanitized = value.replace(/[^a-zA-Zа-яА-ЯёЁҒғҚқҲҳЎўҮүҲ]/g, '');
    if (sanitized.length > 0) {
      sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
    }
    setter(sanitized);
  };

  /* ─── Email Auth ─────────────────────────────────────────────────────── */

  const requestEmailOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setEmailLoading(true);
      showError('');
      setEmailMessage('');
      const response = await requestRegisterOtp({
        firstName,
        lastName,
        email,
        phone: normalizePhoneNumber(phone),
        password,
      });
      setEmailDevOtpCode(response.devOtpCode ?? '');
      setEmailMessage(response.message);
      setEmailStep('verify');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyEmailRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setEmailLoading(true);
      showError('');
      setEmailMessage('');
      const response = await verifyRegisterOtp({ email, otp: emailOtp });
      setEmailMessage(response.message);
      setEmailStep('done');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setEmailLoading(false);
    }
  };

  const resendEmailOtp = async () => {
    if (!email) { showError('Email manzili kiritilmagan.'); return; }
    try {
      setEmailResending(true);
      showError('');
      setEmailMessage('');
      const response = await requestRegisterOtp({
        firstName,
        lastName,
        email,
        phone: normalizePhoneNumber(phone),
        password,
      });
      setEmailDevOtpCode(response.devOtpCode ?? '');
      setEmailMessage(response.message || 'Tasdiqlash kodi qayta yuborildi.');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setEmailResending(false);
    }
  };

  /* ─── SMS Auth ───────────────────────────────────────────────────────── */

  const requestSmsOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizePhoneNumber(phone);
    if (normalized.replace(/\D/g, '').length < 12) {
      showError("Telefon raqamni to'liq kiriting (masalan: +998 90 123 45 67).");
      return;
    }
    try {
      setSmsLoading(true);
      showError('');
      setSmsMessage('');
      const response = await requestPhoneOtp({
        phone: normalized,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      setSmsDevOtpCode(response.devOtpCode ?? '');
      setSmsMessage(response.message || "SMS kod yuborildi.");
      setSmsStep('verify');
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSmsLoading(false);
    }
  };

  const verifySmsOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSmsLoading(true);
      showError('');
      const response = await verifyPhoneOtp({
        phone: normalizePhoneNumber(phone),
        otp: smsOtp,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        password: smsPassword || undefined,
      });
      if (response.access_token) {
        saveTokens(response);
        router.push('/profile');
      }
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSmsLoading(false);
    }
  };

  const resendSmsOtp = async () => {
    const normalized = normalizePhoneNumber(phone);
    try {
      setSmsResending(true);
      showError('');
      setSmsMessage('');
      const response = await requestPhoneOtp({
        phone: normalized,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      setSmsDevOtpCode(response.devOtpCode ?? '');
      setSmsMessage(response.message || "SMS kod qayta yuborildi.");
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSmsResending(false);
    }
  };

  const handleGoogleLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = googleLoginUrl;
    }
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError('');
  };

  /* ─── Shared input style ─────────────────────────────────────────────── */

  const inputCls =
    'h-12 w-full rounded-2xl border border-[#EAE2D3] bg-white text-sm text-[#1A2235] placeholder-[#B4A88F] outline-none transition-all duration-200 focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20';
  const iCls = inputCls + ' pl-icon';
  const iPrCls = inputCls + ' pl-icon pr-icon';

  /* ─── JSX ────────────────────────────────────────────────────────────── */

  const isOtpStep = (authMode === 'sms' && smsStep === 'verify') ||
    (authMode === 'email' && emailStep === 'verify') ||
    (authMode === 'email' && emailStep === 'done');

  return (
    <section className="min-h-[calc(100vh-76px)] w-full bg-[#FAF8F3] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
        {/* ── Card ── */}
        <div className="rounded-3xl border border-[#EAE2D3] bg-white p-6 shadow-[0_20px_60px_-15px_rgba(11,20,38,0.08)] sm:p-9">

          {/* Header */}
          <div className="mb-7">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B88428]">
              YEC MARKET
            </span>
            <h1 className="mt-1.5 font-['Cormorant_Garamond',serif] text-3xl font-bold leading-tight text-[#0B1426] sm:text-4xl">
              Ro&apos;yxatdan o&apos;tish
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#5C6475]">
              YEC Market oilasiga qo&apos;shiling va sevimli gilamlaringizni kashf eting.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── Segmented Control ── */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] p-1">
            <button
              type="button"
              onClick={() => switchMode('sms')}
              className={`h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                authMode === 'sms'
                  ? 'bg-white text-[#0B1426] shadow-sm'
                  : 'text-[#5C6475] hover:bg-white/60'
              }`}
            >
              SMS orqali
            </button>
            <button
              type="button"
              onClick={() => switchMode('email')}
              className={`h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                authMode === 'email'
                  ? 'bg-white text-[#0B1426] shadow-sm'
                  : 'text-[#5C6475] hover:bg-white/60'
              }`}
            >
              Email orqali
            </button>
          </div>

          {/* ══════════ SMS MODE ══════════ */}
          {authMode === 'sms' && smsStep === 'request' && (
            <form onSubmit={requestSmsOtp} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Ism
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <UserRound size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ismingiz"
                    value={firstName}
                    onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                    className={iCls}
                    autoComplete="given-name"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Familiya
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <UserRound size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="Familiyangiz"
                    value={lastName}
                    onChange={(e) => handleNameChange(e.target.value, setLastName)}
                    className={iCls}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Telefon raqam
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <Phone size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="+998 90 123 45 67"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={iCls}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={smsLoading}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0B1426] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162035] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {smsLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  'SMS kodini yuborish'
                )}
              </button>
            </form>
          )}

          {/* SMS OTP Verify Step */}
          {authMode === 'sms' && smsStep === 'verify' && (
            <form onSubmit={verifySmsOtp} className="space-y-4">
              {/* Success banner */}
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{smsMessage || 'SMS kod yuborildi.'}</span>
              </div>

              {/* Dev OTP */}
              {smsDevOtpCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Test kodi: <strong>{smsDevOtpCode}</strong>
                </div>
              )}

              {/* OTP Input */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  SMS kod
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6 xonali kod"
                  value={smsOtp}
                  onChange={(e) => setSmsOtp(e.target.value)}
                  className={`${inputCls} px-4 text-center text-lg tracking-[0.4em]`}
                  maxLength={6}
                  required
                />
              </div>

              {/* Password (set at verify step) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Parol yaratish
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <LockKeyhole size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type={showSmsPassword ? 'text' : 'password'}
                    placeholder="Kamida 6 ta belgi"
                    value={smsPassword}
                    onChange={(e) => setSmsPassword(e.target.value)}
                    className={iPrCls}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmsPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7A5B] transition-colors hover:text-[#4A5366]"
                    aria-label={showSmsPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  >
                    {showSmsPassword ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resendSmsOtp}
                  disabled={smsResending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] text-sm font-semibold text-[#0B1426] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4A853]/60 hover:bg-[#F5EFE3] active:translate-y-0 disabled:opacity-60"
                >
                  {smsResending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                </button>
                <button
                  type="submit"
                  disabled={smsLoading}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0B1426] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162035] active:translate-y-0 disabled:opacity-60"
                >
                  {smsLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    'Tasdiqlash va kirish'
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setSmsStep('request'); setError(''); setSmsOtp(''); setSmsPassword(''); }}
                className="w-full text-center text-xs text-[#5C6475] underline underline-offset-2 hover:text-[#0B1426]"
              >
                Raqamni o&apos;zgartirish
              </button>
            </form>
          )}

          {/* ══════════ EMAIL MODE ══════════ */}
          {authMode === 'email' && emailStep === 'register' && (
            <form onSubmit={requestEmailOtp} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Ism
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <UserRound size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ismingiz"
                    value={firstName}
                    onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                    className={iCls}
                    autoComplete="given-name"
                    required
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Familiya
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <UserRound size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type="text"
                    placeholder="Familiyangiz"
                    value={lastName}
                    onChange={(e) => handleNameChange(e.target.value, setLastName)}
                    className={iCls}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <Mail size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={iCls}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Parol
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <LockKeyhole size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Kamida 6 ta belgi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={iPrCls}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7A5B] transition-colors hover:text-[#4A5366]"
                    aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
                  </button>
                </div>
              </div>

              {/* Hidden phone for backend */}
              <input type="hidden" value={normalizePhoneNumber(phone)} />

              <button
                type="submit"
                disabled={emailLoading}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0B1426] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162035] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  'Email orqali ro\'yxatdan o\'tish'
                )}
              </button>
            </form>
          )}

          {/* Email OTP Verify Step */}
          {authMode === 'email' && emailStep === 'verify' && (
            <form onSubmit={verifyEmailRegistration} className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{emailMessage || 'Tasdiqlash kodi emailingizga yuborildi.'}</span>
              </div>

              {emailDevOtpCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Test kodi: <strong>{emailDevOtpCode}</strong>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]">
                  Tasdiqlash kodi
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6 xonali kod"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className={`${inputCls} px-4 text-center text-lg tracking-[0.4em]`}
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resendEmailOtp}
                  disabled={emailResending}
                  className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] text-sm font-semibold text-[#0B1426] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4A853]/60 hover:bg-[#F5EFE3] active:translate-y-0 disabled:opacity-60"
                >
                  {emailResending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0B1426] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162035] active:translate-y-0 disabled:opacity-60"
                >
                  {emailLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    'Tasdiqlash'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Email Done Step */}
          {authMode === 'email' && emailStep === 'done' && (
            <div className="space-y-5">
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{emailMessage || "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!"}</span>
              </div>
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0B1426] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162035]"
              >
                Kirish sahifasiga o&apos;tish
              </Link>
            </div>
          )}

          {/* ── Divider + Google + Footer (shown on non-OTP steps) ── */}
          {!isOtpStep && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#EAE2D3]" />
                <span className="text-xs font-medium text-[#9B8E7B]">yoki</span>
                <div className="h-px flex-1 bg-[#EAE2D3]" />
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#E2DDD2] bg-white px-4 text-sm font-semibold text-[#1F2937] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9963B]/50 hover:bg-[#FCFBF8] active:translate-y-0"
              >
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.25 1.54 7.68 2.83l5.6-5.6C33.9 3.6 29.3 1.5 24 1.5 14.8 1.5 7 6.8 3.5 14.3l6.92 5.37C12.1 13 17.6 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.09-.4-4.55H24v8.63h12.7c-.55 2.98-2.18 5.5-4.64 7.2l7.07 5.47c4.13-3.8 6.37-9.4 6.37-16.75z" />
                  <path fill="#FBBC05" d="M10.42 28.83a14.45 14.45 0 0 1 0-9.16l-6.92-5.37a23.9 23.9 0 0 0 0 19.9l6.92-5.37z" />
                  <path fill="#34A853" d="M24 46.5c6.48 0 11.92-2.13 15.9-5.77l-7.07-5.47c-1.95 1.31-4.46 2.1-8.83 2.1-6.4 0-11.9-3.5-13.58-8.55l-6.92 5.37C7 41.2 14.8 46.5 24 46.5z" />
                </svg>
                <span>Google orqali davom etish</span>
              </button>
            </>
          )}

          {/* Footer Link */}
          <p className="mt-7 text-center text-sm text-[#5C6475]">
            Hisobingiz bormi?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#D96B27] transition-colors hover:text-[#B55216] hover:underline"
            >
              Kirish
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
