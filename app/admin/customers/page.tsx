'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, formatPrice, getErrorMessage } from '@/services/api';
import { getUserFromToken } from '@/services/auth.service';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role?: string | null;
  birthDate: string | null;
  telegramUsername: string | null;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  totalPurchaseAmount: number;
  createdAt: string;
};

type CustomerListResponse = {
  items: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatNameInput(val: string): string {
  let s = val.replace(/^\s+/, '');
  s = s.replace(/\s+/g, ' ');
  return s.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Filtering states
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Add Customer Modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBirthDate, setCustomerBirthDate] = useState('');
  const [customerTelegram, setCustomerTelegram] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Edit Customer Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [updatingCustomer, setUpdatingCustomer] = useState(false);

  // SMS Modal states (General / Custom SMS)
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsTarget, setSmsTarget] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [smsTargetPhone, setSmsTargetPhone] = useState('');
  const [smsTargetName, setSmsTargetName] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    const user = getUserFromToken();
    if (user?.role) {
      setUserRole(user.role);
    }
  }, []);

  const load = useCallback(async (p: number, q: string) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page: p, limit: 15 };
      if (q.trim()) params.search = q.trim();

      const { data } = await api.get<CustomerListResponse>('/customers', { params });
      setCustomers(data.items ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
      setTotalCount(data.meta?.total ?? 0);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void load(1, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, load]);

  // Page trigger
  useEffect(() => {
    void load(page, search);
  }, [page, load]);

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditBirthDate(
      customer.birthDate ? new Date(customer.birthDate).toISOString().split('T')[0] : ''
    );
    setEditTelegram(customer.telegramUsername || '');
    setShowEditModal(true);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Ism va Telefon raqami kiritilishi shart.");
      return;
    }

    try {
      setAddingCustomer(true);
      await api.post('/customers/offline', {
        name: customerName,
        phone: customerPhone,
        birthDate: customerBirthDate || undefined,
        telegramUsername: customerTelegram || undefined,
      });

      setSuccessMsg("Yangi mijoz muvaffaqiyatli qo'shildi.");
      setShowAddCustomerModal(false);
      
      // Clear form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerBirthDate('');
      setCustomerTelegram('');

      void load(page, search);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editName.trim() || !editPhone.trim()) {
      alert("Ism va Telefon raqami kiritilishi shart.");
      return;
    }

    try {
      setUpdatingCustomer(true);
      await api.patch(`/customers/${editingCustomer.id}`, {
        name: editName,
        phone: editPhone,
        birthDate: editBirthDate || undefined,
        telegramUsername: editTelegram || undefined,
      });

      setSuccessMsg(`"${editName}" mijoz ma'lumotlari muvaffaqiyatli yangilandi.`);
      setShowEditModal(false);
      setEditingCustomer(null);

      void load(page, search);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsMessage.trim()) {
      alert("SMS matni bo'sh bo'lishi mumkin emas.");
      return;
    }

    try {
      setSendingSms(true);
      const payload: Record<string, any> = {
        target: smsTarget,
        message: smsMessage,
      };

      if (smsTarget === 'SPECIFIC') {
        payload.phoneNumbers = [smsTargetPhone];
      }

      const { data } = await api.post('/customers/sms', payload);
      setSuccessMsg(data.message || 'SMS muvaffaqiyatli yuborildi.');
      setShowSmsModal(false);
      setSmsMessage('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSendingSms(false);
    }
  };

  const openDirectSmsModal = (customer: Customer) => {
    setSmsTarget('SPECIFIC');
    setSmsTargetPhone(customer.phone);
    setSmsTargetName(customer.name);
    setSmsMessage(`Xurmatli ${customer.name}, YEC Market do'konimizdan yangilik: `);
    setShowSmsModal(true);
  };

  const isOperator = userRole === 'OPERATOR';

  return (
    <div className="section-shell py-8 space-y-6">
      {/* Operator Banner Header */}
      {isOperator && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-500/10 via-sky-50 to-emerald-500/10 p-4.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
              🎧
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-ink text-lg">OPERATOR ISH OYNASI</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-700 border border-sky-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  FAOL OPERATOR
                </span>
              </div>
              <p className="text-xs text-ink/60 mt-0.5">
                Mijozlar ma&apos;lumotlarini tahrirlash, yangi mijoz qo&apos;shish va umumiy SMS xabarlar yuborish.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSmsTarget('ALL');
                setSmsTargetName('');
                setSmsTargetPhone('');
                setSmsMessage('');
                setShowSmsModal(true);
              }}
              className="btn-primary py-2.5 px-4 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
            >
              ✉️ Umumiy SMS Xabar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sand pb-4">
        <div>
          {!isOperator && (
            <Link href="/admin" className="text-xs text-ink/50 hover:text-ink transition-colors mb-1 inline-block">
              ← Admin Dashboard
            </Link>
          )}
          <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-ink !leading-[1.35] tracking-wide py-0.5">
            Mijozlar Boshqaruvi
          </h1>
          <p className="text-ink/50 mt-1 text-sm">
            Jami mijozlar: <strong>{totalCount}</strong> ta
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/admin/customers/register"
            className="btn-primary flex items-center gap-2 rounded-xl py-3 px-4 text-sm font-bold shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            ⚡ Tezkor ro&apos;yxatga olish
          </Link>
          <button
            onClick={() => {
              setSmsTarget('ALL');
              setSmsTargetName('');
              setSmsTargetPhone('');
              setSmsMessage('');
              setShowSmsModal(true);
            }}
            className="btn-secondary flex items-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-sky-700 border-sky-200 bg-sky-50/70 hover:bg-sky-100"
          >
            ✉️ SMS Xabar yuborish
          </button>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="btn-primary flex items-center gap-2 rounded-xl py-3 px-4 text-sm font-bold shadow-lg"
          >
            ➕ Yangi Mijoz
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium animate-fadeIn">
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Filter Row */}
      <div className="flex items-center gap-3 bg-white border border-sand p-4 rounded-2xl shadow-sm">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-ink/40 uppercase tracking-wider block mb-1">Mijozlarni Qidirish</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, telefon yoki email bo'yicha qidiruv..."
            className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-xs text-ink outline-none transition focus:border-primary/40"
          />
        </div>
        {search && (
          <div className="flex items-end pt-5">
            <button
              onClick={() => setSearch('')}
              className="btn-secondary text-xs py-2.5 px-4 rounded-xl border-sand text-ink hover:bg-sand/30"
            >
              Tozalash
            </button>
          </div>
        )}
      </div>

      {/* Main Customers List */}
      <div className="bg-white border border-sand rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-ink/40">Yuklanmoqda...</div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center text-ink/40">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-lg font-serif">Mijozlar topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-sand/10 border-b border-sand text-ink/50 font-bold uppercase tracking-wider">
                  <th className="py-4.5 px-6">Mijoz</th>
                  <th className="py-4.5 px-6">Aloqa</th>
                  <th className="py-4.5 px-6 text-right min-w-[150px]">Jami xarid</th>
                  <th className="py-4.5 px-10 text-center min-w-[160px]">Oxirgi xarid</th>
                  <th className="py-4.5 px-6 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/50">
                {customers.filter((c) => !c.role || c.role === 'CUSTOMER').map((c) => (
                  <tr key={c.id} className="hover:bg-sand/5 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="font-bold text-ink text-sm flex items-center gap-1.5 flex-wrap">
                        {(c.role === 'SUPERADMIN' || c.role === 'ADMIN') && (
                          <span className="text-amber-500 text-base leading-none">⭐</span>
                        )}
                        <span>{c.name}</span>
                        {c.role === 'SUPERADMIN' ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/40 shadow-sm">
                            ★ Bosh Admin
                          </span>
                        ) : c.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-500/40 shadow-sm">
                            ★ Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                            Offline Mijoz
                          </span>
                        )}
                      </div>
                      {c.birthDate && (
                        <div className="text-[10px] text-ink/40 mt-0.5">
                          🍰 Tug&apos;ilgan kun: {new Date(c.birthDate).toLocaleDateString('uz-UZ')}
                        </div>
                      )}
                    </td>
                    <td className="py-4.5 px-6 space-y-0.5">
                      <div className="font-semibold text-ink/80">{c.phone}</div>
                      {c.email && <div className="text-ink/40 text-[10px]">{c.email}</div>}
                      {c.telegramUsername && (
                        <div className="text-sky-600 text-[10px] font-medium">
                          @{c.telegramUsername}
                        </div>
                      )}
                    </td>
                    <td className="py-4.5 px-6 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatPrice(c.totalPurchaseAmount)}
                    </td>
                    <td className="py-4.5 px-10 text-center text-ink/70 font-medium whitespace-nowrap">
                      {c.lastPurchaseDate ? (
                        new Date(c.lastPurchaseDate).toLocaleDateString('uz-UZ')
                      ) : (
                        <span className="text-ink/30">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {c.role === 'ADMIN' || c.role === 'SUPERADMIN' ? (
                          <button
                            disabled
                            title="Admin foydalanuvchilariga SMS yuborib bo'lmaydi"
                            className="rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-400 cursor-not-allowed opacity-60"
                          >
                            ★ Admin (SMS Taqiqlangan)
                          </button>
                        ) : (
                          <button
                            onClick={() => openDirectSmsModal(c)}
                            title="SMS xabar yuborish"
                            className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                          >
                            ✉️ SMS
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(c)}
                          title="Mijoz ma'lumotlarini tahrirlash"
                          className="rounded-lg border border-sand bg-white px-2.5 py-1 text-[11px] font-bold text-ink/70 hover:bg-sand/30 hover:text-ink transition-colors"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-secondary px-3 py-1.5 text-xs rounded-xl disabled:opacity-40"
          >
            ← Oldingi
          </button>
          <span className="text-xs text-ink/50 font-semibold">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-secondary px-3 py-1.5 text-xs rounded-xl disabled:opacity-40"
          >
            Keyingi →
          </button>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-sand rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <h3 className="font-serif text-2xl font-bold text-ink mb-4">
              Yangi Mijoz Qo&apos;shish
            </h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                  Mijoz ismi (F.I.SH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(formatNameInput(e.target.value))}
                  placeholder="Masalan: Ali Valiyev"
                  className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                  Telefon Raqami <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Masalan: +998901234567"
                  className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                    Tug&apos;ilgan Kuni
                  </label>
                  <input
                    type="date"
                    value={customerBirthDate}
                    onChange={(e) => setCustomerBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-xs text-ink outline-none transition focus:border-primary/45"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    value={customerTelegram}
                    onChange={(e) => setCustomerTelegram(e.target.value)}
                    placeholder="alivaxon (@ siz)"
                    className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="btn-secondary rounded-xl py-2.5 px-4 text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={addingCustomer}
                  className="btn-primary rounded-xl py-2.5 px-5 text-xs shadow-md"
                >
                  {addingCustomer ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-sand rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-2xl font-bold text-ink">
                Mijozni Tahrirlash
              </h3>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                  Mijoz Ismi (F.I.SH) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(formatNameInput(e.target.value))}
                  className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                  Telefon Raqami <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                    Tug&apos;ilgan Kuni
                  </label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-xs text-ink outline-none transition focus:border-primary/45"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    value={editTelegram}
                    onChange={(e) => setEditTelegram(e.target.value)}
                    placeholder="username"
                    className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCustomer(null);
                  }}
                  className="btn-secondary rounded-xl py-2.5 px-4 text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={updatingCustomer}
                  className="btn-primary rounded-xl py-2.5 px-5 text-xs shadow-md"
                >
                  {updatingCustomer ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General / Custom SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-sand rounded-3xl p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif text-2xl font-bold text-ink">
                {smsTarget === 'SPECIFIC' ? 'Shaxsiy SMS Xabar' : 'Umumiy SMS Xabar Yuborish'}
              </h3>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200">
                SMS
              </span>
            </div>
            <p className="text-xs text-ink/50 mb-4">
              {smsTarget === 'SPECIFIC'
                ? `Mijoz: ${smsTargetName} (${smsTargetPhone})`
                : "Barcha mijozlarga ommaviy SMS xabar yuboriladi."}
            </p>

            <form onSubmit={handleSendSms} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-ink/50 uppercase tracking-wider block mb-1">
                  SMS Xabari Matni <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="SMS matnini kiriting. Masalan: YEC Market gilamlariga 15% chegirma boshlandi!"
                  className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary/45 resize-none"
                />
                <div className="flex items-center justify-between text-[10px] text-ink/40 mt-1">
                  <span>Namuna tugmalaridan foydalanishingiz mumkin</span>
                  <span>
                    Belgilar: {smsMessage.length} ({Math.ceil(smsMessage.length / 160)} SMS)
                  </span>
                </div>
              </div>

              {/* Quick Template buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(
                      "YEC Market: Hurmatli mijoz, yangi kolleksiya gilamlarimiz do'konimizga keldi! Ma'lumot uchun: +998901234567"
                    )
                  }
                  className="rounded-lg bg-sand/20 hover:bg-sand/40 border border-sand px-2 py-1 text-[10px] text-ink/70 font-medium transition-colors"
                >
                  ✨ Yangi kolleksiya
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSmsMessage(
                      "YEC Market: Siz uchun maxsus bayramona chegirmalarimiz boshlandi! Do'konimizga tashrif buyuring."
                    )
                  }
                  className="rounded-lg bg-sand/20 hover:bg-sand/40 border border-sand px-2 py-1 text-[10px] text-ink/70 font-medium transition-colors"
                >
                  🎉 Chegirma e'loni
                </button>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-sand/40">
                <button
                  type="button"
                  onClick={() => setShowSmsModal(false)}
                  className="btn-secondary rounded-xl py-2.5 px-4 text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={sendingSms}
                  className="btn-primary rounded-xl py-2.5 px-5 text-xs shadow-md bg-sky-600 hover:bg-sky-700 text-white"
                >
                  {sendingSms ? "Yuborilmoqda..." : "✉️ SMS YUBORISH"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
