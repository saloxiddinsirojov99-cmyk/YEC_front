import axios from 'axios';
import { toast } from '@/components/ui/Toast';
import { clearToken, getToken, saveAccessToken } from './auth.service';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipToast?: boolean;
    skipAuthRefresh?: boolean;
    skipRetry?: boolean;
    _retryCount?: number;
    _retry?: boolean;
  }
}


// Default Render production backend URL
const DEFAULT_API_URL = 'https://yec-market-backend.onrender.com';

/**
 * Backend server root URL (without /api or /api/v1)
 */
export const BACKEND_ROOT_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  DEFAULT_API_URL
)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api(\/v1)?\/?$/, '');

/**
 * Normalizes API URL ensuring proper /api/v1 prefix without duplicate /api/api
 */
export function normalizeApiUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  if (trimmed === '/api/v1') return '/api/v1';
  return `${trimmed}/api/v1`;
}

/**
 * Unified API Base URL pointing to NestJS backend
 */
export const API_BASE_URL = normalizeApiUrl(
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_URL
);

const resolveApiBaseUrl = () => {
  return API_BASE_URL;
};

const MAX_RETRIES = 2;
const RETRYABLE_METHODS = new Set(['get', 'head', 'options']);
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  if (typeof window !== 'undefined') {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const resolveQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config ?? {};
    const status = error.response?.status;
    const method = String(originalRequest.method || '').toLowerCase();
    const isRetryable = RETRYABLE_METHODS.has(method);
    const hasResponse = Boolean(error.response);
    const retryCount = Number(originalRequest._retryCount || 0);

    if (!hasResponse && isRetryable && retryCount < MAX_RETRIES && !originalRequest.skipRetry) {
      originalRequest._retryCount = retryCount + 1;
      await sleep(500 * (retryCount + 1));
      return api(originalRequest);
    }

    if (
      hasResponse &&
      typeof status === 'number' &&
      RETRYABLE_STATUSES.has(status) &&
      isRetryable &&
      retryCount < MAX_RETRIES &&
      !originalRequest.skipRetry
    ) {
      originalRequest._retryCount = retryCount + 1;
      await sleep(500 * (retryCount + 1));
      return api(originalRequest);
    }

    const shouldSkipToast = Boolean(originalRequest.skipToast) || axios.isCancel(error);
    const isAuthRefreshAttempt = status === 401 && !originalRequest._retry && !originalRequest.skipAuthRefresh;

    if (!shouldSkipToast && !isAuthRefreshAttempt) {
      const backendMessage = getErrorMessage(error);
      const defaultMessages: Record<number, string> = {
        400: "Noto'g'ri ma'lumot yuborildi",
        401: "Avtorizatsiya talab qilinadi",
        403: "Ruxsat yo'q",
        404: "Ma'lumot topilmadi",
        409: "Bu ma'lumot allaqachon mavjud",
        422: "Tekshiruv xatosi",
        429: "Juda ko'p so'rov yuborildi",
        500: "Server xatosi",
        502: "Server vaqtincha ishlamayapti (Bad Gateway).",
        503: "Xizmat vaqtincha band (Service Unavailable).",
      };

      const finalMsg = backendMessage || defaultMessages[status ?? 0] || "Kutilmagan xatolik yuz berdi.";
      toast.error(finalMsg);
    }

    if (status !== 401 || originalRequest._retry || originalRequest.skipAuthRefresh) {
      return Promise.reject(error);
    }

    // On 401: always attempt a token refresh using the HttpOnly refresh cookie.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest._retry = true;
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      // Try cookie-based refresh first; fall back to localStorage refresh token in body
      const localRefreshToken = (() => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem('yec_refresh_token') ?? undefined;
          }
        } catch { /* ignore */ }
        return undefined;
      })();

      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        localRefreshToken ? { refreshToken: localRefreshToken } : {},
        { timeout: 15000, withCredentials: true, headers: { 'x-skip-refresh': '1' } },
      );
      const newAccessToken = data?.accessToken;
      if (!newAccessToken) {
        throw new Error('No access token');
      }
      saveAccessToken(newAccessToken);
      resolveQueue(newAccessToken);
      originalRequest._retry = true;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      resolveQueue(null);
      clearToken();
      if (!shouldSkipToast) {
        toast.error("Avtorizatsiya muddati tugadi. Iltimos, tizimga qayta kiring.");
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function toFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (value instanceof Blob) {
      formData.append(key, value);
      return;
    }

    if (Array.isArray(value) || typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
}

function isUnsafeErrorMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('prisma') ||
    lower.includes('sql') ||
    lower.includes('database') ||
    lower.includes('query') ||
    lower.includes('select ') ||
    lower.includes('insert ') ||
    lower.includes('update ') ||
    lower.includes('delete ') ||
    lower.includes('relation ') ||
    lower.includes('foreign key') ||
    lower.includes('constraint') ||
    lower.includes('unique constraint') ||
    lower.includes('at ') ||
    lower.includes('processticksandrejections') ||
    msg.includes('\n') ||
    msg.includes('\r')
  );
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string | string[]; errors?: string[] }
      | undefined;

    let msg = '';
    if (Array.isArray(responseData?.message)) {
      msg = responseData.message[0] ?? "So'rovda xatolik yuz berdi.";
    } else if (typeof responseData?.message === 'string') {
      msg = responseData.message;
    } else if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
      msg = responseData.errors[0];
    }

    if (msg) {
      if (isUnsafeErrorMessage(msg)) {
        return "Serverda xatolik yuz berdi. Xavfsizlik yuzasidan batafsil ma'lumotlar yashirildi.";
      }
      return msg;
    }
  }

  return "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.";
}

