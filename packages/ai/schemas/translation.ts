// Frontend-safe. Plain TypeScript types only.

export interface TranslateFieldInput {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  restaurantId: string;
  context?: string; // e.g. "dish name", "category description" — calibrates the prompt
}

export interface TranslateFieldResult {
  translatedText: string;
}
