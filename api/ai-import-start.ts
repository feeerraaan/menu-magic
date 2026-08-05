import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { z } from 'zod';

// This is the Vercel/Node backend for long menu imports. It keeps the same HTTP contract and
// ai_jobs/ai_usage persistence as the Supabase Edge Function, so the frontend can switch
// between backends without changing the review flow.
//
// The import itself is executed one step at a time by api/ai-import-step.ts, driven by the
// frontend: this endpoint only validates the request, checks the plan credits, and creates the
// job row with the raw source stored in ai_jobs.input for the steps to consume. Each step is a
// single short LLM call, so a menu of any length can be imported without ever hitting Vercel's
// 300s per-function cap (and with no self-invocation, so no 508).

export const config = { maxDuration: 300 };

export const OPENCODE_URL = 'https://opencode.ai/zen/v1/chat/completions';
export const MAX_RAW_TEXT_LENGTH = 20_000;
export const CHUNK_SIZE = 2_500;
export const CHUNK_OVERLAP = 350;
export const MODEL_MAX_TOKENS = 4_500;

// Candidate endpoints, tried in order. The paid gateway (AI_IMPORT_GO_*) mirrors mindmap's
// "go" provider: fast deepseek-v4-flash when it's available on the account (it needs an
// explicit region opt-in on the OpenCode workspace). If it errors (e.g. 403 RegionError /
// 401 balance), the call falls through to the free Zen models.
const GO_BASE_URL = (process.env.AI_IMPORT_GO_BASE_URL ?? '').replace(/\/+$/, '');
const GO_KEY = process.env.AI_IMPORT_GO_KEY ?? '';
const GO_MODEL = process.env.AI_IMPORT_GO_MODEL ?? 'deepseek-v4-flash';
const GO_FALLBACK_MODEL = process.env.AI_IMPORT_GO_FALLBACK_MODEL ?? 'deepseek-v4-pro';
const ZEN_MODEL = process.env.AI_MODEL_MENU_IMPORT ?? 'deepseek-v4-flash-free';
const ZEN_FALLBACK_MODEL = 'mimo-v2.5-free';
const ZEN_KEYS = (process.env.OPENCODE_ZEN_API_KEYS ?? '').split(',').map((key) => key.trim()).filter(Boolean);
// A single call retries internally via schema-repair (same-model corrective turns),
// mirroring mindmap's withSchemaRepair.
const REPAIR_MAX_RETRIES = 2;

export interface Endpoint {
  url: string;
  key: string;
  model: string;
}

