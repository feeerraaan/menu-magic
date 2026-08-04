import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import { extractText, getDocumentProxy } from 'unpdf';
import { z } from 'zod';
import type { Database } from '../src/integrations/supabase/types.js';

// This is the Vercel/Node backend for long menu imports. It intentionally keeps the same
// HTTP contract and ai_jobs/ai_usage persistence as the Supabase Edge Function, so the
// frontend can switch between backends without changing the review flow.

export const config = { maxDuration: 300 };

export const OPENCODE_URL = 'https://opencode.ai/zen/v1/chat/completions';
export const MAX_RAW_TEXT_LENGTH = 20_000;
export const CHUNK_SIZE = 6_000;
export const CHUNK_OVERLAP = 600;
export const MODEL_MAX_TOKENS = 4_500;
const PRIMARY_MODEL = process.env.AI_MODEL_MENU_IMPORT ?? 'ling-3.0-flash-free';
const MODELS = [PRIMARY_MODEL, 'deepseek-v4-flash-free'].filter((model, index, all) => all.indexOf(model) === index);
const KEYS = (process.env.OPENCODE_ZEN_API_KEYS ?? '').split(',').map((key) => key.trim()).filter(Boolean);
const ATTEMPTS_PER_MODEL = 2;

// Single-invocation budget: the Vercel Hobby plan caps a function (including its
// waitUntil background work) at 300s. Reserve a margin so the whole import runs in one
// call and fails cleanly with a message if a huge menu would hit the platform timeout,
// instead of being silently killed mid-run.
export const TOTAL_BUDGET_MS = 270_000;

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  isVegetarian: z.boolean().optional().default(false),
  isVegan: z.boolean().optional().default(false),
  isSpicy: z.boolean().optional().default(false),
  isGlutenFree: z.boolean().optional().default(false),
  allergens: z.array(z.string()).optional().default([]),
});

const categorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  items: z.array(itemSchema).max(300),
});

export const extractionSchema = z.object({
  menuName: z.string().min(1).max(200),
  categories: z.array(categorySchema).max(60),
});

export const translationSchema = z.object({
  menuName: z.string().min(1).max(200),
  categories: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(500).nullable().optional(),
    items: z.array(z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).nullable().optional(),
    })),
  })),
});

export type Extraction = z.infer<typeof extractionSchema>;
type ServerSupabase = SupabaseClient<Database>;
type ProgressReporter = (progress: number, stage: string) => Promise<void>;

// Keep these pure prompt builders local to the Vercel function. Vercel's Node builder compiles
// api/*.ts but does not bundle TypeScript modules imported from the packages/ tree; leaving these
// imports external makes the deployed function fail at startup with ERR_MODULE_NOT_FOUND.
type ApiMessage = { role: 'user'; content: string };

const EXTRACTION_RESPONSE_SHAPE = [
  '{"menuName": string, "categories": [',
  '{"name": string, "description": string|null, "items": [',
  '{"name": string, "description": string|null, "price": number|null,',
  '"isVegetarian"?: boolean, "isVegan"?: boolean, "isSpicy"?: boolean, "isGlutenFree"?: boolean,',
  '"allergens"?: string[]}',
  ']}',
  ']}'
].join(' ');

