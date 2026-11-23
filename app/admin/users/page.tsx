'use client';

import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/services/api';
import type { AuthUser } from '@/types/user';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter((user) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = (user.name ?? '').toLowerCase().includes(term);
    const emailMatch = (user.email ?? '').toLowerCase().includes(term);
    const phoneMatch = (user.phone ?? '').toLowerCase().includes(term);
    return nameMatch || emailMatch || phoneMatch;
  });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<AuthUser[]>('/users');
      setUsers(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const removeUser = async (id: string) => {
    if (!window.confirm("Rostdan ham ushbu foydalanuvchini o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      await api.patch(`/users/${id}/role`, { role });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="section-shell py-8 space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-sky-100/50 pb-4">
        <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-slate-800 !leading-[1.4] tracking-normal sm:tracking-wide py-1">
          Foydalanuvchilar boshqaruvi
        </h1>
        
        {/* Search Input Box */}
        <div className="flex w-full max-w-md items-center gap-2.5 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm transition hover:border-sky-300 shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-sky-500"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism, email yoki telefon bo'yicha qidirish..."
            className="w-full bg-transparent text-sm font-semibold text-ink placeholder-slate-400 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 h-[400px] animate-pulse rounded-xl bg-sand" />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink/85">
              <thead className="bg-gradient-to-r from-sky-100/80 via-indigo-50/80 to-emerald-100/70 text-xs uppercase text-ink/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ism</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Telefon</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {filteredUsers.map((user, index) => {
                  const rowGradients = [
                    'bg-gradient-to-r from-sky-50/90 via-blue-50/80 to-indigo-50/90',
                    'bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-cyan-50/90',
                    'bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-rose-50/90',
                    'bg-gradient-to-r from-violet-50/90 via-purple-50/80 to-fuchsia-50/90',
                    'bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-red-50/90',
                    'bg-gradient-to-r from-lime-50/90 via-green-50/80 to-emerald-50/90',
                  ];
                  const rowBg = rowGradients[index % rowGradients.length];
                  
                  const avatarGradients = [
                    'from-sky-500 to-indigo-600',
                    'from-emerald-500 to-teal-600',
                    'from-amber-500 to-orange-600',
                    'from-violet-500 to-purple-600',
                    'from-rose-500 to-pink-600',
                    'from-lime-500 to-green-600',
                  ];
                  const avatarBg = avatarGradients[index % avatarGradients.length];
                  
                  return (
                  <tr
                    key={user.id}
                    className={`${rowBg} transition-all duration-300 hover:scale-[1.002] hover:shadow-md hover:z-10`}
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      <div className="inline-flex items-center gap-2">
                        {(user.role === 'SUPERADMIN' || user.role === 'ADMIN') && (
                          <span className="text-amber-500 text-base leading-none">⭐</span>
                        )}
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${avatarBg} text-[11px] font-bold uppercase text-white shadow-sm`}>
                          {(user.name ?? user.email ?? 'U').trim().charAt(0)}
                        </span>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-white/60 bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-ink/80 backdrop-blur-sm">
                        {user.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'SUPERADMIN' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-400 shadow-sm">
                          ★ Bosh Admin
                        </span>
                      ) : user.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 border border-sky-500/40 px-3 py-1 text-xs font-bold text-sky-400 shadow-sm">
                          ★ Admin
                        </span>
                      ) : (
                        <select
                           value={user.role}
                           onChange={(e) => void updateRole(user.id, e.target.value)}
                           className="rounded-xl border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 cursor-pointer backdrop-blur-sm"
                        >
                          <option value="CUSTOMER">Mijoz (CUSTOMER)</option>
                          <option value="SELLER">Sotuvchi (SELLER)</option>
                          <option value="COURIER">Kuryer (COURIER)</option>
                          <option value="ADMIN">Admin (ADMIN)</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role !== 'SUPERADMIN' && (
                        <button
                          onClick={() => removeUser(user.id)}
                          className="rounded-full border border-red-200/70 bg-red-50/80 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 backdrop-blur-sm"
                        >
                          O'chirish
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="p-6 text-center text-ink/60">
              Foydalanuvchilar topilmadi
            </div>
          )}
        </div>
      )}
    </div>
  );
}
