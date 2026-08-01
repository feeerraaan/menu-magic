// Frontend-safe. Plain TypeScript types only.

// Word (.docx) and Excel (.xlsx) parsing, and photo/image OCR, are not implemented in this
// pass — see docs/IMPLEMENTATION_PLAN.md's Phase 4 notes. Only these three source types are
// wired end-to-end today.
export type MenuImportSourceType = 'text' | 'url' | 'pdf';

export interface MenuImportStartInput {
  restaurantId: string;
  sourceType: MenuImportSourceType;
  text?: string; // sourceType 'text'
  url?: string; // sourceType 'url'
  fileBase64?: string; // sourceType 'pdf'
  fileName?: string;
}

export interface MenuImportItem {
  name: string;
  description?: string | null;
  price?: number | null;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isSpicy?: boolean;
  isGlutenFree?: boolean;
  allergens?: string[];
}

export interface MenuImportCategory {
  name: string;
  description?: string | null;
  items: MenuImportItem[];
}

export interface MenuImportTranslatedItem {
  name: string;
  description?: string | null;
}

export interface MenuImportTranslatedCategory {
  name: string;
  description?: string | null;
  items: MenuImportTranslatedItem[];
}

export interface MenuImportTranslation {
  menuName: string;
  categories: MenuImportTranslatedCategory[];
}

export interface MenuImportResult {
  menuName: string;
  categories: MenuImportCategory[];
  // Keyed by language code, one entry per restaurant.supported_languages entry other than
  // the default language — same shape/order as `categories`/`items` so the review UI can
  // zip them together positionally.
  translationsByLanguage: Record<string, MenuImportTranslation>;
}

export interface MenuImportStartResponse {
  jobId: string;
  status: 'processing';
}
