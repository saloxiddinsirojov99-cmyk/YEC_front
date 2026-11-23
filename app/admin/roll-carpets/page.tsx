'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, formatPrice, getErrorMessage, getImageUrl } from '@/services/api';
import type { CarpetListResponse } from '@/types/carpet';

type RollInventory = {
  id: string;
  widthCm: number;
  originalLengthCm: number;
  currentLengthCm: number;
  reservedLengthCm: number;
  pricePerM2: number;
};

type RollCarpet = {
  id: string;
  name: string;
  slug: string;
  size: string;
  material: string;
  price: number;
  stock: number;
  images: string[];
  category: { id: string; name: string };
  type: string;
  rollInventories?: RollInventory[];
  createdAt: string;
};

export default function AdminRollCarpetsPage() {
  const [items, setItems] = useState<RollCarpet[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async (p: number, q: string) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit, kind: 'roll', showAll: true };
      if (q.trim()) params.search = q.trim();
      const { data } = await api.get<CarpetListResponse>('/carpets', { params });
      setItems((data.items ?? []) as unknown as RollCarpet[]);
      setTotalPages(data.meta?.totalPages ?? 1);
      setTotal(data.meta?.total ?? 0);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void load(1, searchInput);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchInput, load]);

  useEffect(() => {
    void load(page, searchInput);
  }, [page, load]);

  const remove = async (id: string) => {
    if (!confirm("Bu gilam va barcha variantlarini o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/carpets/${id}`);
      void load(page, searchInput);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const cmToM = (cm: number) => (cm / 100).toFixed(2);

  return (
    <div className="section-shell py-8">
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm text-ink/50 hover:text-ink mb-2 inline-flex items-center gap-1">
              ← Admin panel
            </Link>
            <h1 className="font-serif text-4xl leading-[1.15] text-ink">
              📏 Metraj Gilamlar (ROLL)
            </h1>
            <p className="text-ink/50 mt-1 text-sm">
              Jami: <strong>{total}</strong> ta ROLL kolleksiya
            </p>
          </div>
          <Link
            href="/admin/carpets/create?type=roll"
            className="btn-primary flex items-center justify-center gap-2 rounded-2xl py-4 px-8 text-lg shadow-lg ring-4 ring-primary/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="text-2xl">+</span>
            Yangi metraj gilam qo&apos;shish
          </Link>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nomi bo'yicha qidirish..."
            className="flex-1 rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="btn-secondary px-4 py-2.5 text-sm font-medium rounded-xl"
            >
              Tozalash
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-ink/40">Yuklanmoqda...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-ink/40">
              <div className="text-6xl mb-4">📏</div>
              <p className="text-lg font-medium">Hozircha metraj gilamlar yo&apos;q.</p>
              <Link href="/admin/carpets/create?type=roll" className="btn-primary mt-4 inline-flex px-6 py-3 rounded-2xl">
                Birinchi metraj gilam qo&apos;shish
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const isExpanded = expandedId === item.id;
              const rolls: RollInventory[] = (item as any).rollInventories ?? [];
              const totalAvailableM = rolls.reduce((sum, r) => sum + (r.currentLengthCm - r.reservedLengthCm), 0) / 100;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-sand bg-white shadow-sm overflow-hidden transition-all"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-sand/20">
                      {item.images?.[0] ? (
                        <img
                          src={getImageUrl(item.images[0]) || undefined}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📏</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink truncate">{item.name}</span>
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                          ROLL
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-ink/50">{item.category?.name}</span>
                        <span className="text-xs text-ink/50">{item.material}</span>
                        <span className="text-xs font-medium text-emerald-700">
                          {rolls.length} ta variant
                        </span>
                        <span className="text-xs text-ink/60">
                          Jami: ~{cmToM(rolls.reduce((s, r) => s + r.currentLengthCm, 0))} m mavjud
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="rounded-xl border border-sand bg-sand/20 px-3 py-2 text-sm font-medium text-ink hover:bg-sand/40 transition-colors"
                      >
                        {isExpanded ? '▲ Yopish' : '▼ Variantlar'}
                      </button>
                      <Link
                        href={`/admin/carpets/create?id=${item.id}&type=roll`}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        ✏️ Tahrir
                      </Link>
                      <Link
                        href={`/admin/carpets/create?type=roll&name=${encodeURIComponent(item.name)}&categoryId=${item.category?.id}`}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        + Variant
                      </Link>
                      <button
                        onClick={() => void remove(item.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Expanded variants */}
                  {isExpanded && (
                    <div className="border-t border-sand/50 bg-orange-50/30 px-4 pb-4 pt-3">
                      <h4 className="text-sm font-bold text-ink/70 mb-3 uppercase tracking-wider">
                        Kenglik variantlari
                      </h4>
                      {rolls.length === 0 ? (
                        <p className="text-sm text-ink/40 py-2">Variantlar topilmadi.</p>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {rolls.map((roll) => {
                            const availableCm = roll.currentLengthCm - roll.reservedLengthCm;
                            const availableM = availableCm / 100;
                            const usedPercent = roll.originalLengthCm > 0
                              ? Math.round((1 - roll.currentLengthCm / roll.originalLengthCm) * 100)
                              : 0;
                            const statusColor = availableM <= 0 ? 'bg-red-100 border-red-200' :
                              availableM < 5 ? 'bg-amber-100 border-amber-200' : 'bg-white border-sand';

                            return (
                              <div key={roll.id} className={`rounded-xl border p-3 ${statusColor}`}>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-bold text-ink text-sm">
                                      📏 {roll.widthCm} sm kenglik
                                    </p>
                                    <p className="text-xs text-ink/60 mt-0.5">
                                      {formatPrice(roll.pricePerM2)} / m²
                                    </p>
                                  </div>
                                  {availableM <= 0 ? (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-100 rounded-full px-2 py-0.5">TUGAGAN</span>
                                  ) : availableM < 5 ? (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">OZ QOLDI</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">MAVJUD</span>
                                  )}
                                </div>

                                <div className="mt-2 space-y-1">
                                  <div className="flex justify-between text-xs text-ink/60">
                                    <span>Asl uzunlik:</span>
                                    <span className="font-medium">{cmToM(roll.originalLengthCm)} m</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-ink/60">
                                    <span>Qoldi:</span>
                                    <span className="font-medium text-ink">{cmToM(roll.currentLengthCm)} m</span>
                                  </div>
                                  {roll.reservedLengthCm > 0 && (
                                    <div className="flex justify-between text-xs text-amber-700">
                                      <span>Band qilingan:</span>
                                      <span className="font-medium">{cmToM(roll.reservedLengthCm)} m</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-xs text-emerald-700 font-bold">
                                    <span>Erkin:</span>
                                    <span>{availableM.toFixed(2)} m</span>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-2 h-1.5 bg-sand/50 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all"
                                    style={{ width: `${usedPercent}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-ink/40 mt-0.5 text-right">{usedPercent}% ishlatildi</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary px-4 py-2 text-sm rounded-xl disabled:opacity-40"
            >
              ← Oldingi
            </button>
            <span className="text-sm text-ink/60">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary px-4 py-2 text-sm rounded-xl disabled:opacity-40"
            >
              Keyingi →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
