import type { CartItem } from '@/types/cart';
import { canUseStorage, safeGet, safeRemove, safeSet } from '@/utils/safeStorage';
import { getToken } from '@/services/auth.service';

const CART_KEY = 'yec_cart_items';
const CART_EVENT = 'yec-cart-changed';

// Use persisted session flag + in-memory token — NOT yec_token (which is never written to localStorage)
function hasSession(): boolean {
  if (!canUseStorage()) return false;
  if (getToken()) return true;
  return safeGet('yec_has_session') === 'true';
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.href = '/login';
}

export function getCartItems(): CartItem[] {
  if (!canUseStorage()) return [];
  const raw = safeGet(CART_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCartItems(items: CartItem[]): void {
  if (!canUseStorage()) return;
  safeSet(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
  if (!hasSession()) {
    redirectToLogin();
    return;
  }
  const items = getCartItems();
  const existing = items.find(
    (cartItem) =>
      cartItem.carpetId === item.carpetId &&
      cartItem.widthCm === item.widthCm &&
      cartItem.lengthCm === item.lengthCm
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ ...item, quantity });
  }

  setCartItems(items);
}

export function updateCartQuantity(
  carpetId: string,
  quantity: number,
  widthCm?: number,
  lengthCm?: number
): void {
  if (!hasSession()) {
    redirectToLogin();
    return;
  }
  const items = getCartItems().map((item) =>
    item.carpetId === carpetId &&
    item.widthCm === widthCm &&
    item.lengthCm === lengthCm
      ? { ...item, quantity: Math.max(1, quantity) }
      : item
  );
  setCartItems(items);
}

export function updateCartItemSize(
  carpetId: string,
  widthCm: number | undefined,
  oldLengthCm: number | undefined,
  newLengthCm: number,
  newPrice: number,
  newOriginalPrice: number,
  newSizeText: string
): void {
  if (!hasSession()) {
    redirectToLogin();
    return;
  }
  const items = getCartItems().map((item) =>
    item.carpetId === carpetId &&
    item.widthCm === widthCm &&
    item.lengthCm === oldLengthCm
      ? {
          ...item,
          lengthCm: newLengthCm,
          price: newPrice,
          originalPrice: newOriginalPrice,
          size: newSizeText,
        }
      : item
  );
  setCartItems(items);
}

export function removeFromCart(
  carpetId: string,
  widthCm?: number,
  lengthCm?: number
): void {
  if (!hasSession()) {
    redirectToLogin();
    return;
  }
  const items = getCartItems().filter(
    (item) =>
      !(
        item.carpetId === carpetId &&
        item.widthCm === widthCm &&
        item.lengthCm === lengthCm
      )
  );
  setCartItems(items);
}


export function clearCart(): void {
  if (!canUseStorage()) return;
  safeRemove(CART_KEY);
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export type CartChangeEventDetail = {
  action?: 'clear';
  carpetId?: string;
};
