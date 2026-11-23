'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { OrderStatus } from '@/types/order';
import { formatOrderNumber, formatOrderStatus } from '@/utils/format';
import { formatPrice } from '@/services/api';
import Portal from '@/components/Portal';

interface ConfirmStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderId: string;
  customerName: string;
  totalAmount: number;
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  orderCreatedAt?: string | null;
  loading?: boolean;
}

function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'ACCEPTED': return 'from-blue-600 to-indigo-500';
    case 'ON_WAY': return 'from-purple-600 to-violet-500';
    case 'DELIVERED': return 'from-emerald-600 to-teal-500';
    case 'CANCELLED': return 'from-red-600 to-rose-500';
    default: return 'from-blue-600 to-indigo-500';
  }
}

function getStatusIcon(status: OrderStatus) {
  const className = "h-5 w-5";
  switch (status) {
    case 'ACCEPTED':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'ON_WAY':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'DELIVERED':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'CANCELLED':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
      );
  }
}

export default function ConfirmStatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  customerName,
  totalAmount,
  currentStatus,
  targetStatus,
  orderCreatedAt,
  loading = false,
}: ConfirmStatusChangeModalProps) {
  const [visible, setVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (loading) return;
    setVisible(false);
    setTimeout(() => onClose(), 150);
  }, [loading, onClose]);

  // ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    },
    [loading, handleClose]
  );

  // Backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !loading) {
        handleClose();
      }
    },
    [loading, handleClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        cancelRef.current?.focus();
      });
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const statusLabel = formatOrderStatus(targetStatus);
  const currentLabel = formatOrderStatus(currentStatus);

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 transition-all duration-200 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        style={{ overflow: 'hidden' }}
      >
        <div
          ref={modalRef}
          className={`relative w-full max-w-[460px] rounded-2xl bg-white shadow-2xl transition-all duration-200 ${
            visible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2'
          }`}
        >
          <div className="p-6 sm:p-7">
            {/* Status chip */}
            <div className="flex items-center justify-center mb-5">
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${getStatusColor(targetStatus)} px-3.5 py-1.5 text-xs font-bold text-white shadow-md`}>
                {getStatusIcon(targetStatus)}
                {statusLabel}
              </span>
            </div>

            {/* Title */}
            <h2
              id="status-modal-title"
              className="text-center text-xl font-bold text-ink leading-snug"
            >
              {targetStatus === 'ACCEPTED' && "Buyurtmani qabul qilish"}
              {targetStatus === 'ON_WAY' && "Buyurtmani yo'lga chiqarish"}
              {targetStatus === 'DELIVERED' && "Buyurtmani yetkazilgan deb belgilash"}
              {targetStatus === 'CANCELLED' && "Buyurtmani bekor qilish"}
            </h2>

            {/* Description */}
            <p className="mt-2 text-center text-sm text-ink/60">
              Haqiqatan ham ushbu buyurtmani{' '}
              <span className="font-bold text-primary">{statusLabel.toLowerCase()}</span>
              {' '}holatiga o'zgartirmoqchimisiz?
            </p>

            {/* Order details card */}
            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/40">Buyurtma ID</span>
                <span className="text-sm font-mono font-bold text-ink">
                  #{formatOrderNumber(orderId, orderCreatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/40">Mijoz</span>
                <span className="text-sm font-semibold text-ink">{customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/40">Summa</span>
                <span className="text-sm font-bold text-primary">{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/40">Joriy holat</span>
                <span className="text-sm font-semibold text-ink/60">{currentLabel}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-xl border-2 border-slate-100 bg-white px-5 py-3 text-sm font-bold text-ink/70 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-ink active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r ${getStatusColor(targetStatus)} px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    O'zgartirilmoqda...
                  </span>
                ) : (
                  'Tasdiqlash'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}