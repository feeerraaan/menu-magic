// Restaurant Health Score — deterministic rules engine (v1).
// Pure functions, no I/O: unit-testable and safe. No LLM cost, no DB writes.
// Plan: docs/HACKATHON_POLISH_PLAN.md — Task 3.

import type { Category, CategoryTranslation, Item, ItemTranslation, Restaurant } from '@/types/database';

export type HealthFactorId =
  | 'images'
  | 'descriptions'
  | 'languages'
  | 'accessibility'
  | 'categories'
  | 'pricing'
  | 'popularity'
  | 'seo';

export type HealthFactorStatus = 'good' | 'warn' | 'bad';

export interface HealthFactor {
  id: HealthFactorId;
  /** Points earned (0..maxScore), fractional — rounded by the caller. */
  score: number;
  maxScore: number;
  /** Progress evidence for the UI note. */
  done?: number;
  total?: number;
  /** Optional i18n note key override for special cases. */
  noteKey?: string;
  status: HealthFactorStatus;
}

export interface RestaurantHealth {
  /** 0..100 */
  score: number;
  factors: HealthFactor[];
  /** Missing (item, language) translation pairs across non-default languages. */
  missingTranslations: number;
  /** Active items considered. */
  itemsTotal: number;
  /** Active categories considered. */
  categoriesTotal: number;
}

export interface HealthInput {
  restaurant: Pick<
    Restaurant,
    | 'is_published'
    | 'logo_url'
    | 'address'
    | 'phone'
    | 'instagram_url'
    | 'website_url'
    | 'hide_prices'
    | 'default_language'
    | 'supported_languages'
  >;
  categories: Pick<Category, 'id' | 'is_active'>[];
  items: Pick<
    Item,
    | 'id'
    | 'description'
    | 'price'
    | 'photo_url'
    | 'is_vegetarian'
    | 'is_vegan'
    | 'is_gluten_free'
    | 'is_spicy'
    | 'allergens'
  >[];
  itemTranslations: Pick<ItemTranslation, 'item_id' | 'language' | 'name'>[];
  categoryTranslations: Pick<CategoryTranslation, 'category_id' | 'language' | 'name'>[];
  /** Menu views in the last 30 days. */
  views30d: number;
}

const WEIGHTS: Record<HealthFactorId, number> = {
  images: 15,
  descriptions: 15,
  languages: 15,
  accessibility: 10,
  categories: 10,
  pricing: 10,
  popularity: 10,
  seo: 15,
};

const MIN_DESCRIPTION_LENGTH = 40;

function statusOf(score: number, maxScore: number): HealthFactorStatus {
  const ratio = maxScore === 0 ? 0 : score / maxScore;
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.4) return 'warn';
  return 'bad';
}

