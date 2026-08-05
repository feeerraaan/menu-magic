// Frontend-safe. Plain TypeScript types only.

import type { AiJobType } from './common';

// Word (.docx) and Excel (.xlsx) parsing, photo/image OCR, and website-URL scraping are not
// implemented — see docs/IMPLEMENTATION_PLAN.md's Phase 4 notes. Only these two source types
// are wired end-to-end today.
export type MenuImportSourceType = 'text' | 'pdf';

export interface MenuImportStartInput {
  restaurantId: string;
  sourceType: MenuImportSourceType;
  text?: string; // sourceType 'text'
  fileBase64?: string; // sourceType 'pdf'
  fileName?: string;
  // Phase 5 (AI Setup) — tags the ai_jobs row with 'ai_setup' instead of the default
  // 'menu_import' so onboarding imports are separable in analytics. Same pipeline, same cost.
  jobType?: AiJobType;
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
