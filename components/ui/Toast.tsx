'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((message: ToastMessage) => void)[] = [];
const recentToasts = new Map<string, number>();

export const toast = {
  show: (message: string, type: ToastType = 'info') => {
    const cleanMsg = (message || '').trim();
    if (!cleanMsg) return;

    const key = `${type}:${cleanMsg}`;
    const now = Date.now();
    const lastTime = recentToasts.get(key) || 0;

    // Suppress duplicate toasts with same message within 2500ms
    if (now - lastTime < 2500) {
      return;
    }
    recentToasts.set(key, now);

    const id = Math.random().toString(36).substring(2, 9);
    const toastMsg = { id, message: cleanMsg, type };
    toastListeners.forEach((listener) => listener(toastMsg));
  },
  success: (message: string) => toast.show(message, 'success'),
  error: (message: string) => toast.show(message, 'error'),
  info: (message: string) => toast.show(message, 'info'),
  warning: (message: string) => toast.show(message, 'warning'),
};

// Global fallback to override native window.alert
if (typeof window !== 'undefined') {
  window.alert = (message: string) => {
    const lower = String(message || '').toLowerCase();
    if (
      lower.includes('warning') ||
      lower.includes('ogohlantirish') ||
      lower.includes('diqqat') ||
      lower.includes('check') ||
      lower.includes('tekshir')
    ) {
      toast.warning(message);
    } else if (
      lower.includes('error') ||
      lower.includes('xato') ||
      lower.includes('failed') ||
      lower.includes('muvaffaqiyatsiz') ||
      lower.includes('invalid') ||
      lower.includes('not found') ||
      lower.includes("yo'q")
    ) {
      toast.error(message);
    } else if (
      lower.includes('success') ||
      lower.includes('muvaffaqiyatli') ||
      lower.includes("qo'shildi") ||
      lower.includes("saqlandi") ||
      lower.includes("o'chirildi")
    ) {
      toast.success(message);
    } else {
      toast.info(message);
    }
  };
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const addToast = (message: ToastMessage) => {
      // Keep strictly 1 single active toast at a time
      setToasts([message]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== message.id));
      }, 5000);
    };

    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== addToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-progress {
          animation-name: toast-progress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
      <div className="fixed top-[24px] right-[24px] z-[9999999] flex flex-col gap-3 pointer-events-none w-[calc(100%-48px)] sm:w-full max-w-[400px]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={`pointer-events-auto relative flex items-center justify-between rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all overflow-hidden ${
                t.type === 'error'
                  ? 'border-red-500/20 bg-[#fdeded] text-[#5f2120] dark:bg-red-950/80 dark:text-red-200 dark:border-red-500/30'
                  : t.type === 'success'
                  ? 'border-emerald-500/20 bg-[#edf7ed] text-[#1e4620] dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-500/30'
                  : t.type === 'warning'
                  ? 'border-amber-500/20 bg-[#fff9e6] text-[#664d03] dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-500/30'
                  : 'border-blue-500/20 bg-[#e5f6fd] text-[#014361] dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-500/30'
              }`}
            >
              <div className="flex items-center gap-3 pr-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  t.type === 'error' ? 'bg-red-500/10' : t.type === 'success' ? 'bg-emerald-500/10' : t.type === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                }`}>
                  {t.type === 'error' && (
                    <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                  {t.type === 'success' && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {t.type === 'warning' && (
                    <svg className="h-5 w-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  )}
                  {t.type === 'info' && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                </div>
                <p className="text-sm font-semibold select-none leading-snug">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-auto rounded-full p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              >
                <svg className="h-4 w-4 opacity-50 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Progress bar animation */}
              <div
                className={`absolute bottom-0 left-0 h-1 animate-toast-progress ${
                  t.type === 'error'
                    ? 'bg-red-500/40'
                    : t.type === 'success'
                    ? 'bg-emerald-500/40'
                    : t.type === 'warning'
                    ? 'bg-amber-500/40'
                    : 'bg-blue-500/40'
                }`}
                style={{ animationDuration: '5000ms' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
