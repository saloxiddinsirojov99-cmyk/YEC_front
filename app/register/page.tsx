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

/* ─── Shared styles ───────────────────────────────────────────────────────── */
const wrapCls =
  'icon-input-wrap flex h-12 items-center overflow-hidden rounded-2xl border border-[#EAE2D3] bg-white transition-all duration-200 focus-within:border-[#D4A853] focus-within:ring-2 focus-within:ring-[#D4A853]/20';

const iconCls =
  'pointer-events-none shrink-0 pl-4 pr-2.5 text-[#8C7A5B]';

/* ─── Icon input helpers ──────────────────────────────────────────────────── */
function IconInput({
  icon,
  inputProps,
}: {
  icon: React.ReactNode;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className={wrapCls}>
      <span className={iconCls} aria-hidden="true">{icon}</span>
      <input {...inputProps} className="outline-none placeholder-[#B4A88F] text-[#1A2235]" />
    </div>
  );
}

function PasswordInput({
  icon,
  show,
  onToggle,
  inputProps,
}: {
  icon: React.ReactNode;
  show: boolean;
  onToggle: () => void;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className={wrapCls}>
      <span className={iconCls} aria-hidden="true">{icon}</span>
      <input
        {...inputProps}
        type={show ? 'text' : 'password'}
        className="outline-none placeholder-[#B4A88F] text-[#1A2235]"
      />
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 pr-4 text-[#8C7A5B] transition-colors hover:text-[#4A5366]"
        aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
      >
        {show ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
      </button>
    </div>
  );
}

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPhone(formatPhoneNumber(e.target.value));

  const handleNameChange = (value: string, setter: (v: string) => void) => {
    let s = value.replace(/[^a-zA-Zа-яА-ЯёЁҒғҚқҲҳЎўҮүҲ]/g, '');
    if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1);
    setter(s);
  };

  /* ─── Email Auth ─────────────────────────────────────────────────────── */

  const requestEmailOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setEmailLoading(true);
      showError('');
      setEmailMessage('');
      const res = await requestRegisterOtp({
        firstName, lastName, email,
        phone: normalizePhoneNumber(phone),
        password,
      });
      setEmailDevOtpCode(res.devOtpCode ?? '');
      setEmailMessage(res.message);
      setEmailStep('verify');
    } catch (err) { showError(getErrorMessage(err)); }
    finally { setEmailLoading(false); }
  };

  const verifyEmailRegistration = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setEmailLoading(true);
      showError('');
      const res = await verifyRegisterOtp({ email, otp: emailOtp });
      setEmailMessage(res.message);
      setEmailStep('done');
    } catch (err) { showError(getErrorMessage(err)); }
    finally { setEmailLoading(false); }
  };

  const resendEmailOtp = async () => {
    if (!email) { showError('Email manzili kiritilmagan.'); return; }
    try {
      setEmailResending(true);
      showError('');
      const res = await requestRegisterOtp({
        firstName, lastName, email,
        phone: normalizePhoneNumber(phone), password,
      });
      setEmailDevOtpCode(res.devOtpCode ?? '');
      setEmailMessage(res.message || 'Tasdiqlash kodi qayta yuborildi.');
    } catch (err) { showError(getErrorMessage(err)); }
    finally { setEmailResending(false); }
  };

  /* ─── SMS Auth ───────────────────────────────────────────────────────── */

  const requestSmsOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = normalizePhoneNumber(phone);
    if (normalized.replace(/\D/g, '').length < 12) {
      showError("Telefon raqamni to'liq kiriting (masalan: +998 90 123 45 67).");
      return;
    }
    try {
      setSmsLoading(true);
      showError('');
      const res = await requestPhoneOtp({
        phone: normalized,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      setSmsDevOtpCode(res.devOtpCode ?? '');
      setSmsMessage(res.message || 'SMS kod yuborildi.');
      setSmsStep('verify');
    } catch (err) { showError(getErrorMessage(err)); }
    finally { setSmsLoading(false); }
  };

  const verifySmsOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSmsLoading(true);
      showError('');
      const res = await verifyPhoneOtp({
        phone: normalizePhoneNumber(phone),
        otp: smsOtp,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        password: smsPassword || undefined,
      });
      if (res.access_token) { saveTokens(res); router.push('/profile'); }
    } catch (err) { showError(getErrorMessage(err)); }
    finally { setSmsLoading(false); }
  };

  const resendSmsOtp = async () => {
    try {
      setSmsResending(true);
      showError('');
      const res = await requestPhoneOtp({
        phone: normalizePhoneNumber(phone),
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      setSmsDevOtpCode(res.devOtpCode ?? '');
      setSmsMessage(res.message || 'SMS kod qayta yuborildi.');
    } catch (err) { showError(getErrorMessage(err)); }
    finally { setSmsResending(false); }
  };

  const handleGoogleLogin = () => {
    if (typeof window !== 'undefined') window.location.href = googleLoginUrl;
  };

  const switchMode = (mode: AuthMode) => { setAuthMode(mode); setError(''); };

  /* ─── Helpers ────────────────────────────────────────────────────────── */

  const isOtpStep =
    (authMode === 'sms' && smsStep === 'verify') ||
    (authMode === 'email' && (emailStep === 'verify' || emailStep === 'done'));

  const primaryBtn =
    'flex h-12 w-full items-center justify-center rounded-2xl bg-[#0B1426] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162035] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60';

  const secondaryBtn =
    'flex h-12 w-full items-center justify-center rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] text-sm font-semibold text-[#0B1426] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4A853]/60 hover:bg-[#F5EFE3] active:translate-y-0 disabled:opacity-60';

  const labelCls =
    'mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]';

  const otpInputCls =
    'icon-input-wrap flex h-12 w-full items-center overflow-hidden rounded-2xl border border-[#EAE2D3] bg-white transition-all duration-200 focus-within:border-[#D4A853] focus-within:ring-2 focus-within:ring-[#D4A853]/20';

  /* ─── JSX ────────────────────────────────────────────────────────────── */

  return (
    <section className="min-h-[calc(100vh-76px)] w-full bg-[#FAF8F3] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[480px]">
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
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Control */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] p-1">
            {(['sms', 'email'] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  authMode === m
                    ? 'bg-white text-[#0B1426] shadow-sm'
                    : 'text-[#5C6475] hover:bg-white/60'
                }`}
              >
                {m === 'sms' ? 'SMS orqali' : 'Email orqali'}
              </button>
            ))}
          </div>

          {/* ══════════ SMS REQUEST ══════════ */}
          {authMode === 'sms' && smsStep === 'request' && (
            <form onSubmit={requestSmsOtp} className="space-y-4">
              <div>
                <label className={labelCls}>Ism</label>
                <IconInput
                  icon={<UserRound size={18} strokeWidth={1.9} />}
                  inputProps={{
                    type: 'text', placeholder: 'Ismingiz', value: firstName,
                    onChange: (e) => handleNameChange(e.target.value, setFirstName),
                    autoComplete: 'given-name',
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Familiya</label>
                <IconInput
                  icon={<UserRound size={18} strokeWidth={1.9} />}
                  inputProps={{
                    type: 'text', placeholder: 'Familiyangiz', value: lastName,
                    onChange: (e) => handleNameChange(e.target.value, setLastName),
                    autoComplete: 'family-name',
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Telefon raqam</label>
                <IconInput
                  icon={<Phone size={18} strokeWidth={1.9} />}
                  inputProps={{
                    type: 'tel', inputMode: 'numeric', placeholder: '+998 90 123 45 67',
                    value: phone, onChange: handlePhoneChange,
                    autoComplete: 'tel', required: true,
                  }}
                />
              </div>
              <button type="submit" disabled={smsLoading} className={primaryBtn}>
                {smsLoading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : 'SMS kodini yuborish'}
              </button>
            </form>
          )}

          {/* ══════════ SMS VERIFY ══════════ */}
          {authMode === 'sms' && smsStep === 'verify' && (
            <form onSubmit={verifySmsOtp} className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{smsMessage || 'SMS kod yuborildi.'}</span>
              </div>
              {smsDevOtpCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Test kodi: <strong>{smsDevOtpCode}</strong>
                </div>
              )}
              <div>
                <label className={labelCls}>SMS kod</label>
                <div className={otpInputCls}>
                  <input
                    type="text" inputMode="numeric" placeholder="6 xonali kod"
                    value={smsOtp} onChange={(e) => setSmsOtp(e.target.value)}
                    maxLength={6} required
                    className="text-center text-lg tracking-[0.4em] outline-none placeholder-[#B4A88F] text-[#1A2235] px-4"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Parol yaratish</label>
                <PasswordInput
                  icon={<LockKeyhole size={18} strokeWidth={1.9} />}
                  show={showSmsPassword}
                  onToggle={() => setShowSmsPassword((v) => !v)}
                  inputProps={{
                    placeholder: 'Kamida 6 ta belgi', value: smsPassword,
                    onChange: (e) => setSmsPassword(e.target.value),
                    autoComplete: 'new-password',
                  }}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={resendSmsOtp} disabled={smsResending} className={secondaryBtn}>
                  {smsResending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                </button>
                <button type="submit" disabled={smsLoading} className={primaryBtn}>
                  {smsLoading
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    : 'Tasdiqlash va kirish'}
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

          {/* ══════════ EMAIL REGISTER ══════════ */}
          {authMode === 'email' && emailStep === 'register' && (
            <form onSubmit={requestEmailOtp} className="space-y-4">
              <div>
                <label className={labelCls}>Ism</label>
                <IconInput
                  icon={<UserRound size={18} strokeWidth={1.9} />}
                  inputProps={{
                    type: 'text', placeholder: 'Ismingiz', value: firstName,
                    onChange: (e) => handleNameChange(e.target.value, setFirstName),
                    autoComplete: 'given-name', required: true,
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Familiya</label>
                <IconInput
                  icon={<UserRound size={18} strokeWidth={1.9} />}
                  inputProps={{
                    type: 'text', placeholder: 'Familiyangiz', value: lastName,
                    onChange: (e) => handleNameChange(e.target.value, setLastName),
                    autoComplete: 'family-name', required: true,
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <IconInput
                  icon={<Mail size={18} strokeWidth={1.9} />}
                  inputProps={{
                    type: 'email', placeholder: 'email@example.com', value: email,
                    onChange: (e) => setEmail(e.target.value),
                    autoComplete: 'email', required: true,
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Parol</label>
                <PasswordInput
                  icon={<LockKeyhole size={18} strokeWidth={1.9} />}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  inputProps={{
                    placeholder: 'Kamida 6 ta belgi', value: password,
                    onChange: (e) => setPassword(e.target.value),
                    autoComplete: 'new-password', required: true,
                  }}
                />
              </div>
              {/* Hidden phone for backend */}
              <input type="hidden" value={normalizePhoneNumber(phone)} />
              <button type="submit" disabled={emailLoading} className={primaryBtn}>
                {emailLoading
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : "Email orqali ro'yxatdan o'tish"}
              </button>
            </form>
          )}

          {/* ══════════ EMAIL VERIFY ══════════ */}
          {authMode === 'email' && emailStep === 'verify' && (
            <form onSubmit={verifyEmailRegistration} className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{emailMessage || 'Tasdiqlash kodi emailingizga yuborildi.'}</span>
              </div>
              {emailDevOtpCode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Test kodi: <strong>{emailDevOtpCode}</strong>
                </div>
              )}
              <div>
                <label className={labelCls}>Tasdiqlash kodi</label>
                <div className={otpInputCls}>
                  <input
                    type="text" inputMode="numeric" placeholder="6 xonali kod"
                    value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)}
                    maxLength={6} required
                    className="text-center text-lg tracking-[0.4em] outline-none placeholder-[#B4A88F] text-[#1A2235] px-4"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={resendEmailOtp} disabled={emailResending} className={secondaryBtn}>
                  {emailResending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                </button>
                <button type="submit" disabled={emailLoading} className={primaryBtn}>
                  {emailLoading
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    : 'Tasdiqlash'}
                </button>
              </div>
            </form>
          )}

          {/* ══════════ EMAIL DONE ══════════ */}
          {authMode === 'email' && emailStep === 'done' && (
            <div className="space-y-5">
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{emailMessage || "Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!"}</span>
              </div>
              <Link href="/login" className={primaryBtn + ' no-underline'}>
                Kirish sahifasiga o&apos;tish
              </Link>
            </div>
          )}

          {/* ── Divider + Google (non-OTP steps only) ── */}
          {!isOtpStep && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#EAE2D3]" />
                <span className="text-xs font-medium text-[#9B8E7B]">yoki</span>
                <div className="h-px flex-1 bg-[#EAE2D3]" />
              </div>
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

          {/* Footer */}
          <p className="mt-7 text-center text-sm text-[#5C6475]">
            Hisobingiz bormi?{' '}
            <Link href="/login" className="font-semibold text-[#D96B27] transition-colors hover:text-[#B55216] hover:underline">
              Kirish
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
