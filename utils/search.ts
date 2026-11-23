/**
 * Qidiruv qiymatlarini normalizatsiya qilish uchun frontend util funksiyasi.
 * Backenddagi search.util.ts bilan 100% bir xil ishlaydi.
 */
export function normalizeSearchValue(value: string): string {
  if (!value) return '';

  return value
    .normalize('NFKC')
    .toLowerCase()
    // Tag chiziqlar va chiziqchalarni bo'shliqqa almashtiramiz
    .replace(/[_-]/g, ' ')
    // O'zbekcha o' / o‘ / o’ diakritik belgilarini oddiy o harfiga almashtirish
    .replace(/[o‘'’]/g, 'o')
    // O'zbekcha g' / g‘ / g’ diakritik belgilarini oddiy g harfiga almashtirish
    .replace(/[g‘'’]/g, 'g')
    // Boshqa har qanday ' va ’ belgilarini tozalash
    .replace(/['’‘ʻ]/g, '')
    // Ortiqcha bo'shliqlarni bitta bo'shliqqa keltirish
    .replace(/\s+/g, ' ')
    .trim();
}

