'use client';

function formatNameInput(val: string): string {
  let s = val.replace(/^\s+/, '');
  s = s.replace(/\s+/g, ' ');
  return s.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, formatPrice, getErrorMessage } from '@/services/api';

type ExistingCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  birthDate: string | null;
  telegramUsername: string | null;
  loyaltyStatus: string;
  totalPurchaseAmount: number;
  orders?: Array<{
    id: string;
    createdAt: string;
    status: string;
    paidAmount: number;
    remainingAmount: number;
  }>;
};

type LookupResponse = {
  exists: boolean;
  customer: ExistingCustomer | null;
};

export default function QuickRegisterCustomerPage() {
  const router = useRouter();

  // Lookup state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [notes, setNotes] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredCustomer, setRegisteredCustomer] = useState<ExistingCustomer | null>(null);

  // Debounced phone search
  const performLookup = useCallback(async (phoneNumber: string) => {
    const cleanPhone = phoneNumber.trim();
    if (cleanPhone.length < 7) {
      setExistingCustomer(null);
      setHasSearched(false);
      return;
    }

    try {
      setSearching(true);
      setErrorMsg('');
      const { data } = await api.get<LookupResponse>('/customers/lookup', {
        params: { phone: cleanPhone },
      });

      setHasSearched(true);
      if (data.exists && data.customer) {
        setExistingCustomer(data.customer);
      } else {
        setExistingCustomer(null);
        // Pre-fill phone if registering new
        setPhone(cleanPhone);
      }
    } catch (err) {
      console.error('Phone lookup error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phoneSearch.trim()) {
        void performLookup(phoneSearch);
      } else {
        setExistingCustomer(null);
        setHasSearched(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phoneSearch, performLookup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = (phone || phoneSearch).trim();

    if (!cleanName || !cleanPhone) {
      setErrorMsg("Mijoz ismi va telefon raqami majburiy.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload = {
        name: cleanName,
        phone: cleanPhone,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        birthDate: birthDate || undefined,
        telegramUsername: telegramUsername.trim() || undefined,
      };

      const { data } = await api.post('/customers/register', payload);

      setRegisteredCustomer(data);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      if (err.response?.data?.existingCustomer) {
        setExistingCustomer(err.response.data.existingCustomer);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPhoneSearch('');
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setBirthDate('');
    setTelegramUsername('');
    setNotes('');
    setExistingCustomer(null);
    setRegisteredCustomer(null);
    setHasSearched(false);
    setErrorMsg('');
  };

  return (
    <div className="section-shell py-8 max-w-4xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-sand pb-4">
        <div>
          <Link
            href="/admin/customers"
            className="text-xs text-ink/50 hover:text-ink transition-colors mb-1 inline-flex items-center gap-1 font-semibold"
          >
            ← Mijozlar Ro'yxatiga Qaytish
          </Link>
          <h1 className="font-serif text-3xl font-extrabold text-ink flex items-center gap-2">
            <span>⚡</span> Tezkor Mijoz Ro'yxatga Olish
          </h1>
          <p className="text-ink/60 text-xs mt-1">
            Mijoz telefon raqami bo'yicha bazadan qidirish va yangi mijozni tizimga kiritish.
          </p>
        </div>
        <button
          onClick={resetForm}
          className="btn-secondary rounded-xl py-2 px-3.5 text-xs text-ink/70 hover:text-ink font-semibold"
        >
          🔄 Qayta Boshlash
        </button>
      </div>

      {/* SUCCESS SCREEN */}
      {registeredCustomer ? (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-8 text-center space-y-6 shadow-xl animate-scaleIn">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto shadow-lg">
            ✓
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-emerald-950">
              Mijoz Muvaffaqiyatli Ro'yxatga Olindi!
            </h2>
            <p className="text-emerald-800 text-sm mt-1">
              Yangi mijoz profilingiz tizimda saqlandi va foydalanishga tayyor.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-200 text-left max-w-md mx-auto space-y-2 text-xs text-ink">
            <div className="flex justify-between border-b border-sand/30 pb-2">
              <span className="text-ink/50 font-medium">Mijoz Ismi:</span>
              <span className="font-bold text-ink">{registeredCustomer.name}</span>
            </div>
            <div className="flex justify-between border-b border-sand/30 pb-2">
              <span className="text-ink/50 font-medium">Telefon Raqami:</span>
              <span className="font-bold text-ink">{registeredCustomer.phone}</span>
            </div>
            {registeredCustomer.email && (
              <div className="flex justify-between border-b border-sand/30 pb-2">
                <span className="text-ink/50 font-medium">Email:</span>
                <span className="font-semibold text-ink">{registeredCustomer.email}</span>
              </div>
            )}
            {registeredCustomer.address && (
              <div className="flex justify-between border-b border-sand/30 pb-2">
                <span className="text-ink/50 font-medium">Manzil:</span>
                <span className="font-semibold text-ink">{registeredCustomer.address}</span>
              </div>
            )}
            {registeredCustomer.notes && (
              <div className="flex justify-between pb-1">
                <span className="text-ink/50 font-medium">Izoh:</span>
                <span className="italic text-ink/80">{registeredCustomer.notes}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={resetForm}
              className="btn-primary py-3 px-6 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
            >
              ⚡ Yana Bir Mijoz Qo'shish
            </button>
            <button
              onClick={() => router.push('/admin/customers')}
              className="btn-secondary py-3 px-6 rounded-xl font-bold text-sm"
            >
              👥 Mijozlar Ro'yxatiga Qaytish
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* STEP 1: Phone Search / Lookup */}
          <div className="bg-gradient-to-br from-amber-500/5 via-white to-orange-500/5 border border-amber-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                1
              </div>
              <div>
                <h3 className="font-serif font-bold text-ink text-lg">
                  Mijoz Telefon Raqamini Izlash
                </h3>
                <p className="text-xs text-ink/60">
                  Telefon raqamini kiriting. Agar mijoz ilgari ro'yxatdan o'tgan bo'lsa, uning ma'lumotlari darhol chiqadi.
                </p>
              </div>
            </div>

            <div className="relative max-w-xl">
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Telefon raqami (masalan: +998901234567)"
                className="w-full rounded-2xl border-2 border-amber-300/80 bg-white px-4 py-3.5 text-base font-semibold text-ink outline-none transition focus:border-amber-500 shadow-inner"
              />
              {searching && (
                <div className="absolute right-4 top-4 text-xs font-semibold text-amber-600 animate-pulse">
                  Izlanmoqda...
                </div>
              )}
            </div>

            {/* STATUS BADGES & NOTICES */}
            {hasSearched && (
              <div className="pt-2">
                {existingCustomer ? (
                  <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/80 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
                        <span>⚠️</span> Ushbu Mijoz Bazada Allaqachon Mavjud!
                      </span>
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                        {existingCustomer.loyaltyStatus} Status
                      </span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-2 text-xs text-ink">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-ink">{existingCustomer.name}</span>
                        <span className="font-mono text-xs text-ink/70">{existingCustomer.phone}</span>
                      </div>
                      {existingCustomer.address && (
                        <p className="text-ink/70">📍 Manzil: {existingCustomer.address}</p>
                      )}
                      {existingCustomer.notes && (
                        <p className="text-amber-800 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          📝 Izoh: {existingCustomer.notes}
                        </p>
                      )}
                      <div className="flex justify-between pt-1 text-[11px] text-ink/60 border-t border-sand/40">
                        <span>Jami xaridlar: <strong>{formatPrice(existingCustomer.totalPurchaseAmount)}</strong></span>
                        <span>Buyurtmalar soni: {existingCustomer.orders?.length || 0} ta</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => router.push('/admin/customers')}
                        className="btn-secondary text-xs py-2 px-4 rounded-xl font-bold"
                      >
                        👥 Mijozlar Ro'yxatida Ko'rish
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 border border-emerald-300 px-3.5 py-2 text-xs font-bold text-emerald-800 animate-fadeIn">
                    <span>✓</span> Ushbu telefon raqami bazada mavjud emas. Yangi mijoz sifatidan ro'yxatga olishingiz mumkin.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Registration Form */}
          {!existingCustomer && (
            <div className="bg-white border border-sand rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-sand pb-4">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                  2
                </div>
                <div>
                  <h3 className="font-serif font-bold text-ink text-lg">
                    Mijoz Ma'lumotlarini Kiritish
                  </h3>
                  <p className="text-xs text-ink/60">
                    Barcha kerakli maydonlarni to'ldiring va ro'yxatdan o'tkazing.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-semibold animate-fadeIn">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                      Mijoz Ismi (F.I.SH) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(formatNameInput(e.target.value))}
                      placeholder="Masalan: Alisher Navoiy"
                      className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                      Telefon Raqami <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={phone || phoneSearch}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneSearch(e.target.value);
                      }}
                      placeholder="+998901234567"
                      className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                      Email Manzili (Ixtiyoriy)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="masalan: user@example.com"
                      className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500"
                    />
                  </div>

                  {/* Telegram */}
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                      Telegram Username (Ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="alisher_navoiy (@ siz)"
                      className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address */}
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                      Yashash Manzili (Ixtiyoriy)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Toshkent sh., Chilonzor 19-mavze"
                      className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500"
                    />
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                      Tug'ilgan Kuni (Ixtiyoriy)
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-bold text-ink/60 uppercase tracking-wider block mb-1">
                    Izoh / Maxsus Eslatmalar (Ixtiyoriy)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mijoz haqida qo'shimcha izohlar, afzalliklari yoki maxsus talablar..."
                    className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky-500 resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-sand/40">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary rounded-xl py-3 px-5 text-xs font-bold"
                  >
                    Bekor Qilish
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary rounded-xl py-3 px-7 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg flex items-center gap-2"
                  >
                    {submitting ? (
                      <span>Saqlanmoqda...</span>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>RO'YXATGA OLISH</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
