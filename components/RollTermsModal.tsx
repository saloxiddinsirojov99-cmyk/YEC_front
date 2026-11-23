'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, ShieldAlert, Check } from 'lucide-react';
import Portal from './Portal';

interface RollTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RollTermsModal({ isOpen, onClose, onConfirm }: RollTermsModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 text-white shadow-[0_30px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            {/* Top accent strip */}
            <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
            
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 border border-amber-500/20">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-white">?? Metraj gilam buyurtma shartlari</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ushbu buyurtma uchun maxsus kesish shartlari qo&apos;llaniladi</p>
                </div>
              </div>

              {/* Scrollable Terms list */}
              <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3.5 mb-6 text-sm text-slate-300 scrollbar-thin scrollbar-thumb-white/10">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 font-bold">✅</span>
                  <p>Buyurtma tasdiqlangandan so&apos;ng ishlab chiqarish yoki tayyorlash jarayoni boshlanadi.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 font-bold">✅</span>
                  <p>Buyurtma &quot;Yetkazish jarayonida&quot; holatiga o&apos;tgandan keyin uni bekor qilib bo&apos;lmaydi.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 font-bold">✅</span>
                  <p>Buyurtma qabul qilingandan so&apos;ng 24 soat ichida qaytarish so&apos;rovi yuborish mumkin.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 font-bold">✅</span>
                  <p>Qaytarish tasdiqlansa, yetkazib berish xarajati ushlab qolinadi.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 mt-0.5 font-bold">✅</span>
                  <p>Oldindan to&apos;langan depozit buyurtma qiymatiga qo&apos;shib hisoblanadi.</p>
                </div>
              </div>

              {/* Mandatory Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer select-none rounded-2xl bg-white/5 border border-white/5 px-4 py-3.5 mb-6 hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
                />
                <span className="text-sm font-semibold text-slate-200">
                  Men barcha shartlarni o&apos;qidim va roziman.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (agreed) onConfirm();
                  }}
                  disabled={!agreed}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-lg shadow-[0_15px_40px_rgba(245,158,11,0.2)] transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Davom etish</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 text-slate-400 hover:text-white font-medium transition text-sm"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Portal>
  );
}
