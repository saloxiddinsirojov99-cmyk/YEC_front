import { api } from './api';
import type { Carpet, CarpetListResponse, CarpetQuery, Category } from '@/types/carpet';

export type CollectionM2PriceLookup = {
  found: boolean;
  collectionName: string;
  m2Price: number | null;
  count: number;
};

const CACHE_TTL_MS = 2 * 60 * 1000;
const carpetsCache = new Map<string, { expiresAt: number; data: CarpetListResponse }>();
let categoriesCache: { expiresAt: number; data: Category[] } | null = null;

const normalizeListResponse = (data: CarpetListResponse): CarpetListResponse => ({
  ...data,
  items: data.items ?? [],
});

const getCacheKey = (query: CarpetQuery = {}) =>
  JSON.stringify(
    Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
  );

const getCachedCarpets = (key: string): CarpetListResponse | null => {
  const cached = carpetsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    carpetsCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCachedCarpets = (key: string, data: CarpetListResponse) => {
  carpetsCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  });
};

const getCachedCategories = (): Category[] | null => {
  if (!categoriesCache) return null;
  if (categoriesCache.expiresAt <= Date.now()) {
    categoriesCache = null;
    return null;
  }
  return categoriesCache.data;
};

const setCachedCategories = (data: Category[]) => {
  categoriesCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  };
};

export async function getCarpets(query: CarpetQuery = {}, signal?: AbortSignal): Promise<CarpetListResponse> {
  const cacheKey = getCacheKey(query);
  try {
    const { data } = await api.get<CarpetListResponse>('/carpets', { params: query, signal });
    const normalized = normalizeListResponse(data);
    setCachedCarpets(cacheKey, normalized);
    return normalized;
  } catch (error) {
    const cached = getCachedCarpets(cacheKey);
    if (cached) return cached;
    throw error;
  }
}

export async function getCarpetById(id: string, signal?: AbortSignal): Promise<Carpet> {
  const { data } = await api.get<Carpet>(`/carpets/${id}`, { signal });
  return data;
}

export async function getCategories(): Promise<Category[]> {
  try {
    const { data } = await api.get<Category[]>('/categories');
    const normalized = data ?? [];
    setCachedCategories(normalized);
    return normalized;
  } catch (error) {
    const cached = getCachedCategories();
    if (cached) return cached;
    throw error;
  }
}

export type CollectionMaterialLookup = {
  found: boolean;
  collectionName: string;
  material: string | null;
  count: number;
};

export async function getCollectionM2Price(name: string): Promise<CollectionM2PriceLookup> {
  const { data } = await api.get<CollectionM2PriceLookup>('/carpets/m2-price', {
    params: { name },
  });
  return data;
}

export async function getCollectionMaterial(name: string): Promise<CollectionMaterialLookup> {
  const { data } = await api.get<CollectionMaterialLookup>('/carpets/material', {
    params: { name },
  });
  return data;
}

export type DiscountGroup = {
  name: string;
  discountPercent: number;
  carpetCount: number;
  totalCount: number;
};

export async function getDiscountGroups(): Promise<DiscountGroup[]> {
  const { data } = await api.get<DiscountGroup[]>('/carpets/discounts');
  return data ?? [];
}

export async function getLikedCarpets(): Promise<Carpet[]> {
  const { data } = await api.get<Carpet[]>('/carpets/liked');
  return data ?? [];
}

export type FilterNamesResponse = {
  success: boolean;
  data: string[];
};

export type FilterMaterialsResponse = {
  success: boolean;
  data: string[];
};

export async function getFilterNames(kind?: string): Promise<string[]> {
  const { data } = await api.get<FilterNamesResponse>(`/carpets/filter/names${kind ? `?kind=${kind}` : ''}`);
  return data?.success ? data.data : [];
}


export async function getFilterMaterials(kind?: string): Promise<string[]> {
  const { data } = await api.get<FilterMaterialsResponse>(`/carpets/filter/materials${kind ? `?kind=${kind}` : ''}`);
  return data?.success ? data.data : [];
}

export type FilterSizesResponse = {
  success: boolean;
  data: string[];
};

export async function getFilterSizes(kind?: string): Promise<string[]> {
  const { data } = await api.get<FilterSizesResponse>(`/carpets/filter/sizes${kind ? `?kind=${kind}` : ''}`);
  return data?.success ? data.data : [];
}