function factor(partial: Omit<HealthFactor, 'status'>): HealthFactor {
  return { ...partial, status: statusOf(partial.score, partial.maxScore) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeRestaurantHealth(input: HealthInput): RestaurantHealth {
  const { restaurant, items, itemTranslations, categoryTranslations, views30d } = input;
  const categories = input.categories.filter((c) => c.is_active !== false);

  const itemsTotal = items.length;
  const safeTotal = Math.max(itemsTotal, 1);
  const coverage = (done: number) => done / safeTotal;

  // --- Images (15) -------------------------------------------------------------
  const withPhoto = items.filter((i) => !!i.photo_url).length;
  const images = factor({
    id: 'images',
    score: round1(WEIGHTS.images * coverage(withPhoto)),
    maxScore: WEIGHTS.images,
    done: withPhoto,
    total: itemsTotal,
  });

  // --- Descriptions (15) -------------------------------------------------------
  const withGoodDescription = items.filter(
    (i) => (i.description ?? '').trim().length >= MIN_DESCRIPTION_LENGTH,
  ).length;
  const descriptions = factor({
    id: 'descriptions',
    score: round1(WEIGHTS.descriptions * coverage(withGoodDescription)),
    maxScore: WEIGHTS.descriptions,
    done: withGoodDescription,
    total: itemsTotal,
  });

  // --- Languages (15) ----------------------------------------------------------
  const nonDefaultLanguages = (restaurant.supported_languages ?? []).filter(
    (l) => l && l !== restaurant.default_language,
  );
  let languages: HealthFactor;
  let missingTranslations = 0;
  if (nonDefaultLanguages.length === 0) {
    languages = factor({
      id: 'languages',
      score: WEIGHTS.languages / 2,
      maxScore: WEIGHTS.languages,
      noteKey: 'single-language',
    });
  } else {
    const translatedPairs = new Set(
      itemTranslations
        .filter((tr) => (tr.name ?? '').trim().length > 0)
        .map((tr) => `${tr.item_id}:${tr.language}`),
    );
    const translatedCategoryPairs = new Set(
      categoryTranslations
        .filter((tr) => (tr.name ?? '').trim().length > 0)
        .map((tr) => `${tr.category_id}:${tr.language}`),
    );
    let itemCoverageSum = 0;
    let categoryCoverageSum = 0;
    for (const lang of nonDefaultLanguages) {
      const coveredItems = items.filter((i) => translatedPairs.has(`${i.id}:${lang}`)).length;
      const coveredCategories = categories.filter((c) =>
        translatedCategoryPairs.has(`${c.id}:${lang}`),
      ).length;
      itemCoverageSum += coverage(coveredItems);
      categoryCoverageSum += categories.length === 0 ? 0 : coveredCategories / categories.length;
      missingTranslations += itemsTotal - coveredItems;
    }
    const avgItemCoverage = itemCoverageSum / nonDefaultLanguages.length;
    const avgCategoryCoverage = categoryCoverageSum / nonDefaultLanguages.length;
    const combined = avgItemCoverage * 0.8 + avgCategoryCoverage * 0.2;
    languages = factor({
      id: 'languages',
      score: round1(WEIGHTS.languages * combined),
      maxScore: WEIGHTS.languages,
      done: Math.round(combined * 100),
      total: 100,
      noteKey: 'coverage-pct',
    });
  }

  // --- Accessibility (10) ------------------------------------------------------
  // Dietary info: any flag or allergen listed. Full marks at >=50% coverage.
  const withDietary = items.filter(
    (i) =>
      i.is_vegetarian ||
      i.is_vegan ||
      i.is_gluten_free ||
      i.is_spicy ||
      (i.allergens ?? []).length > 0,
  ).length;
  const accessibility = factor({
    id: 'accessibility',
    score: round1(WEIGHTS.accessibility * Math.min(1, coverage(withDietary) / 0.5)),
    maxScore: WEIGHTS.accessibility,
    done: withDietary,
    total: itemsTotal,
  });

  // --- Categories (10) ---------------------------------------------------------
  const catCount = categories.length;
  const catScore =
    catCount === 0 ? 0 : catCount <= 2 ? 5 : catCount <= 8 ? 10 : catCount <= 12 ? 7 : 5;
  const categoriesFactor = factor({
    id: 'categories',
    score: catScore,
    maxScore: WEIGHTS.categories,
    done: catCount,
    total: 8,
    noteKey: 'category-count',
  });

  // --- Pricing (10) ------------------------------------------------------------
  let pricing: HealthFactor;
  if (restaurant.hide_prices) {
    pricing = factor({
      id: 'pricing',
      score: WEIGHTS.pricing,
      maxScore: WEIGHTS.pricing,
      noteKey: 'prices-hidden',
    });
  } else {
    const withPrice = items.filter((i) => i.price != null).length;
    pricing = factor({
      id: 'pricing',
      score: round1(WEIGHTS.pricing * coverage(withPrice)),
      maxScore: WEIGHTS.pricing,
      done: withPrice,
      total: itemsTotal,
    });
  }

  // --- Popularity (10) ---------------------------------------------------------
  const popScore =
    views30d === 0 ? 2 : views30d < 20 ? 5 : views30d < 50 ? 7 : views30d < 150 ? 9 : 10;
  const popularity = factor({
    id: 'popularity',
    score: popScore,
    maxScore: WEIGHTS.popularity,
    done: views30d,
    noteKey: 'views-30d',
  });

  // --- SEO / presence (15) -----------------------------------------------------
  const seoParts: [boolean, number][] = [
    [restaurant.is_published, 6],
    [!!restaurant.logo_url, 3],
    [!!(restaurant.address || restaurant.phone), 3],
    [!!(restaurant.instagram_url || restaurant.website_url), 3],
  ];
  const seoDone = seoParts.filter(([ok]) => ok).length;
  const seo = factor({
    id: 'seo',
    score: seoParts.reduce((sum, [ok, pts]) => sum + (ok ? pts : 0), 0),
    maxScore: WEIGHTS.seo,
    done: seoDone,
    total: seoParts.length,
    noteKey: 'seo-essentials',
  });

  const factors: HealthFactor[] = [
    images,
    descriptions,
    languages,
    accessibility,
    categoriesFactor,
    pricing,
    popularity,
    seo,
  ];
  const score = Math.max(
    0,
    Math.min(100, Math.round(factors.reduce((sum, f) => sum + f.score, 0))),
  );

  return {
    score,
    factors,
    missingTranslations,
    itemsTotal,
    categoriesTotal: catCount,
  };
}
