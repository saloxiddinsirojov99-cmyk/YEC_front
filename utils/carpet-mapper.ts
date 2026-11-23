import { LucideBadgeJapaneseYen } from "lucide-react";
import { validateHeaderValue } from "node:http";

export interface CarpetFormState {
  name: string;
  designCode: string;
  categoryId: string;
  size: string;
  material: string;
  brand?: string;
  description?: string;
  qoShimchaKod?: string;
  images: string[];
  productType: 'carpet' | 'joynamoz' | 'oval' | 'roll';
  pricePerM2: string;
  totalPrice?: number;
  stock: string;
  widthCm: string;
  originalLengthCm: string;
  weightKg?: string;
  pileHeight?: string;
  barcode?: string;
}
/**
 * Helper to clean and format optional fields.
 * If the string value is empty or pure spaces, we convert it to undefined.
 * Trim other string inputs.
 */
export function sanitizePayload(payload: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(payload)) {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      result[key] = trimmed === '' ? undefined : trimmed;
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Coerces numeric fields to integers or floats, rejecting NaN.
 */
export function normalizeNumbers(payload: Record<string, any>): Record<string, any> {
  const numericFields = [
    'price',
    'widthMm',
    'lengthMm',
    'weightKg',
    'pileHeight',
    'stock',
    'widthCm',
    'originalLengthCm',
    'pricePerM2',
    'qo_shimchaKod'
  ];
  const result = { ...payload };

  for (const field of numericFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const strVal = String(result[field]).trim();
      if (strVal === '') {
        result[field] = undefined;
      } else {
        const num = Number(strVal);
        if (isNaN(num)) {
          throw new Error(`${field} to'g'ri son bo'lishi shart.`);
        }
        result[field] = num;
      }
    }
  }

  return result;
}

/**
 * Parses names split by underscores to obtain weight and pile height.
 */
export function parseProductName(name: string): {
  cleanName: string;
  weightKg: number | null;
  pileHeight: number | null;
} {
  let cleanName = String(name).trim();
  let weightKg: number | null = null;
  let pileHeight: number | null = null;

  if (cleanName.includes('_')) {
    const parts = cleanName.split('_');
    if (parts[0]) {
      cleanName = parts[0].trim();
    }
    if (parts[1]) {
      const wPart = parts[1].trim();
      const wMatch = wPart.match(/^(\d+)(?:gr|g)?$/i);
      if (wMatch) {
        weightKg = parseFloat(wMatch[1]) / 1000;
      }
    }
    if (parts[2]) {
      const pPart = parts[2].trim();
      const pMatch = pPart.match(/^(\d+)(?:mm)?$/i);
      if (pMatch) {
        pileHeight = parseInt(pMatch[1], 10);
      }
    }
  }

  return { cleanName, weightKg, pileHeight };
}

/**
 * Builds the exact payload for CreateCarpetDto
 */
export function buildCreatePayload(form: CarpetFormState): Record<string, any> {
  const isRoll = form.productType === 'roll';
  const isPrayer = form.productType === 'joynamoz';
  const isOval = form.productType === 'oval';

  // 1. Calculate price
  let price = 0;
  if (isPrayer) {
    price = Number(form.pricePerM2);
  } else if (isRoll) {
    price = Number(form.pricePerM2);
  } else {
    price = form.totalPrice || 0;
  }

  // 2. Parse dimensions
  let widthMm = 0;
  let lengthMm = 0;
  if (isRoll) {
    widthMm = Math.round(Number(form.widthCm) * 10);
    lengthMm = Math.round(Number(form.originalLengthCm) * 10);
  } else {
    const nums = form.size.match(/(\d+(\.\d+)?)/g)?.map(Number) || [];
    if (nums.length >= 2) {
      let w = nums[0];
      let l = nums[1];
      if (w < 10) w = w * 1000;
      else if (w < 500) w = w * 10;

      if (l < 10) l = l * 1000;
      else if (l < 500) l = l * 10;

      widthMm = Math.round(w);
      lengthMm = Math.round(l);
    }
  }

  if (widthMm <= 0) widthMm = 800;
  if (lengthMm <= 0) lengthMm = 1200;

  const resolvedCode = form.designCode?.trim() || form.name?.trim() || 'JOY-001';

  const rawPayload = {
    name: form.name,
    patternCode: resolvedCode,
    designCode: resolvedCode,
    productType: isRoll ? 'METRAJ' : 'READY',
    shape: isOval ? 'OVAL' : 'RECTANGLE',
    widthMm,
    lengthMm,
    price,
    size: isRoll ? 'ROLL' : form.size,
    material: form.material,
    brand: form.brand,
    description: form.description,
    qo_shimchaKod: form.qoShimchaKod,
    categoryId: form.categoryId,
    images: form.images,
    stock: Math.max(1, Number(form.stock) || 1),
    type: isRoll ? 'ROLL' : 'READY',
    weightKg: form.weightKg,
    pileHeight: form.pileHeight,
    barcode: form.barcode,
  };

  return sanitizePayload(normalizeNumbers(rawPayload));
}

/**
 * Builds the exact payload for UpdateCarpetDto
 */
export function buildUpdatePayload(form: CarpetFormState): Record<string, any> {
  const isRoll = form.productType === 'roll';
  const isPrayer = form.productType === 'joynamoz';

  let price: number | undefined = undefined;
  if (isPrayer || isRoll) {
    const p = Number(form.pricePerM2);
    if (p > 0) price = p;
  } else {
    if (form.totalPrice && form.totalPrice > 0) {
      price = form.totalPrice;
    }
  }

  const rawPayload: Record<string, any> = {
    name: form.name,
    patternCode: form.designCode,
    designCode: form.designCode,
    price,
    size: isRoll ? 'ROLL' : form.size,
    material: form.material,
    brand: form.brand,
    description: form.description,
    qo_shimchaKod: form.qoShimchaKod,
    categoryId: form.categoryId,
    images: form.images,
    type: isRoll ? 'ROLL' : 'READY',
    weightKg: form.weightKg,
    pileHeight: form.pileHeight,
    barcode: form.barcode,
  };

  if (!isRoll) {
    rawPayload.stock = Number(form.stock) > 0 ? Number(form.stock) : 1;
  } else {
    rawPayload.widthCm = Number(form.widthCm);
    rawPayload.originalLengthCm = Number(form.originalLengthCm);
    rawPayload.pricePerM2 = Number(form.pricePerM2);
  }

  return sanitizePayload(normalizeNumbers(rawPayload));
}
