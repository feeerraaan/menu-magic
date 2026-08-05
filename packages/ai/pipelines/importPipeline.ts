// Deterministic multi-step workflow: extract raw text from the source (text/pdf) ->
// menuImportAgent structures it -> translationAgent's translateMenuBatch translates the
// whole tree into every other supported language, one call per language. No DB writes here
// — the review screen (owner-confirmed) is what actually commits categories/items, via the
// same createCategory/createItem calls the rest of the app already uses.
//
// Word (.docx) and Excel (.xlsx) parsing, photo/image OCR, and website-URL scraping are NOT
// implemented — see docs/IMPLEMENTATION_PLAN.md's Phase 4 notes. Attempting those source
// types throws clearly.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import type { LLMProvider } from "../providers/types.ts";
import { extractMenuStructure } from "../agents/menuImportAgent.ts";
import { translateMenuBatch } from "../agents/translationAgent.ts";
import type {
  MenuImportResult,
  MenuImportSourceType,
  MenuImportTranslation,
} from "../schemas/menuImport.ts";

export interface ImportSource {
  sourceType: MenuImportSourceType;
  text?: string;
  fileBase64?: string;
}

const MAX_RAW_TEXT_LENGTH = 20_000;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function extractPdfText(fileBase64: string): Promise<string> {
  // unpdf is purpose-built for edge/serverless runtimes (Cloudflare Workers, Deno, Vercel
  // Edge) — no native bindings, unlike most Node PDF libraries. The Deno Edge path can't use
  // @firecrawl/pdf-inspector (native napi binary); the production Vercel path uses it in
  // api/ai-import-start.ts.
  const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.11.0");
  const bytes = base64ToUint8Array(fileBase64);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractRawText(source: ImportSource): Promise<string> {
  switch (source.sourceType) {
    case "text":
      return (source.text ?? "").trim();
    case "pdf": {
      if (!source.fileBase64) throw new Error("Falta el archivo PDF");
      const text = await extractPdfText(source.fileBase64);
      return text.slice(0, MAX_RAW_TEXT_LENGTH);
    }
    default:
      throw new Error(
        `Tipo de importación no soportado todavía: "${source.sourceType}". Por ahora solo se admite texto y PDF.`,
      );
  }
}

export async function runMenuImport(
  supabase: SupabaseClient,
  restaurantId: string,
  provider: LLMProvider,
  source: ImportSource,
): Promise<MenuImportResult> {
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("default_language, supported_languages")
    .eq("id", restaurantId)
    .maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) throw new Error("Restaurant not found");

  const rawText = await extractRawText(source);
  if (!rawText.trim()) {
    throw new Error("No se pudo extraer texto de la fuente proporcionada — comprueba que contiene el menú.");
  }
  const rawTextTrimmed = rawText.slice(0, MAX_RAW_TEXT_LENGTH);

  const defaultLanguage: string = restaurant.default_language ?? "es";
  const extracted = await extractMenuStructure(provider, rawTextTrimmed, defaultLanguage);

  const supportedLanguages: string[] = restaurant.supported_languages ?? [defaultLanguage];
  const extraLanguages = supportedLanguages.filter((lang) => lang !== defaultLanguage);

  const translationsByLanguage: Record<string, MenuImportTranslation> = {};
  for (const lang of extraLanguages) {
    const translated = await translateMenuBatch(provider, extracted, defaultLanguage, lang);
    translationsByLanguage[lang] = translated;
  }

  return { ...extracted, translationsByLanguage };
}
