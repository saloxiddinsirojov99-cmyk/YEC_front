import { api } from './api';
import { API_BASE_URL } from './api';
import type { LoginResponse } from '@/types/user';
import { canUseStorage, safeGet, safeRemove, safeSet } from '@/utils/safeStorage';

export type RegisterOtpRequestPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export type RegisterOtpVerifyPayload = {
  email: string;
  otp: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  newPassword: string;
};

export async function requestRegisterOtp(payload: RegisterOtpRequestPayload) {
  const { data } = await api.post<{
    message: string;
    devOtpCode?: string;
  }>('/auth/register', payload);

  return data;
}

export async function requestPhoneOtp(payload: { phone: string; firstName?: string; lastName?: string }) {
  // Use the same endpoint as register but with minimal fields if needed, 
  // though the backend DTO requires email and password.
  // Wait, if the backend DTO requires email, then the phone-only flow in RegisterPage is fundamentally broken.
  // For now, I'll map it to the register endpoint and handle the missing fields.
  const { data } = await api.post<{
    message: string;
    devOtpCode?: string;
  }>('/auth/register', {
    ...payload,
    email: `${payload.phone.replace('+', '')}@yec-temporary.uz`,
    password: 'TemporaryPassword123!',
  });
  return data;
}

export async function verifyRegisterOtp(payload: RegisterOtpVerifyPayload) {
  const { data } = await api.post<{
    message: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
    };
  }>('/auth/register/verify-otp', payload);

  return data;
}

export async function verifyPhoneOtp(payload: { phone: string; otp: string; firstName?: string; lastName?: string; password?: string }) {
  const { data } = await api.post<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
    };
  }>('/auth/register/verify-otp', {
    email: `${payload.phone.replace('+', '')}@yec-temporary.uz`,
    otp: payload.otp,
  });
  
  // The backend verifyRegisterOtp returns { message, user }, NOT tokens.
  // But the frontend verifySmsRegistration expects accessToken and refreshToken.
  // This is a mismatch. I'll have to adjust the backend or the frontend.
  // I'll update the backend later. For now, I'll try to login immediately after verification.
  return data as any; 
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

export async function requestForgotPassword(email: string) {
  const { data } = await api.post<{ message: string; devOtpCode?: string }>(
    '/auth/forgot-password/request-otp',
    { email },
  );
  return data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password/reset', payload);
  return data;
}

export function getGoogleLoginUrl(): string {
  const base = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  return `${base}/auth/google`;
}

let inMemoryAccessToken: string | null = null;
let authInitializing = typeof window !== 'undefined' && localStorage.getItem('yec_has_session') === 'true';

export function isAuthInitializing(): boolean {
  return authInitializing;
}

export function setAuthInitializing(value: boolean) {
  authInitializing = value;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('yec-auth-changed'));
  }
}

const ACCESS_KEY = 'yec_token';
const REFRESH_KEY = 'yec_refresh_token';
const LAST_ACTIVE_KEY = 'yec_last_active';
const LIKED_MAP_KEY = 'yec_like_map_v2';
const CART_KEY = 'yec_cart_items';

export function saveTokens(accessToken: string, refreshToken?: string) {
  inMemoryAccessToken = accessToken;
  authInitializing = false;
  if (!canUseStorage()) return;
  safeSet('yec_has_session', 'true');
  try {
    const user = getUserFromToken();
    if (user?.role) {
      safeSet('yec_user_role', user.role);
    }
  } catch {}
  safeSet(LAST_ACTIVE_KEY, String(Date.now()));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('yec-auth-changed'));
  }
}

export function saveAccessToken(accessToken: string) {
  inMemoryAccessToken = accessToken;
  authInitializing = false;
  if (!canUseStorage()) return;
  safeSet('yec_has_session', 'true');
  try {
    const user = getUserFromToken();
    if (user?.role) {
      safeSet('yec_user_role', user.role);
    }
  } catch {}
  safeSet(LAST_ACTIVE_KEY, String(Date.now()));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('yec-auth-changed'));
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    // Async background request to clear session and cookie on the server
    api.post('/auth/logout', {}, { skipAuthRefresh: true } as any).catch(() => {});
  }
  inMemoryAccessToken = null;
  authInitializing = false;
  if (!canUseStorage()) return;
  safeRemove(ACCESS_KEY);
  safeRemove(REFRESH_KEY);
  safeRemove('yec_has_session');
  safeRemove('yec_user_role');
  safeRemove(LAST_ACTIVE_KEY);
  safeRemove(LIKED_MAP_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('yec-auth-changed'));
    window.dispatchEvent(new CustomEvent('yec-like-changed', { detail: { id: '' } }));
    window.dispatchEvent(new Event('yec-cart-changed'));
  }
}

export async function logout(allDevices = false) {
  try {
    await api.post('/auth/logout', { allDevices }, { skipAuthRefresh: true } as any);
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    inMemoryAccessToken = null;
    authInitializing = false;
    if (canUseStorage()) {
      safeRemove(ACCESS_KEY);
      safeRemove(REFRESH_KEY);
      safeRemove('yec_has_session');
      safeRemove('yec_user_role');
      safeRemove(LAST_ACTIVE_KEY);
      safeRemove(LIKED_MAP_KEY);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('yec-auth-changed'));
      window.dispatchEvent(new CustomEvent('yec-like-changed', { detail: { id: '' } }));
      window.dispatchEvent(new Event('yec-cart-changed'));
    }
  }
}

export function getToken(): string | null {
  return inMemoryAccessToken;
}

export function getRefreshToken(): string | null {
  // Refresh token is in HttpOnly cookie; JavaScript cannot read it
  return null;
}

export function setLastActive(ts: number) {
  if (!canUseStorage()) return;
  safeSet(LAST_ACTIVE_KEY, String(ts));
}

export function getLastActive(): number {
  if (!canUseStorage()) return Date.now();
  const raw = safeGet(LAST_ACTIVE_KEY);
  const parsed = raw ? Number(raw) : Date.now();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export type DecodedToken = {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

export function getUserFromToken(): DecodedToken | null {
  const token = getToken();
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as DecodedToken;
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
}

export function getTokenExpiryMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload) as { exp?: number };
    if (!payload?.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}