export function buildExtractionPrompt(
  rawText: string,
  locale: string,
  options?: { fragment?: boolean },
): { system: string; messages: ApiMessage[] } {
  const system = [
    'Eres un asistente experto en digitalizar menús de restaurante a partir de texto extraído de un documento, imagen o página web.',
    'Extrae ÚNICAMENTE lo que esté realmente presente en el texto — nunca inventes platos, precios o categorías que no aparezcan.',
    'Agrupa los platos en categorías razonables si el texto no las marca explícitamente (ej: Entrantes, Principales, Postres, Bebidas).',
    'El precio debe ser un número (sin símbolo de moneda) o null si no aparece o es ilegible.',
    'Sé CONSERVADOR con las etiquetas dietéticas (vegetariano/vegano/picante/sin gluten): solo márcalas true si el texto lo indica explícitamente o es evidente sin ambigüedad; en caso de duda, usa false.',
    'Para mantener la respuesta compacta, omite las etiquetas que sean false y omite allergens si no hay alérgenos explícitos; la aplicación completa los valores por defecto.',
    `El idioma del texto original y de tu respuesta debe ser el de código "${locale}" (no traduzcas).`,
    ...(options?.fragment
      ? ['Este es un fragmento de un menú más largo: devuelve únicamente las categorías y platos que aparecen en este fragmento, sin inventar ni completar las partes que no ves.']
      : []),
    `Responde EXCLUSIVAMENTE con un objeto JSON válido con esta forma exacta: ${EXTRACTION_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].join(' ');
  return { system, messages: [{ role: 'user', content: rawText }] };
}

type MenuBatchTranslationInput = {
  menuName: string;
  categories: Array<{
    name: string;
    description?: string | null;
    items: Array<{ name: string; description?: string | null }>;
  }>;
};

const TRANSLATION_RESPONSE_SHAPE = [
  '{"menuName": string, "categories": [',
  '{"name": string, "description": string|null, "items": [{"name": string, "description": string|null}]}',
  ']}'
].join(' ');

export function buildMenuBatchTranslationPrompt(
  input: MenuBatchTranslationInput,
  sourceLocale: string,
  targetLocale: string,
): { system: string; messages: ApiMessage[] } {
  const system = [
    'Eres un traductor experto especializado en menús de restaurantes.',
    'Traduces contenido gastronómico preservando el significado culinario real — nunca traduces palabra por palabra.',
    'Si un plato tiene un nombre local o tradicional sin equivalente directo, consérvalo y añade una breve explicación entre paréntesis en el idioma de destino.',
    `Traduce TODO el árbol de menú (nombre del menú, cada categoría y cada plato) del idioma "${sourceLocale}" al idioma "${targetLocale}".`,
    'Devuelve EXACTAMENTE la misma estructura y el mismo número de categorías y platos, en el mismo orden — solo traduces los textos, nunca añades, quitas o reordenas elementos.',
    `Responde EXCLUSIVAMENTE con un objeto JSON válido con esta forma exacta: ${TRANSLATION_RESPONSE_SHAPE}. Sin texto adicional, sin markdown.`,
  ].join(' ');
  return { system, messages: [{ role: 'user', content: JSON.stringify(input) }] };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ensureBudget(deadline: number | undefined, stage: string): void {
  if (deadline && Date.now() > deadline) {
    throw new Error(
      `El menú es demasiado largo para importarlo en una sola llamada y se agotó el tiempo disponible (${stage}). ` +
      'Prueba a importar un texto más corto o reparte el menú en varias importaciones.',
    );
  }
}

function menuKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export function splitText(raw: string): string[] {
  const text = raw.trim();
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const targetEnd = Math.min(start + CHUNK_SIZE, text.length);
    let end = targetEnd;
    if (targetEnd < text.length) {
      const lineBreak = text.lastIndexOf('\n', targetEnd);
      if (lineBreak > start + Math.floor(CHUNK_SIZE * 0.55)) end = lineBreak;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    const overlapStart = Math.max(start + 1, end - CHUNK_OVERLAP);
    const overlapLineBreak = text.lastIndexOf('\n', overlapStart);
    start = overlapLineBreak >= start ? overlapLineBreak + 1 : overlapStart;
  }
  return chunks;
}

export function mergeExtractions(extractions: Extraction[]): Extraction {
  const categories: Extraction['categories'] = [];
  const categoryIndexes = new Map<string, number>();
  for (const extraction of extractions) {
    for (const category of extraction.categories) {
      const key = menuKey(category.name);
      let categoryIndex = categoryIndexes.get(key);
      if (categoryIndex === undefined) {
        categoryIndex = categories.length;
        categoryIndexes.set(key, categoryIndex);
        categories.push({ ...category, items: [] });
      }
      const target = categories[categoryIndex];
      if (!target.description && category.description) target.description = category.description;
      const itemIndexes = new Map(target.items.map((item, index) => [menuKey(item.name), index]));
      for (const item of category.items) {
        const itemKey = menuKey(item.name);
        const existingIndex = itemIndexes.get(itemKey);
        if (existingIndex === undefined) {
          itemIndexes.set(itemKey, target.items.length);
          target.items.push(item);
        } else {
          const existing = target.items[existingIndex];
          target.items[existingIndex] = {
            ...existing,
            description: existing.description || item.description,
            price: existing.price ?? item.price,
            isVegetarian: existing.isVegetarian || item.isVegetarian,
            isVegan: existing.isVegan || item.isVegan,
            isSpicy: existing.isSpicy || item.isSpicy,
            isGlutenFree: existing.isGlutenFree || item.isGlutenFree,
            allergens: existing.allergens?.length ? existing.allergens : item.allergens,
          };
        }
      }
    }
  }
  return { menuName: extractions.find((item) => item.menuName.trim())?.menuName ?? 'Mi menú', categories };
}

function jsonFromText(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const candidate = extractJsonObject(cleaned);
  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(repairTruncatedJson(candidate));
    } catch {
      throw new Error('El modelo no devolvió un objeto JSON completo');
    }
  }
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{');
  if (start === -1) return raw.trim();
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index++) {
    const character = raw[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) return raw.slice(start, index + 1);
  }
  return raw.slice(start);
}

function repairTruncatedJson(raw: string): string {
  const stack: string[] = [];
  let repaired = '';
  let inString = false;
  let escaped = false;
  for (const character of raw) {
    if (inString) {
      repaired += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      repaired += character;
    } else if (character === '{') {
      stack.push('}');
      repaired += character;
    } else if (character === '[') {
      stack.push(']');
      repaired += character;
    } else if (character === '}' || character === ']') {
      if (stack[stack.length - 1] === character) stack.pop();
      repaired += character;
    } else {
      repaired += character;
    }
  }
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, '');
  while (stack.length > 0) repaired += stack.pop();
  return repaired;
}

export async function callStructured<T>(
  model: string,
  system: string,
  userContent: string,
  schema: z.ZodType<T>,
  inactivityMs: number,
  hardMs: number,
): Promise<T> {
  if (!KEYS.length) throw new Error('Falta configurar OPENCODE_ZEN_API_KEYS en Vercel');
  let lastError: Error | null = null;
  for (const key of KEYS) {
    const controller = new AbortController();
    let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
    const hardTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
      timeoutReason = 'hard';
      controller.abort();
    }, hardMs);
    let timeoutReason: 'inactivity' | 'hard' | null = null;
    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        timeoutReason = 'inactivity';
        controller.abort();
      }, inactivityMs);
    };
    try {
      const upstream = await fetch(OPENCODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
          temperature: 0.2,
          max_tokens: MODEL_MAX_TOKENS,
          stream: true,
          thinking: { type: 'disabled' },
        }),
        signal: controller.signal,
      });
      if (upstream.status === 402 || upstream.status === 429) {
        lastError = new Error(`OpenCode ${model} rechazó la clave (status ${upstream.status})`);
        continue;
      }
      if (!upstream.ok) throw new Error(`OpenCode ${model} respondió ${upstream.status}: ${await upstream.text()}`);
      if (!upstream.body) throw new Error(`OpenCode ${model} devolvió una respuesta vacía`);

      resetInactivity();
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let sawSse = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetInactivity();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          sawSse = true;
          const event = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }> };
          const choice = event.choices?.[0];
          content += choice?.delta?.content ?? choice?.message?.content ?? '';
        }
      }
      buffer += decoder.decode();
      if (buffer.trim().startsWith('data:')) {
        const data = buffer.trim().slice(5).trim();
        if (data && data !== '[DONE]') {
          const event = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }> };
          content += event.choices?.[0]?.delta?.content ?? event.choices?.[0]?.message?.content ?? '';
          sawSse = true;
        }
      } else if (!sawSse && buffer.trim()) {
        const parsed = JSON.parse(buffer) as { choices?: Array<{ message?: { content?: string } }> };
        content = parsed.choices?.[0]?.message?.content ?? '';
      }
      return schema.parse(jsonFromText(content));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`OpenCode ${model} sin respuesta (${timeoutReason === 'hard' ? hardMs : inactivityMs}ms)`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    } finally {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (hardTimer) clearTimeout(hardTimer);
    }
  }
  throw lastError ?? new Error(`OpenCode ${model} no pudo procesar la petición`);
}

export async function withFallback<T>(operation: (model: string, inactivity: number, hard: number) => Promise<T>): Promise<T> {
  const failures: string[] = [];
  const limits = [[60_000, 120_000], [45_000, 90_000]] as const;
  for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
    for (let index = 0; index < MODELS.length; index++) {
      try {
        const [inactivity, hard] = limits[Math.min(index, limits.length - 1)];
        return await operation(MODELS[index], inactivity, hard);
      } catch (error) {
        failures.push(`${MODELS[index]}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  throw new Error(`OpenCode Zen falló en todos los modelos: ${failures.join(' | ')}`);
}

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

export async function sourceText(body: Record<string, unknown>): Promise<string> {
  if (body.sourceType === 'text') return String(body.text ?? '').trim().slice(0, MAX_RAW_TEXT_LENGTH);
  if (body.sourceType === 'url') {
    const url = String(body.url ?? '');
    if (!url) throw new Error('Falta la URL');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo descargar la URL (status ${res.status})`);
    return stripHtml(await res.text()).slice(0, MAX_RAW_TEXT_LENGTH);
  }
  if (body.sourceType === 'pdf') {
    const encoded = String(body.fileBase64 ?? '');
    if (!encoded) throw new Error('Falta el archivo PDF');
    const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'));
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text.slice(0, MAX_RAW_TEXT_LENGTH);
  }
  throw new Error('Tipo de importación no soportado');
}

async function runImport(
  supabase: ServerSupabase,
  restaurantId: string,
  body: Record<string, unknown>,
  reportProgress?: ProgressReporter,
  deadline?: number,
) {
  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants')
    .select('default_language, supported_languages').eq('id', restaurantId).maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) throw new Error('Restaurante no encontrado');
  const raw = await sourceText(body);
  if (!raw) throw new Error('No se pudo extraer texto del menú');
  const chunks = splitText(raw);
  await reportProgress?.(8, `Texto preparado · ${chunks.length} bloques por analizar`);
  const extractions: Extraction[] = [];
  for (const [index, chunk] of chunks.entries()) {
    ensureBudget(deadline, `analizando el bloque ${index + 1} de ${chunks.length}`);
    const locale = String(restaurant.default_language ?? 'es');
    await reportProgress?.(
      10 + Math.round((index / chunks.length) * 52),
      `Analizando bloque ${index + 1} de ${chunks.length}`,
    );
    const prompt = buildExtractionPrompt(chunk, locale, { fragment: chunks.length > 1 });
    extractions.push(await withFallback((model, inactivity, hard) => callStructured(
      model, prompt.system, chunk, extractionSchema, inactivity, hard,
    )));
    await reportProgress?.(
      10 + Math.round(((index + 1) / chunks.length) * 52),
      `Bloque ${index + 1} de ${chunks.length} analizado`,
    );
  }
  const extracted = mergeExtractions(extractions);
  const defaultLanguage = String(restaurant.default_language ?? 'es');
  const languages = Array.isArray(restaurant.supported_languages) ? restaurant.supported_languages : [defaultLanguage];
  const extraLanguages = languages.filter((value: unknown) => value !== defaultLanguage);
  const translationsByLanguage: Record<string, unknown> = {};
  await reportProgress?.(65, extraLanguages.length ? 'Preparando traducciones' : 'Extracción completada');
  for (const [index, language] of extraLanguages.entries()) {
    ensureBudget(deadline, `traduciendo al idioma ${String(language)}`);
    const translationInput = {
      menuName: extracted.menuName,
      categories: extracted.categories.map((category) => ({
        name: category.name,
        description: category.description ?? null,
        items: category.items.map((item) => ({ name: item.name, description: item.description ?? null })),
      })),
    };
    const prompt = buildMenuBatchTranslationPrompt(translationInput, defaultLanguage, String(language));
    await reportProgress?.(
      65 + Math.round((index / extraLanguages.length) * 30),
      `Traduciendo al idioma ${String(language)}`,
    );
    translationsByLanguage[String(language)] = await withFallback((model, inactivity, hard) => callStructured(
      model, prompt.system, JSON.stringify(extracted), translationSchema, inactivity, hard,
    ));
    await reportProgress?.(
      65 + Math.round(((index + 1) / extraLanguages.length) * 30),
      `Traducción al idioma ${String(language)} completada`,
    );
  }
  await reportProgress?.(97, 'Preparando el resultado para revisión');
  return { ...extracted, translationsByLanguage };
}

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): void;
}

// Runs the whole import pipeline inside a single invocation's background work (waitUntil).
// There is deliberately no self-enqueueing: the previous design chained worker invocations by
// POSTing back to /api/ai-import-worker, which Vercel's loop protection kills with a 508
// (INFINITE_LOOP_DETECTED) mid-run. Progress still reaches the frontend live because every
// step writes to ai_jobs, which the client follows via Realtime + polling.
async function runImportAndFinish(
  supabase: ServerSupabase,
  jobId: string,
  restaurantId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const jobInfo = { sourceType: body.sourceType, fileName: body.fileName ?? null };
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  try {
    const reportProgress = async (progress: number, progressStage: string): Promise<void> => {
      await supabase.from('ai_jobs').update({
        progress,
        input: { ...jobInfo, progressStage } as unknown as Database['public']['Tables']['ai_jobs']['Row']['input'],
      }).eq('id', jobId);
    };
    const result = await runImport(supabase, restaurantId, body, reportProgress, deadline);
    await supabase.from('ai_usage').insert({
      restaurant_id: restaurantId,
      kind: 'import',
      credits_charged: 15,
      ai_job_id: jobId,
      metadata: { sourceType: body.sourceType, backend: 'vercel' },
    });
    await supabase.from('ai_jobs').update({
      status: 'completed',
      output: result as unknown as Database['public']['Tables']['ai_jobs']['Row']['output'],
      progress: 100,
      ai_credits_charged: 15,
      input: { ...jobInfo, progressStage: 'Importación completada' } as unknown as Database['public']['Tables']['ai_jobs']['Row']['input'],
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ai-import-start] failed', message);
    await supabase.from('ai_jobs').update({
      status: 'failed',
      error: message,
      input: { progressStage: 'La importación ha fallado' } as unknown as Database['public']['Tables']['ai_jobs']['Row']['input'],
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel' });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  try {
    const authorization = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const token = String(authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return res.status(401).json({ error: 'Invalid session' });
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
    const restaurantId = String(body.restaurantId ?? '');
    if (!restaurantId || !['text', 'url', 'pdf'].includes(String(body.sourceType))) {
      return res.status(400).json({ error: 'restaurantId y un sourceType válido son obligatorios' });
    }
    const { data: restaurant } = await supabase.from('restaurants').select('id')
      .eq('id', restaurantId).eq('owner_id', userData.user.id).maybeSingle();
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const { data: subscription } = await supabase.from('subscriptions').select('plan').eq('restaurant_id', restaurantId).maybeSingle();
    const limits: Record<string, number> = { free: 100, pro_monthly: 300, pro_annual: 500, lifetime: 1000 };
    const { data: used, error: usedError } = await supabase.rpc('get_ai_credits_used_this_period', { _restaurant_id: restaurantId });
    if (usedError) throw usedError;
    const limit = limits[String(subscription?.plan ?? 'free')] ?? 100;
    if (Number(used ?? 0) + 15 > limit) return res.status(402).json({ error: 'AI credit limit reached for this plan' });
    const jobType = body.jobType === 'ai_setup' ? 'ai_setup' : 'menu_import';
    const jobInput = {
      sourceType: body.sourceType,
      fileName: body.fileName ?? null,
      progressStage: 'Preparando la importación',
    };
    const { data: job, error: jobError } = await supabase.from('ai_jobs').insert({
      restaurant_id: restaurantId, created_by: userData.user.id, job_type: jobType,
      status: 'processing', input: jobInput, progress: 3, started_at: new Date().toISOString(),
    }).select('id').single();
    if (jobError) throw jobError;
    waitUntil(runImportAndFinish(supabase, job.id, restaurantId, body));
    return res.status(200).json({ jobId: job.id, status: 'processing' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
