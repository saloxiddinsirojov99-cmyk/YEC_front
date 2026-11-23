'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '@/services/api';
import { getDiscountGroups, type DiscountGroup } from '@/services/carpet.service';

type DiscountResponse = {
  updatedCount?: number;
  standardizedCount?: number;
  discountPercent?: number;
};

export default function AdminDiscountsPage() {
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [nameSearch, setNameSearch] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [loadingNames, setLoadingNames] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Existing discount groups
  const [discountGroups, setDiscountGroups] = useState<DiscountGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    const loadNames = async () => {
      try {
        setLoadingNames(true);
        const { data } = await api.get<string[]>('/carpets/names', {
          params: { kind: 'carpet' },
        });
        setNameOptions(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoadingNames(false);
      }
    };

    void loadNames();
  }, []);

  // Load existing discounts
  useEffect(() => {
    const loadDiscounts = async () => {
      try {
        setLoadingGroups(true);
        const groups = await getDiscountGroups();
        setDiscountGroups(groups);
      } catch (err) {
        console.error('Failed to load discount groups:', err);
      } finally {
        setLoadingGroups(false);
      }
    };
    void loadDiscounts();
  }, [status]);

  const visibleNames = useMemo(() => {
    const query = nameSearch.trim().toLowerCase();
    const filtered = query
      ? nameOptions.filter((name) => name.toLowerCase().includes(query))
      : nameOptions;
    return filtered.slice(0, 200);
  }, [nameOptions, nameSearch]);

  const toggleSelectedName = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((value) => value !== name) : [...prev, name],
    );
  };

  const clearForm = () => {
    setSelectedNames([]);
    setDiscountInput('');
    setNameSearch('');
    setError('');
    setStatus('');
  };

  const applyDiscount = async () => {
    const percent = Math.round(Number(discountInput));
    if (selectedNames.length === 0) {
      setError("Kamida bitta kolleksiya nomini tanlang.");
      return;
    }
    if (!Number.isFinite(percent) || percent < 0 || percent > 99) {
      setError("Skidka foizini 0 dan 99 gacha kiriting.");
      return;
    }

    try {
      setApplying(true);
      setError('');
      setStatus('');

      const { data } = await api.patch<DiscountResponse>('/carpets/discount', {
        names: selectedNames,
        discountPercent: percent,
      });

      const updatedCount = Number(data?.updatedCount ?? 0);
      const standardizedCount = Number(data?.standardizedCount ?? 0);
      const standardizedText =
        standardizedCount > 0
          ? ` ${standardizedCount} ta mahsulot narxi m² bo'yicha tenglashtirildi.`
          : '';

      setStatus(
        `Bajarildi. ${updatedCount} ta mahsulotga -${percent}% skidka qo'llandi.${standardizedText}`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="section-shell py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl leading-[1.15] text-ink">Skidka boshqaruvi</h1>
          <p className="mt-2 text-sm text-ink/60">
            Kolleksiya nomini tanlang (masalan: Steffano, Iran-soft). Tanlangan nomdagi barcha
            model kodlariga bir xil skidka qo&apos;llanadi.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/prices"
            className="rounded-xl border border-sand bg-white px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-sand/40"
          >
            m2 narxlar
          </Link>
          <Link
            href="/admin/carpets"
            className="rounded-xl border border-sand bg-white px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-sand/40"
          >
            Gilamlar ro&apos;yxati
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-sand bg-white px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-sand/40"
          >
            Admin panel
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {status ? (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {status}
        </p>
      ) : null}

      {/* Mavjud skidkalar */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/50 shadow-sm">
        <div className="border-b border-sky-100/50 bg-gradient-to-r from-sky-100/80 via-indigo-50/80 to-emerald-100/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-sm">%</span>
            <div>
              <h2 className="font-bold leading-snug text-ink">Mavjud skidkalar</h2>
              <p className="text-xs text-ink/50">
                {loadingGroups ? 'Yuklanmoqda...' : `${discountGroups.length} ta kolleksiyada skidka mavjud`}
              </p>
            </div>
          </div>
        </div>

        {loadingGroups ? (
          <div className="p-6">
            <div className="h-24 animate-pulse rounded-xl bg-sky-50" />
          </div>
        ) : discountGroups.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink/50">
            <p>Hozircha hech qanday kolleksiyaga skidka qo'llanmagan.</p>
            <p className="mt-1 text-xs text-ink/40">Yuqoridagi forma orqali kolleksiya tanlab, skidka qo'shishingiz mumkin.</p>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {discountGroups.map((group) => {
              const percentColors = [
                { bg: 'from-red-500 to-rose-600', badge: 'bg-red-100 text-red-800' },
                { bg: 'from-orange-500 to-amber-600', badge: 'bg-orange-100 text-orange-800' },
                { bg: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-100 text-emerald-800' },
                { bg: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-800' },
                { bg: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-800' },
                { bg: 'from-pink-500 to-rose-600', badge: 'bg-pink-100 text-pink-800' },
              ];
              const colorIdx = discountGroups.indexOf(group) % percentColors.length;
              const color = percentColors[colorIdx];
              return (
                <div key={group.name} className="relative overflow-hidden rounded-xl border border-sky-100/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${color.bg}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink truncate">{group.name}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {group.carpetCount} ta omborda / {group.totalCount} ta jami
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${color.badge}`}>
                      -{group.discountPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="panel mt-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <input
              type="text"
              value={nameSearch}
              onChange={(event) => setNameSearch(event.target.value)}
              placeholder="Kolleksiya nomi bo'yicha qidirish..."
              className="w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-sand bg-white p-2">
              {loadingNames ? (
                <p className="p-3 text-sm text-ink/50">Yuklanmoqda...</p>
              ) : visibleNames.length === 0 ? (
                <p className="p-3 text-sm text-ink/50">Nomi topilmadi.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {visibleNames.map((name) => {
                    const selected = selectedNames.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleSelectedName(name)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          selected
                            ? 'bg-primary text-white'
                            : 'border border-sand bg-white text-ink/80 hover:bg-sand/50'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-ink/45">
              Tanlangan kolleksiya: <span className="font-semibold">{selectedNames.length}</span> ta
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="number"
              min={0}
              max={99}
              value={discountInput}
              onKeyDown={(event) => {
                if (event.key === '-' || event.key === 'e' || event.key === 'E') {
                  event.preventDefault();
                }
              }}
              onChange={(event) => {
                const value = event.target.value;
                if (value === '') {
                  setDiscountInput('');
                  return;
                }
                const parsed = Number(value);
                if (!Number.isFinite(parsed)) return;
                const clamped = Math.min(99, Math.max(0, parsed));
                setDiscountInput(String(Math.round(clamped)));
              }}
              placeholder="Skidka (%)"
              className="w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <button
              type="button"
              disabled={applying}
              onClick={() => void applyDiscount()}
              className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Bajarildi
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="w-full rounded-xl border border-sand px-4 py-2.5 text-sm font-medium text-ink/60 transition-colors hover:bg-sand/50"
            >
              Tozalash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
