'use client';

import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '@/services/api';

type DeliveryOrder = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  status: string;
  remainingAmount: number;
};

export default function CourierPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Proof modalities
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);

  const loadDeliveries = async () => {
    setLoading(true);
    setError('');
    try {
      // Load orders having statuses: READY_FOR_DELIVERY or ON_WAY
      const res = await api.get<any[]>('/admin/orders'); // Fetch list
      const deliveryList = res.data.filter((o) =>
        ['READY_FOR_DELIVERY', 'ON_WAY'].includes(o.status)
      );
      setOrders(deliveryList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDeliveries();
  }, []);

  const handleStartDelivery = async (orderId: string) => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/admin/orders/${orderId}/status`, { status: 'ON_WAY' });
      setSuccess('Buyurtma yo\'lga chiqdi!');
      void loadDeliveries();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleOpenCompleteModal = (orderId: string) => {
    setActiveOrderId(orderId);
    setShowProofModal(true);
  };

  const handleCompleteDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderId) return;
    setError('');
    setSuccess('');

    try {
      // Validate simulated signature or OTP
      if (otpCode && otpCode !== '1234') {
        setError('Xato OTP tasdiqlash kodi. To‘g‘ri kod: 1234');
        return;
      }

      await api.post(`/admin/orders/${activeOrderId}/status`, {
        status: 'DELIVERED',
        notes: `Delivered by courier. Signature: ${signatureName || 'Customer Signature verified'}`,
      });

      setSuccess('Muvaffaqiyatli yetkazildi!');
      setShowProofModal(false);
      setOtpCode('');
      setSignatureName('');
      setActiveOrderId(null);
      void loadDeliveries();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚚</span>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide">YEC Courier</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Courier Dispatch App</p>
          </div>
        </div>
        <button
          onClick={() => void loadDeliveries()}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Main List */}
      <div className="flex-1 p-6 flex flex-col gap-4 max-w-md mx-auto w-full overflow-y-auto">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-400">
            ✅ {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <span className="text-4xl block mb-2">📦</span>
            <p className="text-xs">Yetkazilishi kerak bo&apos;lgan faol buyurtmalar yo&apos;q.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{order.customerName}</h3>
                    <p className="text-[10px] text-white/40 mt-1">{order.phone}</p>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      order.status === 'ON_WAY' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-white/60">📍 Manzil: <span className="text-white font-medium">{order.address}</span></p>
                  <p className="text-white/60">💰 To&apos;lov (Terminal/Cash): <span className="text-white font-extrabold">{order.remainingAmount} UZS</span></p>
                </div>

                <div className="flex gap-3 pt-2">
                  {order.status === 'READY_FOR_DELIVERY' ? (
                    <button
                      onClick={() => void handleStartDelivery(order.id)}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 transition text-xs font-bold rounded-xl"
                    >
                      🚚 Yo&apos;lga chiqish (Start Delivery)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCompleteModal(order.id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 transition text-xs font-black rounded-xl shadow-lg"
                    >
                      ✔ Topshirish (Confirm Delivery)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELIVERY PROOF MODAL */}
      {showProofModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => {
                setShowProofModal(false);
                setActiveOrderId(null);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              ❌
            </button>

            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">🔒 Topshirishni Tasdiqlash</h3>

            <form onSubmit={handleCompleteDelivery} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Mijoz OTP kodi (Masalan: 1234)</label>
                <input
                  type="text"
                  required
                  placeholder="OTP kodni kiriting..."
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white px-4 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Mijoz Imzosi / F.I.Sh</label>
                <input
                  type="text"
                  required
                  placeholder="Ismini kiriting..."
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white px-4 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
