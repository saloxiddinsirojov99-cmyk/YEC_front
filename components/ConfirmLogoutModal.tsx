'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Portal from '@/components/Portal';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ConfirmLogoutModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmLogoutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Animate in on open, animate out on close
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Close on ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        handleClose();
      }
      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current && visible) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    },
    [isLoading, visible]
  );

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setVisible(false);
    // Delay actual close for exit animation
    setTimeout(() => onClose(), 150);
  }, [isLoading, onClose]);

  // Handle click outside modal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isLoading) {
        handleClose();
      }
    },
    [isLoading, handleClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus cancel button on open
      requestAnimationFrame(() => {
        cancelRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
          visible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'
        }`}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-description"
      >
      <div
        ref={modalRef}
        className={`w-full max-w-[420px] overflow-hidden rounded-[22px] bg-white shadow-2xl border border-red-100/80 transition-all duration-200 ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="p-6 sm:p-7">
          {/* Compact row layout: icon + title on same line */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="logout-modal-title"
                className="text-lg font-bold text-ink leading-snug"
              >
                Tizimdan chiqish
              </h2>
              <p
                id="logout-modal-description"
                className="mt-1.5 text-sm text-ink/60 leading-relaxed"
              >
                Rostdan ham akkauntingizdan chiqmoqchimisiz?
              </p>
            </div>
          </div>

          {/* Buttons - same row */}
          <div className="mt-6 flex gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border-2 border-slate-100 bg-white px-5 py-3 text-sm font-bold text-ink/70 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-ink active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
            >
              Bekor qilish
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-red-700 hover:to-rose-600 hover:shadow-lg active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
            >
              {isLoading ? (
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
                  Chiqilmoqda...
                </span>
              ) : (
                'Chiqish'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Portal>
  );
}