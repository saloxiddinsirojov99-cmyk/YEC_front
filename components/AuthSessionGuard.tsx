'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { API_BASE_URL } from '@/services/api';
import {
  clearToken,
  getLastActive,
  getToken,
  getTokenExpiryMs,
  saveAccessToken,
  setAuthInitializing,
  setLastActive,
} from '@/services/auth.service';

const IDLE_LIMIT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export default function AuthSessionGuard() {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    const THROTTLE_MS = 30000; // 30 seconds
    let lastUpdate = 0;

    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      
      if (!getToken()) return;
      setLastActive(now);
      lastUpdate = now;
    };

    updateActivity();
    events.forEach((event) => window.addEventListener(event, updateActivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
    };
  }, []);

  useEffect(() => {
    const logout = (dest = '/login') => {
      clearToken();
      window.location.href = dest;
    };

    const tick = async () => {
      const pathname = window.location.pathname;
      const isProtectedRoute = pathname.startsWith('/admin') || 
                               pathname.startsWith('/profile') || 
                               pathname.startsWith('/orders') || 
                               pathname.startsWith('/cart');
      
      const accessToken = getToken();

      const tryRefresh = async (): Promise<boolean> => {
        if (refreshing.current) return false;
        refreshing.current = true;
        try {
          const localRefreshToken = (() => {
            try {
              return window.localStorage.getItem('yec_refresh_token') ?? undefined;
            } catch { return undefined; }
          })();

          const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            localRefreshToken ? { refreshToken: localRefreshToken } : {},
            { timeout: 15000, withCredentials: true, headers: { 'x-skip-refresh': '1' } },
          );
          const nextAccess = data?.accessToken;
          if (nextAccess) {
            saveAccessToken(nextAccess);
            setLastActive(Date.now());
            // Update stored refresh token if backend rotated it
            if (data?.refreshToken) {
              try { window.localStorage.setItem('yec_refresh_token', data.refreshToken); } catch {}
            }
            return true;
          }
          return false;
        } catch {
          return false;
        } finally {
          refreshing.current = false;
        }
      };
      
      // If no token but yec_has_session flag is true -> try to restore session first!
      if (!accessToken) {
        const hasSession = typeof window !== 'undefined' && localStorage.getItem('yec_has_session') === 'true';
        if (hasSession) {
          const ok = await tryRefresh();
          if (!ok) {
            setAuthInitializing(false);
            logout();
          }
        } else {
          setAuthInitializing(false);
          if (isProtectedRoute) {
            logout();
          }
        }
        return;
      }

      const now = Date.now();
      
      // 1. Check Idle time
      const lastActive = getLastActive();
      if (now - lastActive > IDLE_LIMIT_MS) {
        logout();
        return;
      }

      // 2. Check Access Token expiry — refresh proactively 2 minutes before expiry
      const accessExp = getTokenExpiryMs(accessToken);
      if (accessExp && now >= accessExp - 2 * 60 * 1000) {
        const hasSession = typeof window !== 'undefined' && localStorage.getItem('yec_has_session') === 'true';
        if (!hasSession) {
          logout();
          return;
        }
        const ok = await tryRefresh();
        if (!ok) {
          logout();
        }
      }
    };

    const interval = window.setInterval(tick, 10000);
    void tick();

    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

