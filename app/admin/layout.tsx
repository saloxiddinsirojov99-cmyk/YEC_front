'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken, isAuthInitializing } from '@/services/auth.service';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const initializing = isAuthInitializing();
      if (initializing) {
        // Wait for token refresh process to finish
        return;
      }

      const user = getUserFromToken();
      if (
        !user ||
        (user.role !== 'ADMIN' &&
          user.role !== 'SUPERADMIN' &&
          user.role !== 'OPERATOR')
      ) {
        // Not authorized, redirect to profile or login
        router.replace('/profile');
        return;
      }

      if (user.role === 'OPERATOR') {
        const currentPath =
          typeof window !== 'undefined' ? window.location.pathname : '';
        if (
          currentPath !== '/admin/customers' &&
          !currentPath.startsWith('/admin/customers')
        ) {
          router.replace('/admin/customers');
          return;
        }
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAuth();

    if (typeof window !== 'undefined') {
      window.addEventListener('yec-auth-changed', checkAuth);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('yec-auth-changed', checkAuth);
      }
    };
  }, [router]);

  if (loading || !authorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
}
