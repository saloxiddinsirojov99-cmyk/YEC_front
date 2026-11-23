'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api, formatPrice, formatDateOnly, getErrorMessage } from '@/services/api';
import type { CarpetListResponse } from '@/types/carpet';
import { clampDiscountPercent, getDiscountedPrice } from '@/utils/price';
import * as XLSX from 'xlsx';
import Portal from '@/components/Portal';

export default function AdminCarpetsPage() {
  const [items, setItems] = useState<CarpetListResponse['items']>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sizeInput, setSizeInput] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [debouncedSearchInput, setDebouncedSearchInput] = useState('');
  const [debouncedSizeInput, setDebouncedSizeInput] = useState('');
  const [debouncedKindFilter, setDebouncedKindFilter] = useState('');
  const limit = 30;

  // Excel Import States & Refs
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [importResult, setImportResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Universal column lookup: trim + lowercase + strip spaces/dashes/apostrophes
  const getColumnValue = (row: any, keys: string[]): any => {
    if (!row || typeof row !== 'object') return undefined;
    const norm = (k: string) =>
      String(k).trim().toLowerCase().replace(/[\s\-_''`'"]/g, '');
    const normalizedKeys = keys.map(norm);
    for (const k of Object.keys(row)) {
      if (normalizedKeys.includes(norm(k))) return row[k];
    }
    return undefined;
  };

  // CSV/TXT download helper
  const downloadList = (codes: string[], filename: string) => {
    if (!codes.length) return;
    const content = 'Code\n' + codes.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!items.length) {
      alert("Eksport qilish uchun mahsulotlar mavjud emas.");
      return;
    }
    const headers = ['Nomi', 'Shtrixkod', 'O\'lchami', 'Materiali', 'Kategoriyasi', 'Dizayn Kodi', 'Narxi', 'Qoldiq'];
    const rows = items.map((carpet) => [
      carpet.name,
      carpet.barcode || '',
      carpet.size,
      carpet.material,
      carpet.category?.name || '',
      carpet.patternCode || carpet.designCode || '',
      carpet.price,
      carpet.stock
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gilamlar_shtrixkodlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format milliseconds → HH:MM:SS
  const formatDuration = (ms: number) => {
    const s = Math.round(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };


  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>, importType: 'auto' | 'roll' = 'auto') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be re-selected if needed
    event.target.value = '';

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      alert("Faqat .xlsx va .xls formatidagi Excel fayllarini import qilish mumkin!");
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: 0, percentage: 0 });
    setImportResult(null);

    const importStartedAt = Date.now();

    // Use ArrayBuffer for both SHA-256 hashing and XLSX parsing
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;

        // Compute SHA-256 of the file content for duplicate-file detection
        let fileHash = '';
        try {
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          fileHash = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        } catch { /* crypto not available in some envs — ignore */ }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet);

        if (!rawRows || rawRows.length === 0) {
          throw new Error("Excel fayl bo'sh yoki o'qib bo'lmadi.");
        }

        const processedCodes = new Set<string>();
        const validRows: any[] = [];
        let duplicateExcelCount = 0;
        let emptyCodeCount = 0;

        for (const row of rawRows as any[]) {
          const widthVal = getColumnValue(row, ['kenglik', 'kengligi', 'width', 'widthcm', 'ширина', 'widthCm', 'eni', 'эни', 'эni']);
          const lengthVal = getColumnValue(row, ['uzunlik', 'uzunligi', 'length', 'lengthcm', 'длина', 'originalLengthCm', 'lengthCm', 'boyi', 'буйи', 'бўйи']);
          const sizeVal = getColumnValue(row, ['razmer', 'o\'lcham', 'o\'lchami', 'o`lchami', 'size', 'sizes', 'размер', 'ширина/длина', 'размеры']);
          const sizeStr = sizeVal ? String(sizeVal).trim().toUpperCase() : '';
          const typeVal = getColumnValue(row, ['type', 'turi', 'тип']);

          const hasWidth = widthVal !== undefined && widthVal !== null && String(widthVal).trim() !== '';
          const hasLength = lengthVal !== undefined && lengthVal !== null && String(lengthVal).trim() !== '';

          let isRowRoll = importType === 'roll';
          if (!isRowRoll) {
            if (typeVal) {
              const t = String(typeVal).trim().toUpperCase();
              isRowRoll = (t === 'ROLL' || t === 'METRAJ');
            } else if (sizeStr === 'ROLL' || sizeStr === 'METRAJ') {
              isRowRoll = true;
            } else if (hasWidth && hasLength && !sizeStr) {
              isRowRoll = true;
            } else if (hasWidth && hasLength && sizeStr && isNaN(Number(sizeStr.split('x')[0]))) {
              isRowRoll = true;
            }
          }

          if (isRowRoll) {
            validRows.push(row);
          } else {
            const codeVal = getColumnValue(row, [
              'Kodi','Коди','code','Code','Product Code','ProductCode',
              'Mahsulot kodi','Артикул','SKU','sku','kod','Kod',
            ]);
            const code = codeVal ? String(codeVal).trim() : '';

            if (!code) {
              emptyCodeCount++;
              continue;
            }

            if (processedCodes.has(code)) {
              duplicateExcelCount++;
              continue;
            }

            processedCodes.add(code);
            validRows.push(row);
          }
        }

        const totalValid = validRows.length;
        setImportProgress({ current: 0, total: totalValid, percentage: 0 });

        let totalSuccess = 0;
        let totalFailed = 0;
        const allErrors: { row: number; reason: string }[] = [];

        const batchSize = 150;
        for (let i = 0; i < totalValid; i += batchSize) {
          const batch = validRows.slice(i, i + batchSize);
          
          const response = await api.post('/carpets/import-batch', {
            type: importType,
            items: batch.map((item, idx) => {
              const originalIndex = rawRows.indexOf(item);
              const rowNum = originalIndex !== -1 ? originalIndex + 2 : i + idx + 2;
              return { ...item, __rowNum__: rowNum };
            })
          });

          const resData = response.data;
          totalSuccess += resData.successCount ?? 0;
          totalFailed += resData.failedCount ?? 0;
          if (resData.errors) {
            allErrors.push(...resData.errors);
          }

          const currentProcessed = Math.min(i + batchSize, totalValid);
          const percent = Math.round((currentProcessed / totalValid) * 100);
          setImportProgress({ current: currentProcessed, total: totalValid, percentage: percent });

          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const importFinishedAt = Date.now();
        const durationMs = importFinishedAt - importStartedAt;

        await api.post('/carpets/import-log', {
          fileName:             file.name,
          fileHash,
          importType:           'auto',
          startedAt:            new Date(importStartedAt).toISOString(),
          finishedAt:           new Date(importFinishedAt).toISOString(),
          durationMs,
          totalRows:            rawRows.length,
          addedCount:           totalSuccess,
          successCount:         totalSuccess,
          skipCount:            rawRows.length - totalSuccess,
          duplicateCount:       duplicateExcelCount,
          noImageCount:         0,
          validationErrorCount: totalFailed,
          failedCount:          totalFailed,
          browser:              navigator.userAgent,
          version:              '1.0',
          details: {
            successCount:      totalSuccess,
            failedCount:       totalFailed,
            duplicateExcelCount,
            emptyCodeCount,
            durationMs,
            errors: allErrors,
          }
        });

        setImportResult({
          total:            rawRows.length,
          success:          totalSuccess,
          failed:           totalFailed + emptyCodeCount + duplicateExcelCount,
          errors: [
            ...allErrors,
            ...Array.from({ length: emptyCodeCount }).map((_, idx) => ({ row: 0, reason: `Barcode (Kodi) bo‘sh` })),
            ...Array.from({ length: duplicateExcelCount }).map((_, idx) => ({ row: 0, reason: `Fayl ichida takrorlangan` }))
          ],
          durationMs,
        });
        
        setImporting(false);
        setShowResultModal(true);
        void load(page, debouncedSearchInput, debouncedSizeInput, debouncedKindFilter);

      } catch (err: any) {
        console.error('Import error:', err);
        setImporting(false);
        alert(`Import jarayonida xatolik yuz berdi: ${err.message || "Noma'lum xato"}`);
      }
    };
    reader.onerror = () => {
      setImporting(false);
      alert("Faylni o'qishda xatolik yuz berdi.");
    };
    reader.readAsArrayBuffer(file);
  };

  const load = useCallback(async (p: number, q: string, s: string, k: string) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit, showAll: true };
      if (q.trim()) params.search = q.trim();
      if (s.trim()) params.size = s.trim();
      if (k) params.kind = k;
      const { data } = await api.get<CarpetListResponse>('/carpets', { params });
      setItems(data.items ?? []);
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
    const timer = window.setTimeout(() => {
      setDebouncedSearchInput(searchInput);
      setDebouncedSizeInput(sizeInput);
      setDebouncedKindFilter(kindFilter);
      setPage(1);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, sizeInput, kindFilter]);

  // Load search filters from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search') || '';
      const s = params.get('size') || '';
      const k = params.get('kind') || '';
      if (q) { setSearchInput(q); setDebouncedSearchInput(q); }
      if (s) { setSizeInput(s); setDebouncedSizeInput(s); }
      if (k) { setKindFilter(k); setDebouncedKindFilter(k); }
    }
  }, []);

  // Update URL search params when filters change so refresh preserves search
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (debouncedSearchInput.trim()) url.searchParams.set('search', debouncedSearchInput.trim());
      else url.searchParams.delete('search');

      if (debouncedSizeInput.trim()) url.searchParams.set('size', debouncedSizeInput.trim());
      else url.searchParams.delete('size');

      if (debouncedKindFilter) url.searchParams.set('kind', debouncedKindFilter);
      else url.searchParams.delete('kind');

      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [debouncedSearchInput, debouncedSizeInput, debouncedKindFilter]);

  useEffect(() => {
    void load(page, debouncedSearchInput, debouncedSizeInput, debouncedKindFilter);
  }, [page, debouncedSearchInput, debouncedSizeInput, debouncedKindFilter, load]);

  const handleClearSearch = () => {
    setSearchInput('');
    setSizeInput('');
    setKindFilter('');
    setDebouncedSearchInput('');
    setDebouncedSizeInput('');
    setDebouncedKindFilter('');
    setPage(1);
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/carpets/${id}`);
      await load(page, debouncedSearchInput, debouncedSizeInput, debouncedKindFilter);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="section-shell py-8">
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-4xl leading-[1.15] text-ink">Gilamlar, joynamozlar va oval gilamlar</h1>
        <div className="grid gap-3 md:grid-cols-6">
          <Link
            href="/admin/carpets/create"
            className="btn-primary flex items-center justify-center gap-2 rounded-2xl py-5 text-xl shadow-lg ring-4 ring-primary/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="text-3xl">+</span>
            Yangi gilam qo&apos;shish
          </Link>
          <Link
            href="/admin/carpets/create?type=roll"
            className="btn-secondary flex items-center justify-center gap-2 rounded-2xl border-orange-200 bg-orange-50/70 py-5 text-xl font-semibold text-orange-700 shadow-lg ring-4 ring-orange-200/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="text-3xl">+</span>
            Metraj gilam qo&apos;shish
          </Link>
          <Link
            href="/admin/carpets/create?type=joynamoz"
            className="btn-secondary flex items-center justify-center gap-2 rounded-2xl border-emerald-200 bg-emerald-50/70 py-5 text-xl font-semibold text-emerald-700 shadow-lg ring-4 ring-emerald-200/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="text-3xl">+</span>
            Yangi joynamoz qo&apos;shish
          </Link>
          <Link
            href="/admin/carpets/create?type=oval"
            className="btn-secondary flex items-center justify-center gap-2 rounded-2xl border-fuchsia-200 bg-fuchsia-50/70 py-5 text-xl font-semibold text-fuchsia-700 shadow-lg ring-4 ring-fuchsia-200/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="text-3xl">+</span>
            Yangi oval gilam
          </Link>
          <Link
            href="/admin/carpets/restock"
            className="btn-secondary flex items-center justify-center gap-2 rounded-2xl border-sky-200 bg-sky-50/70 py-5 text-xl font-semibold text-sky-700 shadow-lg ring-4 ring-sky-200/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            Avval qo&apos;shilgan gilamni qo&apos;shish
          </Link>
          <Link
            href="/admin/discounts"
            className="btn-secondary flex items-center justify-center gap-2 rounded-2xl border-amber-200 bg-amber-50/70 py-5 text-xl font-semibold text-amber-700 shadow-lg ring-4 ring-amber-200/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            Skidka boshqaruvi
          </Link>
          <Link
            href="/admin/prices"
            className="btn-secondary flex items-center justify-center gap-2 rounded-2xl border-indigo-200 bg-indigo-50/70 py-5 text-xl font-semibold text-indigo-700 shadow-lg ring-4 ring-indigo-200/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            m2 narx boshqaruvi
          </Link>
        </div>

        {/* Excel Import Row */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => excelFileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 py-5 text-xl font-bold text-amber-800 shadow-md hover:shadow-lg hover:border-amber-300 ring-4 ring-amber-500/5 transition-all hover:scale-[1.01] active:scale-95 duration-200"
          >
            <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Exceldan import qilish (Tayyor va Metraj)</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            className="flex-1 flex items-center justify-center gap-3 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 py-5 text-xl font-bold text-emerald-800 shadow-md hover:shadow-lg hover:border-emerald-300 ring-4 ring-emerald-500/5 transition-all hover:scale-[1.01] active:scale-95 duration-200"
          >
            <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Eksport qilish (CSV)</span>
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={excelFileInputRef}
          onChange={(e) => handleExcelImport(e, 'auto')}
          accept=".xlsx, .xls"
          className="hidden"
        />
      </div>

      {/* Search */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Nomi bo'yicha..."
          className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
        <input
          type="text"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          placeholder="O'lchami bo'yicha..."
          className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        >
          <option value="">Barchasi</option>
          <option value="carpet">Faqat gilamlar</option>
          <option value="prayer">Faqat joynamozlar</option>
          <option value="oval">Faqat oval gilamlar</option>
          <option value="roll">Faqat metraj gilamlar</option>
        </select>
        <div className="flex gap-2">
          {(searchInput || sizeInput || kindFilter) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="btn-secondary w-full px-4 py-2.5 text-sm font-medium md:w-auto"
            >
              Tozalash
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <div className="flex items-end gap-3 border-b border-sand pb-4">
          <h2 className="font-serif text-2xl leading-snug text-ink">Mavjud mahsulotlar</h2>
          <span className="text-sm font-medium text-ink/40">
            Jami: {total} ta {debouncedSearchInput && `("${debouncedSearchInput}" bo'yicha)`}
          </span>
        </div>

        {loading ? (
          <p className="py-12 text-center text-ink/40">Yuklanmoqda...</p>
        ) : (
          <div className="grid gap-3">
            {items.length === 0 ? (
              <p className="py-12 text-center text-ink/40">Hozircha mahsulotlar yo&apos;q.</p>
            ) : (
              items.map((carpet) => {
                const discountPercent = clampDiscountPercent(carpet.discountPercent);
                const discountedPrice = getDiscountedPrice(carpet.price, discountPercent);

                return (
                  <article key={carpet.id} className="panel flex items-center justify-between p-5 transition-transform hover:-translate-y-0.5">
                    <div>
                      <p className="text-lg font-bold text-ink">
                        {carpet.name}
                        {(carpet.patternCode || carpet.designCode) ? (
                          <span className="ml-2 font-mono text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                             #{carpet.patternCode || carpet.designCode}
                          </span>
                        ) : null}
                        {carpet.barcode ? (
                          <span className="ml-2 font-mono text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                             Shtrixkod: {carpet.barcode}
                          </span>
                        ) : null}
                        {discountPercent > 0 ? (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-700 ring-1 ring-amber-200">
                            -{discountPercent}% skidka
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-ink/65">
                        <span className="rounded bg-sand px-1.5 py-0.5 font-mono">
                          {carpet.widthMm && carpet.lengthMm 
                            ? `${carpet.widthMm / 10}x${carpet.lengthMm / 10} sm` 
                            : carpet.size}
                        </span>
                        <span className="mx-2 text-primary">|</span>
                        {discountPercent > 0 ? (
                          <>
                            <span className="font-semibold text-primary line-through decoration-red-500 decoration-2">
                              {formatPrice(carpet.price)}
                            </span>
                            <span className="mx-2 text-ink/20">|</span>
                            <span className="font-semibold text-amber-600">
                              {formatPrice(discountedPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold text-primary">{formatPrice(carpet.price)}</span>
                        )}
                      {carpet.category?.name ? (
                        <>
                          <span className="mx-2 text-ink/20">|</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${carpet.category.name.toLowerCase().includes('joynamoz')
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-sky-100 text-sky-700'
                            }`}>
                            {carpet.category.name}
                          </span>
                        </>
                      ) : null}
                        <span className="mx-2 text-ink/20">|</span>
                        <span>Qoldiq: <span className={carpet.stock <= 3 ? 'font-bold text-red-500' : 'font-medium'}>{carpet.stock} ta</span></span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/carpets/create?id=${carpet.id}`}
                        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100"
                      >
                        ✏️ Tahrirlash
                      </Link>
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm("Rostdan ham bu gilamni o'chirmoqchimisiz?")) void remove(carpet.id);
                        }}
                      >
                        O&apos;chirish
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (() => {
          const from = (page - 1) * limit + 1;
          const to = Math.min(page * limit, total);
          return (
            <div className="flex items-center justify-center gap-3 py-8">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-sand bg-white px-4 py-3 text-lg font-bold text-ink transition-colors hover:bg-sand/50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ←
              </button>
              <span className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-lg font-bold text-primary">
                {from}–{to} / {total}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-xl border border-sand bg-white px-4 py-3 text-lg font-bold text-ink transition-colors hover:bg-sand/50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                →
              </button>
            </div>
          );
        })()}
      </div>

      {/* Progress Modal */}
      {importing && (
        <Portal>
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-gold/10">
              <h3 className="font-serif text-2xl font-bold text-ink mb-6 text-center">Excel fayl o&apos;qilmoqda...</h3>
              
              <div className="mb-4 flex items-center justify-between text-sm font-semibold text-ink/75">
                <span>Import qilinmoqda:</span>
                <span>{importProgress.current} / {importProgress.total} ({importProgress.percentage}%)</span>
              </div>

              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  style={{ width: `${importProgress.percentage}%` }}
                />
              </div>
              
              <p className="mt-6 text-center text-xs text-ink/50 animate-pulse">
                Iltimos, import jarayoni tugaguncha sahifani yopmang yoki yangilamang.
              </p>
            </div>
          </div>
        </Portal>
      )}

      {/* Results Modal */}
      {showResultModal && importResult && (
        <Portal>
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-250">
            <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl border border-sand/40 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-sand/35 pb-4 mb-6">
                <h3 className="font-serif text-3xl font-bold text-ink">Import Natijalari</h3>
                <button onClick={() => setShowResultModal(false)} className="text-ink/40 hover:text-ink/80 text-2xl font-bold transition">&times;</button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex flex-col items-center text-center">
                  <span className="text-xs font-semibold text-slate-500 mb-1">Jami qatorlar</span>
                  <span className="text-3xl font-black text-slate-800">{importResult.total}</span>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100 flex flex-col items-center text-center">
                  <span className="text-xs font-semibold text-emerald-600 mb-1">✅ Muvaffaqiyatli</span>
                  <span className="text-3xl font-black text-emerald-700">{importResult.success}</span>
                </div>
                <div className="rounded-2xl bg-red-50 p-4 border border-red-100 flex flex-col items-center text-center">
                  <span className="text-xs font-semibold text-red-600 mb-1">❌ Xatoliklar</span>
                  <span className="text-3xl font-black text-red-700">{importResult.failed}</span>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4 border border-sky-100 flex flex-col items-center text-center">
                  <span className="text-xs font-semibold text-sky-600 mb-1">⏱️ Import vaqti</span>
                  <span className="text-2xl font-black text-sky-700 font-mono">
                    {importResult.durationMs != null ? formatDuration(importResult.durationMs) : '—'}
                  </span>
                </div>
              </div>

              {/* Errors list */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-ink mb-2">Xatolik tafsilotlari:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 rounded-2xl border border-red-100 bg-red-50/30 p-4">
                    {importResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="text-xs text-red-800 flex gap-2">
                        <span className="font-bold bg-red-100 px-1.5 py-0.5 rounded text-red-700 h-fit whitespace-nowrap">
                          {err.row > 0 ? `${err.row}-qator` : 'Tizim'}
                        </span>
                        <span className="flex-1">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowResultModal(false)}
                className="btn-primary w-full py-4 rounded-2xl text-lg font-bold shadow-lg mt-2"
              >
                Yopish
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