export function formatPrice(value: number | string): string {
  const normalized =
    typeof value === 'string' ? Number(value.replace(/\s+/g, '').replace(/,/g, '.')) : Number(value);
  if (!Number.isFinite(normalized)) return `${value} so'm`;

  const rounded = Math.round(normalized);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded).toString();
  const formatted = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${formatted} so'm`;
}

export function formatDateOnly(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Converts a relative /uploads/... path from the server to a full URL */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already a full absolute URL or base64 data URI
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;

  const normalized = trimmed.replace(/\\/g, '/');
  const lower = normalized.toLowerCase();

  const withoutLeading = normalized.replace(/^\/+/, '');
  const lowerWithoutLeading = withoutLeading.toLowerCase();

  // Frontend public assets - MUST return relative path WITHOUT backend prefix
  if (
    lowerWithoutLeading.startsWith('images/') ||
    lowerWithoutLeading.startsWith('logo') ||
    lowerWithoutLeading.startsWith('favicon') ||
    lowerWithoutLeading.startsWith('_next/')
  ) {
    return `/${withoutLeading}`;
  }

  let relativePath: string;

  // Absolute filesystem path or any path that contains /uploads/
  const uploadsIndex = lower.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    relativePath = normalized.slice(uploadsIndex);
  } else if (lowerWithoutLeading.startsWith('uploads/')) {
    relativePath = `/${withoutLeading}`;
  } else if (/^[^/]+\.(png|jpe?g|webp|gif|svg)$/i.test(withoutLeading)) {
    // Sometimes DB stores only filename
    relativePath = `/uploads/${withoutLeading}`;
  } else {
    // Fallback: treat as relative path
    relativePath = withoutLeading.startsWith('/') ? withoutLeading : `/${withoutLeading}`;
  }

  // Legacy format guard: some old rows may contain /upload/ instead of /uploads/
  relativePath = relativePath.replace(/^\/?upload\//i, '/uploads/');
  if (!relativePath.startsWith('/')) {
    relativePath = `/${relativePath}`;
  }

  // Server uploads - convert to full URL with backend base
  if (relativePath.startsWith('/uploads/')) {
    return `${BACKEND_ROOT_URL}${relativePath}`;
  }

  // Double check if it's an image that we know is local
  if (relativePath.startsWith('/logo') || relativePath.startsWith('/favicon')) {
    return relativePath;
  }

  // Fallback: prepend BACKEND_ROOT_URL
  return `${BACKEND_ROOT_URL}${relativePath}`;
}

