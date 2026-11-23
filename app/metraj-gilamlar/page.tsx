'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import CarpetList from '@/components/CarpetList';
import Pagination from '@/components/Pagination';
import { getCarpets } from '@/services/carpet.service';
import { getErrorMessage, getImageUrl } from '@/services/api';
import { getPrimaryCarpetImage } from '@/utils/carpet-image';
import type { Carpet } from '@/types/carpet';
import { SectionReveal } from '@/components/ui/animation-wrapper';

const LIMIT = 20;

export default function MetrajGilamlarPage() {
  const [carpets, setCarpets] = useState<Carpet[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p: number, q: string) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit: LIMIT, kind: 'roll' };
      if (q.trim()) params.search = q.trim();
      const res = await getCarpets(params);
      setCarpets(res.items ?? []);
      setTotalPages(res.meta?.totalPages ?? 1);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    void load(1, debouncedSearch);
  }, [debouncedSearch, load]);

  useEffect(() => {
    void load(page, debouncedSearch);
  }, [page, load]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/30 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/60 via-amber-50 to-white pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none" />

        <SectionReveal animation="fade-up" className="section-shell relative z-10">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-300/40 bg-orange-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.4em] text-orange-600 shadow-sm mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              Metraj · ROLL Formatda
            </p>
            <h1 className="font-serif text-5xl md:text-6xl leading-[1.1] text-ink">
              Metraj Gilamlar
            </h1>
            <p className="mt-5 text-lg text-ink/60 leading-relaxed max-w-xl">
              Kerakli kenglik va uzunlikni tanlang — biz aniq o&apos;lchangizga qarab kesib beramiz.
              Narxlanish m² bo&apos;yicha amalga oshiriladi.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-orange-200 px-4 py-3 shadow-sm">
                <span className="text-2xl">📏</span>
                <div>
                  <p className="text-xs font-bold text-ink/50 uppercase tracking-wider">Kengliklar</p>
                  <p className="text-sm font-semibold text-ink">80sm dan 400sm gacha</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-orange-200 px-4 py-3 shadow-sm">
                <span className="text-2xl">✂️</span>
                <div>
                  <p className="text-xs font-bold text-ink/50 uppercase tracking-wider">Kesish</p>
                  <p className="text-sm font-semibold text-ink">Aniq o&apos;lchangizga</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-orange-200 px-4 py-3 shadow-sm">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-xs font-bold text-ink/50 uppercase tracking-wider">Narx</p>
                  <p className="text-sm font-semibold text-ink">m² bo&apos;yicha</p>
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* Search */}
      <section className="section-shell py-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gilam nomi bo'yicha qidirish..."
              className="w-full rounded-2xl border border-orange-200/80 bg-white px-4 py-3 pl-10 text-sm text-ink outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 shadow-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="rounded-2xl border border-sand bg-white px-4 py-3 text-sm font-medium text-ink hover:bg-sand/30 transition-colors shadow-sm"
            >
              Tozalash
            </button>
          )}
          <span className="text-sm text-ink/50 ml-auto">
            Jami: <strong>{total}</strong> ta
          </span>
        </div>
      </section>

      {/* Results */}
      <section className="section-shell pb-16">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-orange-100/50" />
            ))}
          </div>
        ) : carpets.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-6xl mb-4">📏</div>
            <p className="text-xl font-serif text-ink/60">Metraj gilamlar topilmadi</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-4 btn-primary rounded-2xl px-6 py-3">
                Hammasini ko&apos;rish
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {carpets.map((carpet) => (
                <Link
                  key={carpet.id}
                  href={`/carpets/${carpet.slug || carpet.id}`}
                  className="group relative block overflow-hidden rounded-2xl bg-white border border-orange-200/50 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:border-orange-300"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={getPrimaryCarpetImage(carpet).primary}
                      alt={carpet.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>

                  {/* ROLL badge */}
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                      📏 ROLL
                    </span>
                  </div>

                  {/* Card content */}
                  <div className="p-3">
                    <p className="text-xs font-bold text-ink truncate">{carpet.name}</p>
                    {carpet.material && (
                      <p className="text-[10px] text-ink/50 mt-0.5 truncate">{carpet.material}</p>
                    )}
                    {Number(carpet.price) > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-ink/40 leading-none">dan</p>
                          <p className="text-xs font-bold text-orange-700 leading-tight">
                            {new Intl.NumberFormat('uz-UZ').format(Number(carpet.price))} so&apos;m
                          </p>
                        </div>
                        <span className="text-[10px] text-ink/40">/ m²</span>
                      </div>
                    )}
                    {carpet.designCodes && carpet.designCodes.length > 0 && (
                      <p className="text-[10px] text-orange-600 font-bold mt-1.5 flex items-center gap-1">
                        🎨 {carpet.designCodes.length} ta dizayn mavjud
                      </p>
                    )}
                    {carpet.stock > 0 && (
                      <p className="text-[10px] text-emerald-600 font-medium mt-1">
                        ✓ {carpet.stock}+ m mavjud
                      </p>
                    )}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors duration-300 rounded-2xl" />
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <Pagination
                  page={page}
                  limit={LIMIT}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
