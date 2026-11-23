'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage, getImageUrl } from '@/services/api';
import { getCarpets } from '@/services/carpet.service';
import type { Carpet } from '@/types/carpet';

export default function AdminHeroSliderPage() {
  const [heroCarpets, setHeroCarpets] = useState<Carpet[]>([]);
  const [allCarpets, setAllCarpets] = useState<Carpet[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadHeroCarpets = async () => {
    try {
      setError('');
      const res = await getCarpets({ search: '[HERO]', showAll: true });
      setHeroCarpets(res.items ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    void loadHeroCarpets();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchOthers = async () => {
      try {
        setLoading(true);
        setError('');
        const query = searchQuery.trim();
        const res = await getCarpets({
          page: 1,
          limit: 100,
          showAll: true,
          ...(query ? { search: query } : { sortBy: 'oldest' }),
        });
        if (active) {
          setAllCarpets(res.items ?? []);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      void fetchOthers();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const sliderCarpets = heroCarpets;
  const otherCarpets = useMemo(() => {
    return allCarpets.filter((c) => !heroCarpets.some((h) => h.id === c.id));
  }, [allCarpets, heroCarpets]);

  const handleToggleHero = async (carpet: Carpet, addToHero: boolean) => {
    try {
      setError('');
      setSuccess('');
      setSavingId(carpet.id);

      const cleanDesc = (carpet.description ?? '').replace('[HERO]', '').trim();
      const updatedDescription = addToHero
        ? `${cleanDesc} [HERO]`.trim()
        : cleanDesc;

      await api.patch(`/carpets/${carpet.id}`, { description: updatedDescription });

      const updatedCarpet = { ...carpet, description: updatedDescription };

      if (addToHero) {
        setHeroCarpets((prev) => [...prev, updatedCarpet]);
      } else {
        setHeroCarpets((prev) => prev.filter((c) => c.id !== carpet.id));
      }

      setAllCarpets((prev) =>
        prev.map((c) => (c.id === carpet.id ? updatedCarpet : c))
      );

      setSuccess(
        `"${carpet.name}" animatsiyaga ${
          addToHero ? "muvaffaqiyatli qo'shildi" : "muvaffaqiyatli olib tashlandi"
        }!`
      );
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="section-shell py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-6">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-600 shadow-sm mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
            Visual boshqaruv
          </p>
          <h1 className="font-serif text-4xl leading-[1.15] text-ink">Kirish animatsiyasi</h1>
          <p className="mt-2 text-sm text-ink/60">
            Foydalanuvchi saytga kirganda ko&apos;rinadigan bosh sahifa animatsiyasidagi (slayder) gilamlarni qo&apos;lda tahrirlang.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/carpets"
            className="rounded-xl border border-sand bg-white px-4 py-2.5 text-xs font-bold text-ink/80 hover:bg-sand/40 transition"
          >
            Barcha gilamlar
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-sand bg-white px-4 py-2.5 text-xs font-bold text-ink/80 hover:bg-sand/40 transition"
          >
            Admin panel
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-3">
          {success}
        </div>
      ) : null}

      {loading && allCarpets.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Active Slider Carpets (Left Column - 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="panel p-5 bg-sky-50/40 border border-sky-100/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Animatsiyada ko&apos;rsatilyapti
                </h2>
                <span className="rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-bold">
                  {sliderCarpets.length} ta gilam
                </span>
              </div>
              <p className="text-xs text-ink/65 mb-4 leading-relaxed">
                {sliderCarpets.length === 0
                  ? "Hozircha admin tomonidan gilam belgilanmagan. Animatsiya avtomatik rotatsiya rejimida ishlamoqda."
                  : "Belgilangan gilamlar kirish animatsiyasida aylanib turadi (maksimal 12 ta tavsiya etiladi)."}
              </p>

              {sliderCarpets.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-sky-200/60 p-8 text-center text-xs text-sky-700/60">
                  Animatsiyani boshqarish uchun o&apos;ng tomondagi ro&apos;yxatdan gilamlarni qo&apos;shing.
                </div>
              ) : (
                <div className="space-y-3">
                  {sliderCarpets.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-black/5 bg-white shadow-soft transition hover:shadow"
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-black/5 bg-slate-50 shrink-0">
                        <img
                          src={(c.images?.[0] ? getImageUrl(c.images[0]) : null) || '/logo.png'}
                          className="h-full w-full object-cover"
                          alt={c.name}
                        />
                      </div>
                       <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-ink truncate">{c.name}</h3>
                          {c.type === 'ROLL' ? (
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-800 border border-amber-200/50 shrink-0">Metraj</span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-800 border border-blue-200/50 shrink-0">Tayyor</span>
                          )}
                        </div>
                        <p className="text-[10px] text-ink/50 mt-0.5">
                          Kod: {c.designCode || "Yo'q"}{(() => {
                            const sizeStr = c.size || (c as any).inventoryItems?.[0]?.size;
                            return sizeStr ? ` | ${sizeStr}` : '';
                          })()}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingId !== null}
                        onClick={() => void handleToggleHero(c, false)}
                        className="rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-red-100 active:scale-95 transition disabled:opacity-50"
                      >
                        {savingId === c.id ? '...' : 'Animatsiyadan olib tashlash'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search and Add Carpets (Right Column - 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="panel p-5">
              <h2 className="text-lg font-bold text-ink mb-4">Barcha gilamlar ro&apos;yxati</h2>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Gilam nomi, gul kodi yoki materiali bo'yicha qidirish..."
                  className="w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="max-h-[500px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
                {otherCarpets.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-sand/40 bg-slate-50/50">
                    <svg className="w-10 h-10 text-ink/25 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-xs font-semibold text-ink/50">
                      {searchQuery.trim() ? "Qidiruv bo'yicha gilam topilmadi" : "Hozircha gilamlar yo'q"}
                    </p>
                  </div>
                ) : (
                  otherCarpets.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-black/5 bg-white transition hover:bg-slate-50"
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-black/5 bg-slate-50 shrink-0">
                        <img
                          src={(c.images?.[0] ? getImageUrl(c.images[0]) : null) || '/logo.png'}
                          className="h-full w-full object-cover"
                          alt={c.name}
                        />
                      </div>
                       <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-ink truncate">{c.name}</h3>
                          {c.type === 'ROLL' ? (
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-800 border border-amber-200/50 shrink-0">Metraj</span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-800 border border-blue-200/50 shrink-0">Tayyor</span>
                          )}
                        </div>
                        <p className="text-[10px] text-ink/50 mt-0.5">
                          {c.category?.name || 'Kategoriya'} | Kod: {c.designCode || "Yo'q"}{(() => {
                            const sizeStr = c.size || (c as any).inventoryItems?.[0]?.size;
                            return sizeStr ? ` | ${sizeStr}` : '';
                          })()}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingId !== null}
                        onClick={() => void handleToggleHero(c, true)}
                        className="rounded-lg bg-sky-50 text-sky-600 px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-sky-100 active:scale-95 transition disabled:opacity-50"
                      >
                        {savingId === c.id ? '...' : "Animatsiyaga qo'shish"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
