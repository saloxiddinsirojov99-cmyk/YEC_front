'use client';

import { FormEvent, useEffect, useMemo, useState, useRef, DragEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { api, formatPrice, getErrorMessage, getImageUrl } from '@/services/api';
import {
  getCarpetById,
  getCategories,
  getCollectionMaterial,
  getCollectionM2Price,
} from '@/services/carpet.service';
import type { Category } from '@/types/carpet';
import { getCollectionImageFromDesignCode } from '@/utils/carpet-image';
import { parseAreaFromSize, parseDimensionsFromSize } from '@/utils/size';
import { buildCreatePayload, buildUpdatePayload } from '@/utils/carpet-mapper';
import SearchableSelect from '@/components/admin/SearchableSelect';

const PRAYER_MAT_CATEGORY_NAME = 'Joynamoz';
const OVAL_CARPET_CATEGORY_NAME = 'Ovalni gilamlar';
const PRAYER_MAT_CATEGORY_KEYWORD = 'joynamoz';
const OVAL_CARPET_CATEGORY_KEYWORD = 'oval';
const PRAYER_MAT_SIZES = [
  { label: '0.5 x 1.25 m', value: '0.5x1.25' },
  { label: '0.75 x 1.25 m', value: '0.75x1.25' },
];

const AUTO_MANAGED_MATERIALS = [
  'Micro-polyester',
  'Acrylic',
  'Acrylic + Polyester',
  'Baxmal (Velvet)',
  'Ipak',
  'Cotton',
];

const normalizeCollection = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeNonNegativeNumberInput = (rawValue: string) => {
  if (rawValue === '') return '';
  const normalized = rawValue.replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return '';
  return String(Math.max(0, parsed));
};

const isPrayerCategoryName = (rawName?: string) =>
  (rawName ?? '').toLowerCase().includes(PRAYER_MAT_CATEGORY_KEYWORD);

const isOvalCategoryName = (rawName?: string) =>
  (rawName ?? '').toLowerCase().includes(OVAL_CARPET_CATEGORY_KEYWORD);

type PredefinedName = {
  id: string;
  name: string;
  designCode: string;
  images: string[];
  categoryId?: string;
  material?: string;
  brand?: string;
};

export default function CreateAdminCarpetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getParam = (key: string) => searchParams?.get(key) ?? '';
  const editId = getParam('id');
  const isEditMode = Boolean(editId);
  const forcedPrayerMat = getParam('type') === 'joynamoz';
  const forcedOvalCarpet = getParam('type') === 'oval';
  const forcedRoll = getParam('type') === 'roll';
  const initialType =
    forcedPrayerMat ? 'joynamoz' : forcedOvalCarpet ? 'oval' : forcedRoll ? 'roll' : 'carpet';
  const initialName = getParam('name');
  const initialSize = getParam('size');
  const initialMaterial = getParam('material');
  const initialCategoryId = getParam('categoryId');
  const initialDescription = getParam('description');
  const initialStock = getParam('stock') || '1';

  const [categories, setCategories] = useState<Category[]>([]);
  const [productType, setProductType] = useState<'carpet' | 'joynamoz' | 'oval' | 'roll'>(
    (initialType as 'carpet' | 'joynamoz' | 'oval' | 'roll') || 'carpet',
  );
  const [widthCm, setWidthCm] = useState('');
  const [originalLengthCm, setOriginalLengthCm] = useState('');
  const [name, setName] = useState(initialName);
  const [pricePerM2, setPricePerM2] = useState('');
  const [stock, setStock] = useState(initialStock);
  const [size, setSize] = useState(initialSize);
  const [material, setMaterial] = useState(initialMaterial);
  const [brand, setBrand] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [pileHeight, setPileHeight] = useState('');
  const [barcode, setBarcode] = useState('');
  const [materialAutoManaged, setMaterialAutoManaged] = useState(true);
  const [qoShimchaKod, setQoShimchaKod] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [description, setDescription] = useState(initialDescription);
  const [showInHero, setShowInHero] = useState(false);
  const [designCode, setDesignCode] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  const [m2LookupLoading, setM2LookupLoading] = useState(false);
  const [m2LookupDone, setM2LookupDone] = useState(false);
  const [m2AutoLocked, setM2AutoLocked] = useState(false);
  const [m2LookupNameKey, setM2LookupNameKey] = useState('');
  const [m2LookupMessage, setM2LookupMessage] = useState('');
  const [materialLookupLoading, setMaterialLookupLoading] = useState(false);
  const [materialLookupMessage, setMaterialLookupMessage] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [creatingForcedCategory, setCreatingForcedCategory] = useState(false);

  // Predefined Nom States & Modal
  const [predefinedNames, setPredefinedNames] = useState<PredefinedName[]>([]);
  const [showNewNameModal, setShowNewNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newPricePerM2, setNewPricePerM2] = useState('');
  const [newDesignEntries, setNewDesignEntries] = useState<
    { id: string; designCode: string; files: File[]; previews: string[] }[]
  >([{ id: '1', designCode: '', files: [], previews: [] }]);
  const [newNameSaving, setNewNameSaving] = useState(false);

  // Drag & drop highlight state
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchPredefinedNames = async () => {
    try {
      const { data } = await api.get<PredefinedName[]>('/carpets/predefined-names');
      setPredefinedNames(data || []);
    } catch (err) {
      console.error('Error fetching predefined names:', err);
    }
  };

  const handleAddDesignEntry = () => {
    setNewDesignEntries((prev) => [
      ...prev,
      { id: Date.now().toString(), designCode: '', files: [], previews: [] },
    ]);
  };

  const handleRemoveDesignEntry = (id: string) => {
    setNewDesignEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const handleUpdateDesignCode = (id: string, code: string) => {
    setNewDesignEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, designCode: code.toUpperCase() } : e)),
    );
  };

  const handleUpdateDesignFiles = (id: string, filesList: File[]) => {
    const previewsList = filesList.map((file) => URL.createObjectURL(file));
    setNewDesignEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, files: filesList, previews: previewsList } : e)),
    );
  };

  const handleSaveNewName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) {
      showToast('error', "Kolleksiya nomini kiriting.");
      return;
    }

    for (let i = 0; i < newDesignEntries.length; i++) {
      const entry = newDesignEntries[i];
      if (!entry.designCode.trim()) {
        showToast('error', `${i + 1}-gul kodini kiriting.`);
        return;
      }
      if (entry.files.length === 0) {
        showToast('error', `"${entry.designCode}" gul kodi uchun kamida bitta rasm yuklang.`);
        return;
      }
    }

    try {
      setNewNameSaving(true);
      let lastCreatedEntry: any = null;

      for (const entry of newDesignEntries) {
        const uploadedUrls: string[] = [];
        for (const file of entry.files) {
          const formData = new FormData();
          formData.append('file', file);
          const { data } = await api.post('/upload/image', formData);
          uploadedUrls.push(data.url);
        }

        const { data: created } = await api.post('/carpets/predefined-names', {
          name: cleanName,
          designCode: entry.designCode.trim().toUpperCase(),
          images: uploadedUrls,
          material: newMaterial || null,
          brand: newBrand || null,
          pricePerM2: newPricePerM2 ? Number(newPricePerM2) : undefined,
        });

        lastCreatedEntry = created;
      }

      await fetchPredefinedNames();

      if (lastCreatedEntry) {
        setName(lastCreatedEntry.name);
        setDesignCode(lastCreatedEntry.designCode);
        setExistingImageUrls(lastCreatedEntry.images || []);
        setPreviews([]);
        setImageFiles([]);
        if (lastCreatedEntry.material) {
          setMaterial(lastCreatedEntry.material);
          setMaterialAutoManaged(false);
        }
        if (lastCreatedEntry.pricePerM2) {
          setPricePerM2(String(lastCreatedEntry.pricePerM2));
        }
      }

      setNewName('');
      setNewMaterial('');
      setNewBrand('');
      setNewPricePerM2('');
      setNewDesignEntries([{ id: '1', designCode: '', files: [], previews: [] }]);
      setShowNewNameModal(false);
      showToast('success', "Yangi shablonlar muvaffaqiyatli saqlandi!");
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setNewNameSaving(false);
    }
  };

  const isPrayerMat = productType === 'joynamoz';
  const isOvalCarpet = productType === 'oval';
  const isRoll = productType === 'roll';

  const forcedCategoryName = isPrayerMat
    ? PRAYER_MAT_CATEGORY_NAME
    : isOvalCarpet
      ? OVAL_CARPET_CATEGORY_NAME
      : '';
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const isForcedCategoryReady = !forcedCategoryName
    ? true
    : isPrayerMat
      ? isPrayerCategoryName(selectedCategory?.name)
      : isOvalCarpet
        ? isOvalCategoryName(selectedCategory?.name)
        : true;
  const submitBlockedByCategory = creatingForcedCategory || !isForcedCategoryReady;

  const previewUrls = useMemo(
    () => [...existingImageUrls, ...previews],
    [existingImageUrls, previews],
  );

  const autoDesignImage = useMemo(() => {
    const finalName = name.trim();
    const finalDesignCode = designCode.trim();
    if (!finalName || !finalDesignCode) return null;
    return getCollectionImageFromDesignCode(finalName, finalDesignCode);
  }, [name, designCode]);

  // Realtime Area
  const area = useMemo(() => {
    if (isRoll) {
      const w = Number(widthCm);
      const l = Number(originalLengthCm);
      if (w > 0 && l > 0) {
        return (w / 100) * (l / 100);
      }
      return 0;
    }
    return parseAreaFromSize(size) || 0;
  }, [isRoll, widthCm, originalLengthCm, size]);

  const totalPrice = useMemo(() => {
    if (isPrayerMat) {
      const p = Number(pricePerM2.replace(',', '.'));
      return Number.isFinite(p) && p > 0 ? Math.round(p) : null;
    }
    const per = Number(pricePerM2.replace(',', '.'));
    if (!area || !Number.isFinite(per) || per <= 0) return null;
    return Math.round(area * per);
  }, [area, pricePerM2, isPrayerMat]);

  // Toasts
  const showToast = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const lastNotifiedPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (totalPrice && totalPrice > 0 && area && area > 0) {
      if (lastNotifiedPriceRef.current !== totalPrice) {
        lastNotifiedPriceRef.current = totalPrice;
        showToast(
          'success',
          `✓ To'liq narx hisoblandi: ${formatPrice(totalPrice)} (Maydon: ${area.toFixed(2)} m²)`,
        );
      }
    } else {
      lastNotifiedPriceRef.current = null;
    }
  }, [totalPrice, area]);

  useEffect(() => {
    if (forcedPrayerMat && productType !== 'joynamoz') {
      setProductType('joynamoz');
    }
    if (forcedOvalCarpet && productType !== 'oval') {
      setProductType('oval');
    }
  }, [forcedPrayerMat, forcedOvalCarpet, productType]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
        await fetchPredefinedNames();
      } catch (err) {
        showToast('error', getErrorMessage(err));
      }
    };
    void load();
  }, []);

  // Load form draft on refresh in create mode
  useEffect(() => {
    if (editId) return;
    try {
      const saved = localStorage.getItem('yec_carpet_create_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.name) setName(draft.name);
        if (draft.productType) setProductType(draft.productType);
        if (draft.pricePerM2) setPricePerM2(draft.pricePerM2);
        if (draft.size) setSize(draft.size);
        if (draft.material) setMaterial(draft.material);
        if (draft.brand) setBrand(draft.brand);
        if (draft.description) setDescription(draft.description);
        if (draft.barcode) setBarcode(draft.barcode);
        if (draft.weightKg) setWeightKg(draft.weightKg);
        if (draft.pileHeight) setPileHeight(draft.pileHeight);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [editId]);

  // Auto-save form draft on change in create mode
  useEffect(() => {
    if (editId) return;
    const draft = {
      name,
      productType,
      pricePerM2,
      size,
      material,
      brand,
      description,
      barcode,
      weightKg,
      pileHeight,
    };
    try {
      localStorage.setItem('yec_carpet_create_draft', JSON.stringify(draft));
    } catch (e) {
      // Ignore quota errors
    }
  }, [editId, name, productType, pricePerM2, size, material, brand, description, barcode, weightKg, pileHeight]);

  useEffect(() => {
    if (!editId) return;

    let cancelled = false;
    const loadForEdit = async () => {
      try {
        setLoadingEditData(true);
        setError('');

        const existing = (await getCarpetById(editId)) as any;
        if (cancelled) return;

        const normalizedCategoryName = existing.category?.name?.toLowerCase() ?? '';
        const nextType: 'carpet' | 'joynamoz' | 'oval' | 'roll' = existing.type === 'ROLL'
          ? 'roll'
          : isPrayerCategoryName(normalizedCategoryName)
            ? 'joynamoz'
            : isOvalCategoryName(normalizedCategoryName)
              ? 'oval'
              : 'carpet';

        setProductType(nextType);
        setName(existing.name ?? '');
        
        // Extract size from active inventory items list if available
        const firstItem = existing.inventoryItems?.[0];
        setSize(firstItem?.size ?? existing.size ?? '');
        
        setCategoryId(existing.categoryId ?? '');
        setMaterial(existing.material ?? '');
        setBrand(existing.brand ?? '');
        setMaterialAutoManaged(
          AUTO_MANAGED_MATERIALS.includes((existing.material ?? '').trim()),
        );
        const isHero = (existing.description ?? '').includes('[HERO]');
        setShowInHero(isHero);
        setDescription((existing.description ?? '').replace('[HERO]', '').trim());
        const activeBarcode = nextType === 'joynamoz' ? '' : String(existing.barcode ?? existing.qo_shimchaKod ?? existing.designCode ?? '');
        setBarcode(activeBarcode);
        setDesignCode(nextType === 'joynamoz' ? '' : activeBarcode);
        setQoShimchaKod(activeBarcode);
        setWeightKg(
          existing.weightKg !== undefined && existing.weightKg !== null
            ? String(existing.weightKg)
            : '',
        );
        setPileHeight(
          existing.pileHeight !== undefined && existing.pileHeight !== null
            ? String(existing.pileHeight)
            : '',
        );
        // In edit mode, disable auto-overwrite so the admin's edits are not wiped
        setMaterialAutoManaged(false);
        
        // Populate stock count from active inventory items list if available
        const activeCount = existing.inventoryItems?.length || 0;
        setStock(String(Math.max(1, activeCount || Number(existing.stock) || 1)));
        setExistingImageUrls((existing.images ?? []).filter(Boolean));
        setImageFiles([]);
        setPreviews([]);

        const parsedPrice = Number(existing.price);
        if (nextType === 'joynamoz') {
          setPricePerM2(
            Number.isFinite(parsedPrice) && parsedPrice > 0
              ? String(Math.round(parsedPrice))
              : '',
          );
        } else if (nextType === 'roll') {
          setPricePerM2(String(parsedPrice));
          // Pre-fill roll inventories if available
          const primaryRoll = existing.rollInventories?.[0];
          if (primaryRoll) {
            setWidthCm(String(primaryRoll.widthCm));
            setOriginalLengthCm(String(primaryRoll.originalLengthCm));
          }
        } else {
          const parsedArea = parseAreaFromSize(existing.size ?? '');
          if (
            Number.isFinite(parsedPrice) &&
            parsedPrice > 0 &&
            parsedArea &&
            parsedArea > 0
          ) {
            const computedPerM2 = Math.round(parsedPrice / parsedArea);
            setPricePerM2(String(computedPerM2));
          } else {
            setPricePerM2('');
          }
        }

        setM2LookupDone(true);
        setM2AutoLocked(false); // always allow manual edit in edit mode
        setM2LookupMessage(
          "Tahrirlash rejimi: narxni qo'lda o'zgartirishingiz mumkin.",
        );
      } catch (err) {
        if (!cancelled) {
          showToast('error', getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoadingEditData(false);
        }
      }
    };

    void loadForEdit();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    if (!isPrayerMat) return;
    if (!PRAYER_MAT_SIZES.some((option) => option.value === size)) {
      setSize(PRAYER_MAT_SIZES[0].value);
    }
  }, [isPrayerMat]);

  useEffect(() => {
    if (!forcedCategoryName) return;
    if (categories.length === 0) return;

    const existing = categories.find((category) =>
      isPrayerMat
        ? isPrayerCategoryName(category.name)
        : isOvalCarpet
          ? isOvalCategoryName(category.name)
          : false,
    );

    if (existing) {
      if (categoryId !== existing.id) setCategoryId(existing.id);
      return;
    }

    if (creatingForcedCategory) return;

    const createCategory = async () => {
      try {
        setCreatingForcedCategory(true);
        const { data } = await api.post<Category>('/categories', {
          name: forcedCategoryName,
        });
        setCategories((prev) => [...prev, data]);
        setCategoryId(data.id);
      } catch (err) {
        const message = getErrorMessage(err);
        const statusCode = (err as any)?.response?.status;
        if (statusCode === 409 || message.includes('Kategoriya allaqachon mavjud')) {
          const { data } = await api.get<Category[]>('/categories');
          setCategories(data);
          const found = data.find(
            (category) =>
              (isPrayerMat && isPrayerCategoryName(category.name)) ||
              (isOvalCarpet && isOvalCategoryName(category.name)),
          );
          if (found) setCategoryId(found.id);
        } else {
          showToast('error', message);
        }
      } finally {
        setCreatingForcedCategory(false);
      }
    };

    void createCategory();
  }, [forcedCategoryName, categories, creatingForcedCategory, categoryId]);

  useEffect(() => {
    if (isPrayerMat || isOvalCarpet) return;

    const selectedCategory = categories.find((category) => category.id === categoryId);
    if (!selectedCategory) return;

    const normalizedName = selectedCategory.name.toLowerCase();
    if (isPrayerCategoryName(normalizedName) || isOvalCategoryName(normalizedName)) {
      setCategoryId('');
    }
  }, [isPrayerMat, isOvalCarpet, categories, categoryId]);

  const lookupM2ByName = async (): Promise<{
    ok: boolean;
    autoLocked: boolean;
    resolvedM2Price: number | null;
  }> => {
    if (isPrayerMat) {
      setM2LookupDone(false);
      setM2AutoLocked(false);
      setM2LookupNameKey('');
      setM2LookupMessage('');
      return { ok: true, autoLocked: false, resolvedM2Price: null };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setM2LookupDone(false);
      setM2AutoLocked(false);
      setM2LookupNameKey('');
      setM2LookupMessage("Avval gilam nomini to'liq kiriting.");
      return { ok: false, autoLocked: false, resolvedM2Price: null };
    }

    const lookupKey = normalizeCollection(trimmedName);
    if (lookupKey && lookupKey === m2LookupNameKey && m2LookupDone) {
      return {
        ok: true,
        autoLocked: m2AutoLocked,
        resolvedM2Price: m2AutoLocked ? Number(pricePerM2.replace(',', '.')) : null,
      };
    }

    try {
      setM2LookupLoading(true);
      setError('');
      const result = await getCollectionM2Price(trimmedName);
      setM2LookupDone(true);
      setM2LookupNameKey(lookupKey);

      if (result.found && Number(result.m2Price) > 0) {
        const autoM2 = Math.round(Number(result.m2Price));
        setPricePerM2(String(autoM2));
        setM2AutoLocked(false);
        setM2LookupMessage(
          `✓ "${result.collectionName}" shablon m² narxi keldi: ${formatPrice(autoM2)}. Qo'lda o'zgartirishingiz ham mumkin.`,
        );
        return { ok: true, autoLocked: false, resolvedM2Price: autoM2 };
      } else {
        setM2AutoLocked(false);
        setM2LookupMessage(
          `⚠️ Ushbu shablon bo'yicha m² narxi topilmadi. m² narxini qo'lda kiriting.`,
        );
        return { ok: true, autoLocked: false, resolvedM2Price: null };
      }
    } catch (err) {
      setM2LookupDone(false);
      setM2AutoLocked(false);
      setM2LookupNameKey('');
      setM2LookupMessage("Nom bo'yicha m2 narxini tekshirib bo'lmadi.");
      showToast('error', getErrorMessage(err));
      return { ok: false, autoLocked: false, resolvedM2Price: null };
    } finally {
      setM2LookupLoading(false);
    }
  };

  useEffect(() => {
    if (isPrayerMat) {
      setM2LookupDone(false);
      setM2AutoLocked(false);
      setM2LookupNameKey('');
      setM2LookupMessage('');
    }
  }, [isPrayerMat]);

  useEffect(() => {
    if (name && name.trim()) {
      void lookupM2ByName();
    }
  }, [name]);

  // Auto-fill material/category by template first, then fallback to keyword rules.
  useEffect(() => {
    const canAutoOverwrite =
      materialAutoManaged ||
      !material ||
      AUTO_MANAGED_MATERIALS.includes(material.trim());

    if (!canAutoOverwrite) {
      setMaterialLookupLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        if (!cancelled) {
          setMaterial('');
          setMaterialLookupMessage('');
          setMaterialLookupLoading(false);
        }
        return;
      }

      try {
        setMaterialLookupLoading(true);
        const lookup = await getCollectionMaterial(trimmedName);
        if (cancelled) return;

        if (lookup.found && lookup.material) {
          setMaterial(lookup.material);
          setMaterialAutoManaged(true);
          setMaterialLookupMessage(
            `"${lookup.collectionName}" bo'yicha material topildi: ${lookup.material}.`,
          );
          setMaterialLookupLoading(false);
          return;
        }
      } catch {
        // ignore & fallback
      }

      if (cancelled) return;
      setMaterialLookupLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, isPrayerMat, material, materialAutoManaged]);

  // Drag and Drop files
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    const validImages = files.filter((f) => f.type.startsWith('image/'));
    if (validImages.length > 0) {
      setImageFiles((prev) => [...prev, ...validImages]);
      const newPreviews = validImages.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // Reordering preview lists
  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= previewUrls.length) return;

    // We have existingImageUrls (first part) and imageFiles / previews (second part)
    const allUrls = [...previewUrls];
    const itemToMove = allUrls[index];
    allUrls.splice(index, 1);
    allUrls.splice(targetIdx, 0, itemToMove);

    // Map back to existing vs new arrays
    const newExisting: string[] = [];
    const newFiles: File[] = [];
    const newPreviewsList: string[] = [];

    allUrls.forEach((url) => {
      // Find if it was an existing image url
      const existIdx = existingImageUrls.indexOf(url);
      if (existIdx !== -1) {
        newExisting.push(url);
      } else {
        // It was a new blob url
        const prevIdx = previews.indexOf(url);
        if (prevIdx !== -1) {
          newPreviewsList.push(url);
          newFiles.push(imageFiles[prevIdx]);
        }
      }
    });

    setExistingImageUrls(newExisting);
    setPreviews(newPreviewsList);
    setImageFiles(newFiles);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const finalName = name.trim();
      const finalDesignCode = designCode.trim();
      const finalBarcode = barcode.trim() || qoShimchaKod.trim();

      // Required fields validation
      if (!finalName || (!isPrayerMat && !finalDesignCode) || (!isRoll && !size) || !pricePerM2) {
        showToast('error', "Iltimos, barcha majburiy maydonlarni to'ldiring.");
        setLoading(false);
        return;
      }
      if (isRoll && (!widthCm.trim() || !originalLengthCm.trim())) {
        showToast('error', "Iltimos barcha maydonlarni to'ldiring.");
        setLoading(false);
        return;
      }

      // Barcode uniqueness pre-flight check
      if (!isEditMode && finalBarcode) {
        const { data: checkData } = await api.get(`/carpets/check-barcode/${encodeURIComponent(finalBarcode)}`);
        if (checkData.exists) {
          showToast('error', `Ushbu shtrix kod (${finalBarcode}) bazada allaqachon mavjud.`);
          setLoading(false);
          return;
        }
      }

      let effectiveTotalPrice: number | null = totalPrice;
      if (isPrayerMat) {
        const fullPrice = Number(pricePerM2.replace(',', '.'));
        if (!Number.isFinite(fullPrice) || fullPrice <= 0) {
          showToast('error', "Narx 0 dan katta bo'lishi kerak.");
          setLoading(false);
          return;
        }
        effectiveTotalPrice = Math.round(fullPrice);
      } else if (isRoll) {
        if (isNaN(Number(widthCm)) || Number(widthCm) <= 0) {
          showToast('error', "Kenglikni to'g'ri (0 dan katta) kiriting.");
          setLoading(false);
          return;
        }
        if (isNaN(Number(originalLengthCm)) || Number(originalLengthCm) <= 0) {
          showToast('error', "Uzunlikni to'g'ri (0 dan katta) kiriting.");
          setLoading(false);
          return;
        }
        if (isNaN(Number(pricePerM2)) || Number(pricePerM2) <= 0) {
          showToast('error', "m² narxini to'g'ri (0 dan katta) kiriting.");
          setLoading(false);
          return;
        }
      } else {
        const perM2Price = Number(pricePerM2.replace(',', '.'));
        if (!Number.isFinite(perM2Price) || perM2Price <= 0) {
          showToast('error', "m2 narxi 0 dan katta bo'lishi kerak.");
          setLoading(false);
          return;
        }
        if (!area || area <= 0) {
          showToast('error', "O'lcham bo'yicha maydon hisoblanmadi. O'lchamni tekshiring.");
          setLoading(false);
          return;
        }
        effectiveTotalPrice = Math.round(area * perM2Price);
      }

      if (!isRoll) {
        if (!Number.isFinite(Number(effectiveTotalPrice)) || Number(effectiveTotalPrice) <= 0) {
          showToast('error', "Narx va o'lchamni to'g'ri kiriting.");
          setLoading(false);
          return;
        }
      }

      const autoMappedImage = getCollectionImageFromDesignCode(
        finalName,
        finalBarcode || undefined,
      );

      const uploadedImageUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/upload/image', formData);
        uploadedImageUrls.push(data.url);
      }

      const finalImageUrls = Array.from(
        new Set(
          [
            ...(!(isOvalCarpet || isPrayerMat) && autoMappedImage ? [autoMappedImage] : []),
            ...existingImageUrls,
            ...uploadedImageUrls,
          ].filter(Boolean),
        ),
      );

      if (finalImageUrls.length === 0) {
        showToast('error', "Kamida bitta rasm yuklashingiz shart.");
        setLoading(false);
        return;
      }

      if (!categoryId) {
        showToast('error', "Kategoriya topilmadi. Sahifani yangilang.");
        setLoading(false);
        return;
      }

      const selectedCategory = categories.find((category) => category.id === categoryId);
      const selectedCategoryName = selectedCategory?.name.toLowerCase() ?? '';
      if (!selectedCategoryName) {
        showToast('error', "Kategoriya topilmadi. Sahifani yangilang.");
        setLoading(false);
        return;
      }

      if (isOvalCarpet && !isOvalCategoryName(selectedCategoryName)) {
        showToast('error', "Oval turi uchun 'Ovalni gilamlar' kategoriyasi tayyor bo'lishi kerak.");
        setLoading(false);
        return;
      }

      if (isPrayerMat && !isPrayerCategoryName(selectedCategoryName)) {
        showToast('error', "Joynamoz turi uchun 'Joynamoz' kategoriyasi tanlanishi kerak.");
        setLoading(false);
        return;
      }

      let finalDescription = description.trim();
      if (finalDescription) {
        finalDescription =
          finalDescription.charAt(0).toUpperCase() + finalDescription.slice(1);
        if (!finalDescription.endsWith('.')) {
          finalDescription += '.';
        }
      }
      if (showInHero) {
        finalDescription = `${finalDescription} [HERO]`.trim();
      }

      const formState = {
        name: finalName,
        designCode: finalDesignCode,
        categoryId,
        size: isRoll ? 'ROLL' : size,
        material,
        brand: brand || undefined,
        description: finalDescription || undefined,
        qoShimchaKod: finalBarcode || undefined,
        images: finalImageUrls,
        productType,
        pricePerM2,
        totalPrice: effectiveTotalPrice ? Number(effectiveTotalPrice) : undefined,
        stock,
        widthCm,
        originalLengthCm,
        weightKg: weightKg || undefined,
        pileHeight: pileHeight || undefined,
        barcode: finalBarcode || undefined,
      };

      console.log('Sending Form State:', formState);

      if (isEditMode && editId) {
        const updatePayload = buildUpdatePayload(formState);
        console.log('Update Payload:', updatePayload);
        await api.patch(`/carpets/${editId}`, updatePayload);
        showToast('success', "Mahsulot muvaffaqiyatli tahrirlandi!");
      } else {
        const createPayload = buildCreatePayload(formState);
        console.log('Create Payload:', createPayload);
        await api.post('/carpets', createPayload);
        localStorage.removeItem('yec_carpet_create_draft');
        const successMessage = isPrayerMat
          ? "Joynamoz muvaffaqiyatli qo'shildi!"
          : isRoll
            ? "Metrajli gilam variant sifatida muvaffaqiyatli saqlandi!"
            : isOvalCarpet
              ? "Oval gilam muvaffaqiyatli qo'shildi!"
              : "Gilam muvaffaqiyatli qo'shildi!";
        showToast('success', successMessage);
      }

      setTimeout(() => {
        router.push(isRoll ? '/admin/roll-carpets' : '/admin/carpets');
      }, 1500);

    } catch (err: any) {
      console.error('Carpet save error:', err);
      const backendErrors = err.response?.data?.errors;
      const backendMessage = err.response?.data?.message;

      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        const errorLines = backendErrors.map(
          (e: any) => `${e.field}: ${e.message} (Yuborilgan: ${JSON.stringify(e.value)})`
        );
        showToast('error', errorLines.join(', '));
      } else if (backendMessage) {
        showToast('error', Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage);
      } else {
        showToast('error', getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };



  const uniqueNames = useMemo(() => {
    const names = predefinedNames.map((p) => p.name);
    return Array.from(new Set(names));
  }, [predefinedNames]);

  const nameOptions = useMemo(() => {
    return uniqueNames.map((n) => ({
      value: n,
      label: n,
    }));
  }, [uniqueNames]);

  const designCodeOptions = useMemo(() => {
    if (!name) return [];
    const matches = predefinedNames.filter((p) => p.name === name);
    return matches.map((p) => ({
      value: p.designCode,
      label: p.designCode,
      original: p,
    }));
  }, [name, predefinedNames]);

  if ((loading || loadingEditData) && categories.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="section-shell py-8 relative max-w-4xl mx-auto select-none">
      {/* Back button */}
      <Link
        href={isRoll ? '/admin/roll-carpets' : '/admin/carpets'}
        className="text-xs text-ink/50 hover:text-ink transition flex items-center gap-1 mb-4"
      >
        ← Ro&apos;yxatga qaytish
      </Link>

      <div className="flex items-center justify-between">
         <h1 className="font-serif text-4xl text-ink font-bold tracking-tight">
           {isEditMode
             ? 'Mahsulotni tahrirlash'
             : isPrayerMat
               ? "Joynamoz qo'shish"
               : isRoll
                 ? "Metraj gilam (ROLL) qo'shish"
                 : isOvalCarpet
                   ? "Oval gilam qo'shish"
                   : "Gilam qo'shish"}
         </h1>
      </div>



      {/* Main card panel */}
      <form
        className="panel mt-6 grid gap-6 p-8 bg-white border border-sand rounded-3xl shadow-xl hover:shadow-2xl transition duration-500 md:grid-cols-2"
        onSubmit={submit}
      >
        {/* Product Type Selection */}
        <div className="md:col-span-2 space-y-1">
          <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Mahsulot turi</label>
          {forcedPrayerMat || forcedOvalCarpet || forcedRoll ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              {forcedPrayerMat
                ? 'Joynamoz (avtomatik)'
                : forcedRoll
                  ? 'Metraj gilam (avtomatik)'
                  : 'Oval gilam (avtomatik)'}
            </div>
          ) : (
            <select
              className="input-field"
              value={productType}
              onChange={(event) =>
                setProductType(event.target.value as any)
              }
            >
              <option value="carpet">Tayyor gilam</option>
              <option value="oval">Oval gilam</option>
              <option value="roll">Metraj gilam (ROLL)</option>
              <option value="joynamoz">Joynamoz</option>
            </select>
          )}
        </div>

        {/* Carpet Name Selectable Search */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
            {isPrayerMat ? "Joynamoz nomi" : "Gilam nomi"}
          </label>
          <SearchableSelect
            value={name}
            onChange={(val) => {
              setName(val);
              // Only reset design/images when selecting a different template in create mode
              if (!isEditMode) {
                setDesignCode('');
                setExistingImageUrls([]);
                setBrand('');
              }
              // Auto fill material by selected name
              const foundTemplate = predefinedNames.find(
                (p) => p.name.trim().toLowerCase() === val.trim().toLowerCase(),
              );
              if (foundTemplate?.material) {
                setMaterial(foundTemplate.material);
                setMaterialAutoManaged(false);
              } else if (val) {
                const lower = val.toLowerCase();
                if (lower.includes('verona')) setMaterial('Micro-polyester');
                else if (lower.includes('zenit') || lower.includes('luna')) setMaterial('Acrylic + Micro-polyester');
                else if (lower.includes('steffani') || lower.includes('stefani')) setMaterial('Acrylic');
                else if (lower.includes('soft') || lower.includes('eron') || lower.includes('iran')) setMaterial('Eron Soft (Micro-polyester)');
                else if (!material) setMaterial('Micro-polyester');
              }
            }}
            options={nameOptions}
            placeholder="Tanlang yoki yangi nom yarating..."
            disabled={false}
            onAddClick={!isEditMode ? () => setShowNewNameModal(true) : undefined}
            required
          />
        </div>

        {/* Design Code Selectable Search */}
        {!isPrayerMat && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Gul kodi</label>
            <SearchableSelect
              value={designCode}
              onChange={(val) => {
                setDesignCode(val);
                if (!isEditMode) {
                  const found = predefinedNames.find((p) => p.name === name && p.designCode === val);
                  if (found) {
                    setExistingImageUrls(found.images || []);
                    setPreviews([]);
                    setImageFiles([]);
                    if (found.categoryId) setCategoryId(found.categoryId);
                    if (found.material) {
                      setMaterial(found.material);
                      setMaterialAutoManaged(false);
                    }
                    if (found.brand) setBrand(found.brand);
                  }
                }
              }}
              options={designCodeOptions}
              placeholder={name ? "Gul kodini tanlang yoki kiriting..." : "Avval gilam nomini tanlang"}
              disabled={!name}
              required={!isPrayerMat}
            />
          </div>
        )}

        {/* Roll Specific inputs */}
        {isRoll ? (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">1 m² narxi (so&apos;m)</label>
              <input
                className="input-field"
                type="number"
                min="1"
                placeholder="Masalan: 120000"
                value={pricePerM2}
                onChange={(e) => setPricePerM2(normalizeNonNegativeNumberInput(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Kenglik (sm)</label>
              <input
                className="input-field"
                type="number"
                min="10"
                placeholder="Masalan: 150"
                value={widthCm}
                onChange={(e) => setWidthCm(normalizeNonNegativeNumberInput(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Boshlang&apos;ich uzunlik (sm)</label>
              <input
                className="input-field"
                type="number"
                min="10"
                placeholder="Masalan: 5000"
                value={originalLengthCm}
                onChange={(e) => setOriginalLengthCm(normalizeNonNegativeNumberInput(e.target.value))}
                required
              />
              <p className="text-[10px] text-ink/40 mt-1">
                Kiritilgan o&apos;lchamlar bo&apos;yicha umumiy maydon hisoblab chiqariladi.
              </p>
            </div>
          </>
        ) : (
          /* Ready Carpet Specific inputs */
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
                  {isPrayerMat ? "Toliq narxi (so'm)" : "1 m2 narxi (so'm)"} <span className="text-red-500">*</span>
                </label>
                {m2LookupLoading && (
                  <span className="text-[10px] text-sky-600 font-bold animate-pulse">
                    Tekshirilmoqda...
                  </span>
                )}
              </div>
              <input
                className="input-field"
                type="number"
                min="0.01"
                step="0.01"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                }}
                placeholder={
                  isPrayerMat
                    ? "Tavsiya etilgan narx"
                    : "m2 narxini kiriting (so'mda)"
                }
                value={pricePerM2}
                onChange={(e) => {
                  setPricePerM2(normalizeNonNegativeNumberInput(e.target.value));
                }}
                required
              />
              {m2LookupMessage && (
                <p className="text-[10px] text-ink/50 mt-1 font-medium">{m2LookupMessage}</p>
              )}
            </div>

            {!isPrayerMat && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">
                  Jami To&apos;liq Narx (Hisoblangan)
                </label>
                <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-sand/30 via-white to-amber-500/10 p-3 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider block">
                      {area > 0 ? `Maydon: ${area.toFixed(2)} m²` : "O'lcham kiritilganda hisoblanadi"}
                    </span>
                    <span className="font-serif text-lg font-extrabold text-primary">
                      {totalPrice ? formatPrice(totalPrice) : "0 so'm"}
                    </span>
                  </div>
                  {totalPrice ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                      ✓ TAYYOR
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink/40 italic">
                      {!pricePerM2 ? "m² narxini kiriting" : "o'lchamni kiriting"}
                    </span>
                  )}
                </div>
              </div>
            )}





            {isPrayerMat ? (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Standart o&apos;lcham</label>
                  <select
                    className="input-field"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    required
                  >
                    {PRAYER_MAT_SIZES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Material</label>
                  <input
                    className="input-field"
                    placeholder="Masalan: micro-polyester, akril"
                    value={material}
                    onChange={(e) => {
                      setMaterial(e.target.value);
                      setMaterialAutoManaged(false);
                    }}
                    required
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Miqdori (Ombordagi dona soni)</label>
                  <input
                    className="input-field"
                    type="number"
                    min="1"
                    placeholder="Masalan: 10"
                    value={stock}
                    onChange={(e) => setStock(normalizeNonNegativeNumberInput(e.target.value))}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">O&apos;lcham (masalan: 2x3)</label>
                <input
                  className="input-field"
                  placeholder="Uzunlik va kenglik (sm)"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  onBlur={lookupM2ByName}
                  required
                />
              </div>
            )}
          </>
        )}

        {/* Real-time area preview label */}
        <div className="md:col-span-2 flex items-center text-sm font-semibold text-emerald-800 bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-100/50">
          📐 Umumiy maydon: {area ? `${area.toFixed(2)} m²` : "0.00 m² (o'lchamlardan kelib chiqib avtomatik hisoblanadi)"}
        </div>

        {/* Category select (shown if not joynamoz/oval template) */}
        {!(isPrayerMat || isOvalCarpet) && (
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Kategoriya</label>
            <select
              className="input-field"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">-- Kategoriyani tanlang --</option>
              {categories
                .filter((category) => {
                  const normalizedName = category.name.toLowerCase();
                  return (
                    !isPrayerCategoryName(normalizedName) &&
                    !isOvalCategoryName(normalizedName)
                  );
                })
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Material field for Non-Joynamoz products */}
        {!isPrayerMat && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Material</label>
            <input
              className="input-field"
              placeholder="Masalan: micro-polyester, akril"
              value={material}
              onChange={(e) => {
                setMaterial(e.target.value);
                setMaterialAutoManaged(false);
              }}
              required
            />
          </div>
        )}



        {!isPrayerMat && (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Vazni (kg)</label>
              <input
                className="input-field"
                placeholder="Masalan: 2.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Tuk balandligi (mm)</label>
              <input
                className="input-field"
                placeholder="Masalan: 12"
                value={pileHeight}
                onChange={(e) => setPileHeight(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Shtrix-kod (Kodi)</label>
              <input
                className="input-field font-mono text-sm tracking-wider"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Avtomatik yaratish uchun bo'sh qoldiring yoki raqam kiritng (masalan: 240540678)"
                value={barcode}
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, '');
                  setBarcode(onlyDigits);
                  setQoShimchaKod(onlyDigits);
                }}
                onKeyDown={(e) => {
                  if (
                    !/^[0-9]$/.test(e.key) &&
                    !['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'].includes(e.key) &&
                    !e.ctrlKey && !e.metaKey
                  ) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        )}



        {/* Multiple Drag and Drop Image Upload with manual reorder */}
        <div className="md:col-span-2 space-y-2">
          <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Rasmlar (Birinchi rasm asosiy bo&apos;ladi)</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-300 ${
              isDragOver ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-sand hover:border-primary/50 bg-sand/5'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <span className="text-4xl text-primary/75">📸</span>
              <p className="text-sm font-semibold text-ink/80">Rasmlarni shu erga sudrab tashlang yoki bosing</p>
              <p className="text-xs text-ink/40">Kamida bitta sifatli rasm yuklashingiz shart</p>
              <label className="mt-2 inline-flex items-center px-4 py-2 bg-white border border-sand text-ink rounded-xl text-xs font-bold shadow-md hover:bg-sand/20 active:scale-95 transition-all">
                Fayl tanlash
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const validImages = files.filter((f) => f.type.startsWith('image/'));
                    if (validImages.length > 0) {
                      setImageFiles((prev) => [...prev, ...validImages]);
                      const newPreviews = validImages.map((f) => URL.createObjectURL(f));
                      setPreviews((prev) => [...prev, ...newPreviews]);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Thumbnails preview list with reordering */}
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 pt-2">
              {previewUrls.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative group aspect-square rounded-2xl border border-sand overflow-hidden shadow-soft bg-white"
                >
                  <img
                    src={url.startsWith('blob:') ? url : getImageUrl(url) || url}
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow">
                      Cover
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx < existingImageUrls.length) {
                          const nextExisting = [...existingImageUrls];
                          nextExisting.splice(idx, 1);
                          setExistingImageUrls(nextExisting);
                          return;
                        }
                        const localIndex = idx - existingImageUrls.length;
                        const newFiles = [...imageFiles];
                        newFiles.splice(localIndex, 1);
                        setImageFiles(newFiles);
                        const newPreviews = [...previews];
                        newPreviews.splice(localIndex, 1);
                        setPreviews(newPreviews);
                      }}
                      className="ml-auto w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs hover:bg-red-700 shadow"
                    >
                      ✕
                    </button>
                    <div className="flex justify-between w-full">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveImage(idx, 'left')}
                        className="w-6 h-6 rounded-lg bg-white/90 text-ink flex items-center justify-center font-bold text-xs hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed shadow"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        disabled={idx === previewUrls.length - 1}
                        onClick={() => moveImage(idx, 'right')}
                        className="w-6 h-6 rounded-lg bg-white/90 text-ink flex items-center justify-center font-bold text-xs hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed shadow"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2 space-y-1">
          <label className="block text-xs font-bold text-ink/50 uppercase tracking-wider">Tavsif</label>
          <textarea
            className="input-field"
            placeholder="Gilam haqida to'liqroq ma'lumot kiriting..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        {/* Hero animation showcase checkbox */}
        <div className="md:col-span-2 flex items-center gap-3 py-3 bg-primary/5 rounded-2xl px-4 border border-primary/10 transition hover:bg-primary/10">
          <input
            id="showInHero"
            type="checkbox"
            className="h-5 w-5 rounded border-ink/20 text-primary focus:ring-primary cursor-pointer transition"
            checked={showInHero}
            onChange={(e) => setShowInHero(e.target.checked)}
          />
          <label htmlFor="showInHero" className="text-sm font-bold text-ink/80 select-none cursor-pointer flex-1">
            Kirish slaydida ko&apos;rsatish (Ushbu gilam saytga kirilganda bosh sahifada ko&apos;rinadigan slaydga chiqsin)
          </label>
        </div>

        {/* Save/Add Button */}
        <button
          type="submit"
          className="btn-primary md:col-span-2 w-full min-h-[50px] rounded-2xl flex items-center justify-center font-bold text-sm tracking-wider uppercase shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01]"
          disabled={loading || submitBlockedByCategory}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saqlanmoqda...
            </span>
          ) : submitBlockedByCategory ? (
            'Kategoriya yuklanmoqda...'
          ) : isEditMode ? (
            'Saqlash'
          ) : (
            'Qo\'shish'
          )}
        </button>
      </form>

      {/* Custom Success and Error Toast Notifications with Slide-in Animation */}
      {success ? (
         <div className="fixed top-24 right-6 z-50 rounded-2xl border border-green-200 bg-green-50 px-6 py-4 shadow-xl flex items-center gap-2 animate-scaleIn select-none">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-green-800 text-sm">{success}</p>
         </div>
      ) : null}

      {error ? (
         <div className="fixed top-24 right-6 z-50 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 shadow-xl flex items-center gap-2 animate-scaleIn select-none">
            <span className="text-xl">❌</span>
            <p className="font-semibold text-red-800 text-sm">{error}</p>
         </div>
      ) : null}

      {/* Predefined Carpet Name template creation modal */}
      {showNewNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 select-none animate-fadeIn">
          <div className="w-full max-w-3xl bg-white border border-sand/60 rounded-3xl p-6 sm:p-8 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-sand/40 mb-6">
              <div>
                <h3 className="font-serif text-2xl font-bold text-ink">
                  Yangi shablon nomi (Kolleksiya)
                </h3>
                <p className="text-xs text-ink/50 mt-1">
                  Kolleksiya nomiga bir nechta gul kodlari va ularning rasmlarini bir vaqtda biriktiring
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewName('');
                  setNewMaterial('');
                  setNewBrand('');
                  setNewDesignEntries([{ id: '1', designCode: '', files: [], previews: [] }]);
                  setShowNewNameModal(false);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-sand/20 hover:bg-sand/40 text-ink/60 hover:text-ink font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewName} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-sand/10 p-4 rounded-2xl border border-sand/30">
                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1.5">
                    Kolleksiya nomi (Nom) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewName(val.charAt(0).toUpperCase() + val.slice(1));
                    }}
                    placeholder="Masalan: VINTAGE, ISTANBUL"
                    className="w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-ink outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink/60 uppercase tracking-wider mb-1.5">
                    Material (Majburiy emas)
                  </label>
                  <input
                    type="text"
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    placeholder="Masalan: micro-polyester, akril"
                    className="w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Multi-Design Code List Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink/60 uppercase tracking-wider">
                    Gul kodlari va rasmlari ({newDesignEntries.length} ta)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddDesignEntry}
                    className="btn-secondary rounded-xl py-1.5 px-3 text-xs font-bold flex items-center gap-1 hover:border-primary/40"
                  >
                    ➕ Yana gul kodi qo&apos;shish
                  </button>
                </div>

                {newDesignEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl border border-sand bg-white shadow-xs space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                        Gul kodi #{idx + 1}
                      </span>
                      {newDesignEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDesignEntry(entry.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          🗑️ O&apos;chirish
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-bold text-ink/50 uppercase tracking-wider mb-1">
                          Gul kodi (Dizayn kodi) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={entry.designCode}
                          onChange={(e) => handleUpdateDesignCode(entry.id, e.target.value)}
                          placeholder="Masalan: A101"
                          className="w-full rounded-xl border border-sand bg-white px-3.5 py-2 text-sm font-mono tracking-wider text-ink outline-none focus:border-primary"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-ink/50 uppercase tracking-wider mb-1">
                          Dizayn rasmlari (Kamida 1 ta) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="file"
                          multiple
                          required={entry.files.length === 0}
                          accept="image/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            handleUpdateDesignFiles(entry.id, files);
                          }}
                          className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />

                        {entry.previews.length > 0 && (
                          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto py-1">
                            {entry.previews.map((url, pIdx) => (
                              <div
                                key={pIdx}
                                className="relative w-14 h-14 rounded-xl overflow-hidden border border-sand shrink-0 shadow-2xs"
                              >
                                <img
                                  src={url}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-sand/40">
                <button
                  type="button"
                  onClick={() => {
                    setNewName('');
                    setNewMaterial('');
                    setNewBrand('');
                    setNewDesignEntries([{ id: '1', designCode: '', files: [], previews: [] }]);
                    setShowNewNameModal(false);
                  }}
                  className="btn-secondary rounded-2xl py-2.5 px-5 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={newNameSaving}
                  className="btn-primary rounded-2xl py-2.5 px-7 text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {newNameSaving ? "Yuklanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
