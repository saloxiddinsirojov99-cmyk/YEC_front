'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, Phone } from 'lucide-react';
import { getErrorMessage } from '@/services/api';
import { getGoogleLoginUrl, login, saveTokens } from '@/services/auth.service';
import { formatPhoneNumber, normalizePhoneNumber } from '@/utils/format';
import { toast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError('');
    setPhone(formatPhoneNumber(event.target.value));
  };

  const redirectByRole = (role?: string) => {
    if (role === 'OPERATOR') {
      router.push('/admin/customers');
    } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
      router.push('/admin');
    } else {
      router.push('/profile');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'phone') {
      const normalized = normalizePhoneNumber(phone);
      if (normalized.replace(/\D/g, '').length < 12) {
        const msg = "Telefon raqamni to'liq kiriting (masalan: +998 90 123 45 67).";
        setError(msg);
        toast.error(msg);
        return;
      }
    } else if (!email.trim() || !email.includes('@')) {
      const msg = "To'g'ri email manzilini kiriting.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!password || password.length < 6) {
      const msg = "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setLoading(true);
      const identifier =
        mode === 'phone' ? normalizePhoneNumber(phone) : email.trim().toLowerCase();
      const response = await login({ email: identifier, password });
      saveTokens(response.accessToken, response.refreshToken);
      redirectByRole(response.user?.role);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (googleLoading || loading) return;
    setError('');
    setGoogleLoading(true);
    try {
      const url = getGoogleLoginUrl();
      window.location.assign(url);
    } catch {
      setGoogleLoading(false);
      const msg = "Google orqali kirishni boshlashda xatolik yuz berdi.";
      setError(msg);
      toast.error(msg);
    }
  };

  const switchMode = (nextMode: 'phone' | 'email') => {
    setError('');
    setMode(nextMode);
  };

  return (
    <section className="min-h-[calc(100vh-76px)] w-full overflow-x-hidden bg-[#FAF8F3] lg:grid lg:grid-cols-12">
      {/* LEFT SIDE — Desktop Luxury Brand Showcase */}
      <div className="relative hidden lg:col-span-6 lg:flex lg:flex-col lg:justify-between overflow-hidden bg-[#0B1426] p-12 xl:p-16">
        <Image
          src="/images/login-hero-bg.jpg"
          alt="YEC Market hashamatli gilam interyeri"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        {/* Refined navy & warm shadow overlays to keep carpet visible and text legible */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(11,20,38,0.68) 0%, rgba(11,20,38,0.18) 42%, rgba(11,20,38,0.82) 100%)',
          }}
        />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 p-1.5 shadow-lg ring-1 ring-[#D4A853]/40">
            <img
              src="/logo.png"
              alt="YEC Market logotipi"
              className="h-full w-full rounded-full object-contain"
            />
          </div>
          <div>
            <p className="font-['Cormorant_Garamond',serif] text-2xl font-bold tracking-wide text-white leading-none">
              YEC MARKET
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E6C57E]">
              Premium Gilamlar
            </p>
          </div>
        </div>

        {/* Bottom Editorial Copy */}
        <div className="relative z-10 max-w-lg">
          <div className="mb-5 h-[1px] w-16 bg-gradient-to-r from-[#D4A853] to-transparent" />
          <h2 className="font-['Cormorant_Garamond',serif] text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-5xl">
            Uyingizga hashamat olib kiring
          </h2>
          <p className="mt-4 text-base font-normal leading-relaxed text-[#F5EFE2]/90">
            YEC Market — sifatli gilamlar va nafis dizaynlar olami.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-[#E6C57E]/90">
            <span>Nafis</span>
            <span className="h-1 w-1 rounded-full bg-[#D4A853]" />
            <span>Zamonaviy</span>
            <span className="h-1 w-1 rounded-full bg-[#D4A853]" />
            <span>Klassik</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — Clean Ivory & White Authentication Card */}
      <div className="flex flex-col items-center justify-center px-4 py-6 sm:px-8 sm:py-10 lg:col-span-6 lg:px-12 xl:px-20">
        {/* Mobile Compact Brand Banner */}
        <div className="mb-6 w-full max-w-[440px] lg:hidden">
          <div className="relative overflow-hidden rounded-2xl bg-[#0B1426] px-5 py-5 shadow-md">
            <Image
              src="/images/login-hero-bg.jpg"
              alt="YEC Market"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-55"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B1426]/85 via-[#0B1426]/65 to-[#0B1426]/40" />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow ring-1 ring-[#D4A853]/40">
                <img
                  src="/logo.png"
                  alt="YEC Market logotipi"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-['Cormorant_Garamond',serif] text-xl font-bold leading-tight text-white">
                  Uyingizga hashamat olib kiring
                </p>
                <p className="mt-0.5 truncate text-xs text-[#F5EFE2]/85">
                  YEC Market — sifatli gilamlar va nafis dizaynlar olami.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="animate-fade-up w-full max-w-[440px] rounded-3xl border border-[#EAE2D3] bg-white p-6 shadow-[0_20px_60px_-15px_rgba(11,20,38,0.08)] sm:p-9">
          {/* Card Header */}
          <div className="mb-7">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B88428]">
              YEC Market
            </span>
            <h1 className="mt-1.5 font-['Cormorant_Garamond',serif] text-3xl font-bold leading-tight text-[#0B1426] sm:text-4xl">
              Xush kelibsiz!
            </h1>
            <p className="mt-1.5 text-sm text-[#5C6475]">
              YEC Market hisobingizga kiring
            </p>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Primary Auth Form (Phone by default, switches smoothly to Email) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'phone' ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="login-phone"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]"
                >
                  Telefon raqam
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <Phone size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9+ \-]*"
                    placeholder="+998 90 123 45 67"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={17}
                    style={{ paddingLeft: '2.85rem' }}
                    className="w-full font-mono tracking-wide"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]"
                  >
                    Email manzil
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('phone')}
                    className="text-xs font-medium text-[#B88428] transition-colors hover:text-[#0B1426] hover:underline"
                  >
                    Telefon orqali kirish
                  </button>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                    <Mail size={18} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => {
                      if (error) setError('');
                      setEmail(event.target.value);
                    }}
                    style={{ paddingLeft: '2.85rem' }}
                    className="w-full"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#4A5366]"
                >
                  Parol
                </label>
                <Link
                  href={`/forgot-password?mode=${mode}`}
                  className="text-xs font-medium text-[#D96B27] transition-colors hover:text-[#B55216] hover:underline"
                >
                  Parolni unutdingizmi?
                </Link>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7A5B]">
                  <LockKeyhole size={18} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Parolingizni kiriting"
                  value={password}
                  onChange={(event) => {
                    if (error) setError('');
                    setPassword(event.target.value);
                  }}
                  style={{ paddingLeft: '2.85rem', paddingRight: '3rem' }}
                  className="w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#7A8291] transition-colors hover:bg-[#FAF8F3] hover:text-[#0B1426] focus:outline-none"
                  aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                >
                  {showPassword ? (
                    <EyeOff size={19} strokeWidth={2} />
                  ) : (
                    <Eye size={19} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B1426] px-6 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_-8px_rgba(11,20,38,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162442] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Kirilmoqda...</span>
                </>
              ) : (
                'Kirish'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#EAE2D3]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8D93A0]">
              yoki
            </span>
            <div className="h-px flex-1 bg-[#EAE2D3]" />
          </div>

          {/* Two Alternative Authentication Buttons — Zero Duplicates */}
          <div className="space-y-3">
            {/* 1. Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#E2DDD2] bg-white px-4 text-sm font-semibold text-[#1F2937] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9963B]/50 hover:bg-[#FCFBF8] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B1426]/20 border-t-[#0B1426]" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.25 1.54 7.68 2.83l5.6-5.6C33.9 3.6 29.3 1.5 24 1.5 14.8 1.5 7 6.8 3.5 14.3l6.92 5.37C12.1 13 17.6 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.57-.14-3.09-.4-4.55H24v8.63h12.7c-.55 2.98-2.18 5.5-4.64 7.2l7.07 5.47c4.13-3.8 6.37-9.4 6.37-16.75z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.42 28.83a14.45 14.45 0 0 1 0-9.16l-6.92-5.37a23.9 23.9 0 0 0 0 19.9l6.92-5.37z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 46.5c6.48 0 11.92-2.13 15.9-5.77l-7.07-5.47c-1.95 1.31-4.46 2.1-8.83 2.1-6.4 0-11.9-3.5-13.58-8.55l-6.92 5.37C7 41.2 14.8 46.5 24 46.5z"
                  />
                </svg>
              )}
              <span>{googleLoading ? "Yo'naltirilmoqda..." : 'Google orqali kirish'}</span>
            </button>

            {/* 2. Email / Phone Switch Button */}
            <button
              type="button"
              onClick={() => switchMode(mode === 'phone' ? 'email' : 'phone')}
              disabled={loading || googleLoading}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-[#EAE2D3] bg-[#FAF8F3] px-4 text-sm font-semibold text-[#0B1426] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4A853]/60 hover:bg-[#F5EFE3] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === 'phone' ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#D96B27]"
                    aria-hidden="true"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span>Email orqali kirish</span>
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#D96B27]"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.79.63 2.64a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6.27 6.27l1.26-1.28a2 2 0 0 1 2.11-.45c.85.29 1.74.51 2.64.63A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Telefon orqali kirish</span>
                </>
              )}
            </button>
          </div>

          {/* Registration Footer */}
          <p className="mt-7 text-center text-sm text-[#5C6475]">
            Hisobingiz yo&lsquo;qmi?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#D96B27] transition-colors hover:text-[#B55216] hover:underline"
            >
              Ro&lsquo;yxatdan o&lsquo;tish
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
