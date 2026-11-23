'use client';

import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import ToastContainer, { toast, ToastType } from './ui/Toast';

interface NotificationContextType {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRuntimeError = (event: ErrorEvent) => {
      // Gracefully notify user in Uzbek, hiding technical trace details
      toast.error("Ilova ishida kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilang.");
    };

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      // Axios errors are already handled by the global interceptor in api.ts
      if (reason && (reason.isAxiosError || reason.config)) {
        return;
      }
      toast.error("Tarmoq yoki asinxron so'rov bajarilishida xatolik yuz berdi.");
    };

    window.addEventListener('error', handleRuntimeError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('error', handleRuntimeError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    toast.show(message, type);
  }, []);

  const success = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const error = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const warning = useCallback((message: string) => {
    toast.warning(message);
  }, []);

  const info = useCallback((message: string) => {
    toast.info(message);
  }, []);

  const contextValue = useMemo(
    () => ({ show, success, error, warning, info }),
    [show, success, error, warning, info]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
