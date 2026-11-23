'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/services/api';
import Portal from '@/components/Portal';
import { motion } from 'framer-motion';

type ScheduleItem = {
  id: string;
  dateString: string;
  capacity: number;
  reservedOrders: number;
  availableSlots: number;
  status: 'AVAILABLE' | 'FULL' | 'CLOSED';
};

export default function AdminDeliveryPage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal / Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [newCapacity, setNewCapacity] = useState(8);
  const [newStatus, setNewStatus] = useState<'AVAILABLE' | 'FULL' | 'CLOSED'>('AVAILABLE');
  const [saving, setSaving] = useState(false);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get<ScheduleItem[]>('/delivery/admin/schedule?days=14');
      setSchedule(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSchedule();
  }, []);

  const openEditor = (item: ScheduleItem) => {
    setEditingItem(item);
    setNewCapacity(item.capacity);
    setNewStatus(item.status);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    try {
      setSaving(true);
      setError('');
      await api.patch(`/delivery/admin/schedule/${editingItem.dateString}`, {
        capacity: newCapacity,
        status: newStatus,
      });
      setIsEditing(false);
      setEditingItem(null);
      await fetchSchedule();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            AVAILABLE
          </span>
        );
      case 'FULL':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            FULL
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            CLOSED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="section-shell py-12 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/30 rounded-full blur-[100px] -z-10" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider mb-3 select-none"
          >
            ← Admin panelga qaytish
          </Link>
          <h1 className="font-serif text-4xl leading-[1.1] text-ink md:text-5xl">Yetkazib berish boshqaruvi</h1>
          <p className="mt-3 text-ink/60 max-w-xl text-base">
            Toshkent shahri bo&apos;ylab kunlik buyurtmalar limiti (delivery capacity) va slotlar holatini boshqarish tizimi.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm animate-in fade-in slide-in-from-top-4">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-12 flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="mt-10 overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-ink">
              <thead className="bg-slate-50 border-b border-black/5 text-xs font-bold uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="py-4.5 px-6">Sana</th>
                  <th className="py-4.5 px-6">Buyurtmalar soni</th>
                  <th className="py-4.5 px-6">Kunlik sig&apos;im</th>
                  <th className="py-4.5 px-6">Mavjud joylar</th>
                  <th className="py-4.5 px-6">Status</th>
                  <th className="py-4.5 px-6 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {schedule.map((item) => {
                  const percentage = Math.min(100, Math.round((item.reservedOrders / item.capacity) * 100)) || 0;
                  
                  return (
                    <tr key={item.dateString} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4.5 px-6 font-bold text-ink">
                        {item.dateString}
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-ink/80">{item.reservedOrders} / {item.capacity}</span>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentage >= 100 
                                  ? 'bg-rose-500' 
                                  : percentage >= 80 
                                    ? 'bg-amber-500' 
                                    : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-6 font-semibold text-ink/65">
                        {item.capacity} ta buyurtma
                      </td>
                      <td className="py-4.5 px-6">
                        <span className={`font-bold ${item.availableSlots <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {item.availableSlots} ta joy
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(item)}
                          className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 active:scale-95"
                        >
                          ⚙ Tahrirlash
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditing && editingItem && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white border border-white/60 shadow-[0_45px_100px_rgba(0,0,0,0.35)]"
            >
              <div className="relative h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="p-7">
                <h4 className="font-serif text-2xl text-ink">Limitni tahrirlash</h4>
                <p className="mt-1 text-ink/50 text-xs font-bold uppercase tracking-wider">
                  Sana: {editingItem.dateString}
                </p>

                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink/60 uppercase">Kunlik sig&apos;im (Capacity)</label>
                    <input
                      type="number"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="input-field"
                      min={1}
                    />
                    <p className="text-[10px] text-ink/40 leading-relaxed font-semibold">
                      Ushbu sana bo&apos;ylab qabul qilinadigan jami buyurtmalar soni. Hozirgi buyurtmalar: {editingItem.reservedOrders} ta.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink/60 uppercase">Slot statusi</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="input-field"
                    >
                      <option value="AVAILABLE">AVAILABLE (Ochiq)</option>
                      <option value="FULL">FULL (To&apos;lgan)</option>
                      <option value="CLOSED">CLOSED (Yopilgan / Dam olish kuni)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-60"
                  >
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditingItem(null);
                    }}
                    disabled={saving}
                    className="py-3.5 px-6 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm transition hover:bg-slate-100"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </div>
  );
}
