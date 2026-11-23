'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, getErrorMessage, getImageUrl } from '@/services/api';
import { getCategories } from '@/services/carpet.service';
import type { Category } from '@/types/carpet';
import { getPrimaryCarpetImage } from '@/utils/carpet-image';

import { toast } from '@/components/ui/Toast';

type PredefinedName = {
  id: string;
  name: string;
  designCode: string;
  images: string[];
  categoryId?: string;
  material?: string;
  brand?: string;
};

export default function AdminCarpetNamesPage() {
  const [items, setItems] = useState<PredefinedName[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PredefinedName | null>(null);
  const [name, setName] = useState('');
  const [designCode, setDesignCode] = useState('');
  const [material, setMaterial] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteItem, setDeleteItem] = useState<PredefinedName | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [namesRes, cats] = await Promise.all([
        api.get('/carpets/predefined-names', { skipToast: true }),
        getCategories(),
      ]);
      setItems(namesRes.data ?? []);
      setCategories(cats ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.designCode && item.designCode.toLowerCase().includes(q)) ||
        (item.material && item.material.toLowerCase().includes(q))
    );
  }, [items, search]);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setDesignCode('');
    setMaterial('');
    setCategoryId('');
    setImages([]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PredefinedName) => {
    setEditingItem(item);
    setName(item.name || '');
    setDesignCode(item.designCode || '');
    setMaterial(item.material || '');
    setCategoryId(item.categoryId || '');
    setImages(item.images || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Iltimos, gilam shablon nomini kiriting.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        designCode: designCode.trim() || name.trim(),
        material: material.trim() || undefined,
        categoryId: categoryId || undefined,
        images,
      };

      if (editingItem) {
        await api.patch(`/carpets/predefined-names/${editingItem.id}`, payload, { skipToast: true });
        toast.success('Shablon nomi muvaffaqiyatli yangilandi!');
      } else {
        await api.post('/carpets/predefined-names', payload, { skipToast: true });
        toast.success('Yangi shablon nomi yaratildi!');
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await api.delete(`/carpets/predefined-names/${deleteItem.id}`, { skipToast: true });
      toast.success("Shablon nomi muvaffaqiyatli o'chirildi!");
      setDeleteItem(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand/20 py-10">
      <div className="section-shell">


        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-bold text-ink/50 hover:text-primary transition-colors uppercase tracking-wider mb-2"
            >
              ← Admin Boshqaruviga Qaytish
            </Link>
            <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">
              Gilam Nomlari
            </h1>
            <p className="mt-1 text-sm text-ink/60">
              Yangi gilam qo&apos;shishda ishlatiladigan gilam nomlari va gul kodlari ro&apos;yxati.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <span>➕</span> Yangi Gilam Nomi Qo&apos;shish
          </button>
        </div>

        {/* Search */}
        <div className="panel mb-8 p-4 bg-white rounded-2xl shadow-sm border border-sand">
          <div className="relative max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gilam nomi yoki gul kodi bo'yicha qidirish..."
              className="input-field pl-10 text-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">🔍</span>
          </div>
        </div>

        {/* Table */}
        <div className="panel overflow-hidden bg-white rounded-3xl border border-sand shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-ink/50 font-medium animate-pulse">
              Gilam nomlari yuklanmoqda...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-ink/50">
              Gilam nomlari topilmadi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sand bg-sand/10 text-xs font-bold text-ink/60 uppercase tracking-wider">
                    <th className="py-4 px-6">Rasm</th>
                    <th className="py-4 px-6">Gilam Nomi</th>
                    <th className="py-4 px-6">Gul kodi</th>
                    <th className="py-4 px-6">Material</th>
                    <th className="py-4 px-6 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/50 text-sm">
                  {filteredItems.map((item) => {
                    const primaryImg = getPrimaryCarpetImage({
                      id: item.id,
                      name: item.name,
                      designCode: item.designCode,
                      images: item.images,
                    } as any).primary;

                    return (
                      <tr key={item.id} className="hover:bg-sand/5 transition-colors">
                        <td className="py-4 px-6">
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-sand/20 border border-sand/50">
                            <img
                              src={primaryImg}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-ink">{item.name}</td>
                        <td className="py-4 px-6 font-mono text-ink/70">
                          {item.designCode || '-'}
                        </td>
                        <td className="py-4 px-6 text-ink/70">
                          {item.material || '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500 hover:text-white transition-colors"
                            >
                              ✏️ Tahrirlash
                            </button>
                            <button
                              onClick={() => setDeleteItem(item)}
                              className="rounded-xl border border-red-500/30 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition-colors"
                            >
                              🗑️ O&apos;chirish
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-sand animate-scale-up">
            <h2 className="font-serif text-2xl font-bold text-ink mb-4">
              {editingItem ? "Shablon Nomini Tahrirlash" : "Yangi Shablon Nom Qo'shish"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                    Gilam Shablon Nomi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Zenit, Antique, Stefano..."
                    className="input-field font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                    Gul kodi (Dizayn kodi)
                  </label>
                  <input
                    type="text"
                    value={designCode}
                    onChange={(e) => setDesignCode(e.target.value)}
                    placeholder="Masalan: A101, 240540678"
                    className="input-field font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1">
                  Material
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Masalan: Akril, Micro-polyester..."
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-sand px-5 py-2.5 text-sm font-bold text-ink/70 hover:bg-sand/20 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary rounded-2xl px-6 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-100 text-center animate-scale-up">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
              ⚠️
            </div>
            <h3 className="font-serif text-xl font-bold text-ink mb-2">
              Shablon nomini o&apos;chirmoqchimisiz?
            </h3>
            <p className="text-sm text-ink/60 mb-6">
              <strong className="text-ink">{deleteItem.name}</strong> shablon nomi ro&apos;yxatdan o&apos;chiriladi.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="rounded-2xl border border-sand px-5 py-2.5 text-sm font-bold text-ink/70 hover:bg-sand/20 transition-colors"
              >
                Yo&apos;q, bekor qilish
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-2xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-red-700 transition-colors"
              >
                {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