export function buildEndpoints(): Endpoint[] {
  const endpoints: Endpoint[] = [];
  if (GO_BASE_URL && GO_KEY) {
    endpoints.push({ url: `${GO_BASE_URL}/chat/completions`, key: GO_KEY, model: GO_MODEL });
    if (GO_FALLBACK_MODEL !== GO_MODEL) {
      endpoints.push({ url: `${GO_BASE_URL}/chat/completions`, key: GO_KEY, model: GO_FALLBACK_MODEL });
    }
  }
  for (const key of ZEN_KEYS) endpoints.push({ url: OPENCODE_URL, key, model: ZEN_MODEL });
  for (const key of ZEN_KEYS) endpoints.push({ url: OPENCODE_URL, key, model: ZEN_FALLBACK_MODEL });
  const seen = new Set<string>();
  return endpoints.filter((endpoint) => {
    const key = `${endpoint.url}|${endpoint.key}|${endpoint.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  endpoint: Endpoint,
  system: string,
  userContent: string,
  schema: z.ZodType<T>,
  inactivityMs: number,
  hardMs: number,
  deadline?: number,
): Promise<T> {
  if (!endpoint?.url || !endpoint?.key) throw new Error('Falta configurar la clave de IA del importador');
  const { url, key, model } = endpoint;
  const deadlineRemaining = (): number => (deadline ? Math.max(0, deadline - Date.now()) : Number.POSITIVE_INFINITY);
  let lastError: Error | null = null;
  let previousRaw: string | null = null;
  let previousError: string | null = null;
  for (let repair = 0; repair <= REPAIR_MAX_RETRIES; repair++) {
    const controller = new AbortController();
    let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
    const hardTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
      timeoutReason = 'hard';
      controller.abort();
    }, Math.min(hardMs, deadlineRemaining()));
    let timeoutReason: 'inactivity' | 'hard' | null = null;
    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        timeoutReason = 'inactivity';
        controller.abort();
      }, Math.min(inactivityMs, deadlineRemaining()));
    };
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ];
      if (previousRaw && previousError) {
        messages.push({ role: 'assistant', content: previousRaw });
        messages.push({
          role: 'user',
          content: `Tu respuesta anterior no era JSON válido o no cumplía el esquema requerido. Error: ${previousError}. Devuelve EXCLUSIVAMENTE el JSON corregido con la forma exacta indicada en el prompt del sistema. Sin texto adicional, sin markdown.`,
        });
      }
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: MODEL_MAX_TOKENS,
          stream: true,
          thinking: { type: 'disabled' },
        }),
        signal: controller.signal,
      });
      // Auth / billing / region / rate-limit errors are endpoint-level: a repair turn will
      // not fix them, so fail this endpoint and let withFallback try the next one.
      if (upstream.status === 401 || upstream.status === 402 || upstream.status === 403 || upstream.status === 429) {
        lastError = new Error(`OpenCode ${model} rechazó la petición (status ${upstream.status})`);
        break;
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
      try {
        return schema.parse(jsonFromText(content));
      } catch (parseError) {
        // Schema-repair retry (same pattern as mindmap's withSchemaRepair): feed the raw
        // output plus the validation error back so the model can fix the JSON before we
        // give up on this endpoint.
        previousRaw = content;
        previousError = parseError instanceof Error ? parseError.message : String(parseError);
        lastError = parseError instanceof Error ? parseError : new Error(String(parseError));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = deadline && Date.now() >= deadline
          ? new Error('Se agotó el tiempo máximo de ejecución de la importación (el plan Hobby de Vercel limita cada función a 300 segundos). Intenta con un menú más corto o reparte la importación.')
          : new Error(`OpenCode ${model} sin respuesta (${timeoutReason === 'hard' ? Math.min(hardMs, deadlineRemaining()) : inactivityMs}ms)`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      break;
    } finally {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (hardTimer) clearTimeout(hardTimer);
    }
  }
  throw lastError ?? new Error(`OpenCode ${model} no pudo procesar la petición`);
}

export async function withFallback<T>(
  operation: (endpoint: Endpoint, inactivity: number, hard: number, deadline?: number) => Promise<T>,
  deadline?: number,
): Promise<T> {
  const endpoints = buildEndpoints();
  if (endpoints.length === 0) {
    throw new Error('Falta configurar las claves de IA del importador (OPENCODE_ZEN_API_KEYS o AI_IMPORT_GO_KEY)');
  }
  const failures: string[] = [];
  for (const endpoint of endpoints) {
    try {
      return await operation(endpoint, 90_000, 240_000, deadline);
    } catch (error) {
      failures.push(`${endpoint.model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`OpenCode falló en todos los modelos: ${failures.join(' | ')}`);
}

// Extracts text/markdown from a PDF. Primary extractor is @firecrawl/pdf-inspector — a native
// (napi-rs) Rust parser with prebuilt binaries for the Vercel Linux x64/arm64 glibc runtime,
// giving layout-aware markdown (reading order, headings by font size, tables) that beats the
// pdf.js-based unpdf for restaurant menus. If the native module can't load on a given platform,
// it falls back to unpdf (pure JS). Scanned/image PDFs have no text layer and are rejected with
// a clear message rather than feeding garbage to the LLM.
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let looksScanned = false;
  try {
    const pdfInspector = await import('@firecrawl/pdf-inspector');
    const result = pdfInspector.processPdf(bytes as unknown as Buffer);
    const markdown = (result.markdown ?? '').trim();
    if (markdown) return markdown;
    looksScanned = result.pdfType === 'Scanned' || result.pdfType === 'ImageBased';
  } catch {
    // Native module unavailable (e.g. dev machine without a prebuilt binding): fall through.
  }
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  if (!text.trim() && looksScanned) {
    throw new Error('El PDF parece estar escaneado (imágenes sin texto digital). Aún no se pueden importar PDF escaneados.');
  }
  return text;
}

export async function sourceText(body: Record<string, unknown>): Promise<string> {
  if (body.sourceType === 'text') return String(body.text ?? '').trim().slice(0, MAX_RAW_TEXT_LENGTH);
  if (body.sourceType === 'pdf') {
    const encoded = String(body.fileBase64 ?? '');
    if (!encoded) throw new Error('Falta el archivo PDF');
    const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'));
    const text = await extractPdfText(bytes);
    return text.slice(0, MAX_RAW_TEXT_LENGTH);
  }
  throw new Error('Tipo de importación no soportado');
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
    if (!restaurantId || !['text', 'pdf'].includes(String(body.sourceType))) {
      return res.status(400).json({ error: 'restaurantId y un sourceType válido son obligatorios' });
    }
    const { data: restaurant } = await supabase.from('restaurants').select('id')
      .eq('id', restaurantId).eq('owner_id', userData.user.id).maybeSingle();
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const { data: subscription } = await supabase.from('subscriptions').select('plan').eq('restaurant_id', restaurantId).maybeSingle();
    const limits: Record<string, number> = { free: 50, pro_monthly: 150, pro_annual: 250, lifetime: 500 };
    const { data: used, error: usedError } = await supabase.rpc('get_ai_credits_used_this_period', { _restaurant_id: restaurantId });
    if (usedError) throw usedError;
    const limit = limits[String(subscription?.plan ?? 'free')] ?? 100;
    if (Number(used ?? 0) + 15 > limit) return res.status(402).json({ error: 'AI credit limit reached for this plan' });
    const jobType = body.jobType === 'ai_setup' ? 'ai_setup' : 'menu_import';
    const jobInput = {
      sourceType: body.sourceType,
      fileName: body.fileName ?? null,
      progressStage: 'Preparando la importación',
      phase: 'prepare',
      source: {
        sourceType: body.sourceType,
        text: body.text,
        fileBase64: body.fileBase64,
      },
    };
    const { data: job, error: jobError } = await supabase.from('ai_jobs').insert({
      restaurant_id: restaurantId, created_by: userData.user.id, job_type: jobType,
      status: 'processing', input: jobInput, progress: 3, started_at: new Date().toISOString(),
    }).select('id').single();
    if (jobError) throw jobError;
    // The actual work happens step by step in /api/ai-import-step, driven by the frontend,
    // so each invocation is short and there is no platform duration limit on the whole import.
    return res.status(200).json({ jobId: job.id, status: 'processing' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
