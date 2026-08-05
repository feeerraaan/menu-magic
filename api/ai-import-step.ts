import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types.js';
import {
  buildExtractionPrompt,
  buildMenuBatchTranslationPrompt,
  callStructured,
  extractionSchema,
  mergeExtractions,
  sourceText,
  splitText,
  translationSchema,
  withFallback,
  type Extraction,
} from './ai-import-start.js';

export const config = { maxDuration: 300 };

// One step per invocation, driven by the frontend (api/ai-import-start.ts only creates the
// job). Each step is a single short LLM call, so a menu of any length can be imported across
// as many invocations as it needs without ever hitting Vercel's 300s per-function cap. State
// lives in ai_jobs.input between steps. There is deliberately no self-invocation, so Vercel's
// loop protection (508) can never kill the chain. A per-step deadline still aborts a stalled
// model call just under the platform limit so the job fails cleanly instead of hanging.
const STEP_BUDGET_MS = 280_000;

type JobInput = {
  sourceType?: string;
  fileName?: string | null;
  phase?: 'prepare' | 'extract' | 'translate';
  source?: Record<string, unknown>;
  chunks?: string[];
  chunkIndex?: number;
  extractions?: Extraction[];
  extracted?: Extraction;
  translationsByLanguage?: Record<string, unknown>;
  languageIndex?: number;
  progressStage?: string;
};

type StepJob = {
  id: string;
  restaurant_id: string;
  created_by: string;
  status: string;
  input: JobInput;
};

type StepSupabase = SupabaseClient<Database>;
type JobRow = Database['public']['Tables']['ai_jobs']['Row'];

async function saveState(
  supabase: StepSupabase,
  jobId: string,
  input: JobInput,
  progress: number,
): Promise<JobRow> {
  const { data, error } = await supabase.from('ai_jobs')
    .update({
      progress,
      input: input as unknown as JobRow['input'],
    })
    .eq('id', jobId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function finishJob(
  supabase: StepSupabase,
  job: StepJob,
  input: JobInput,
  extracted: Extraction,
  translationsByLanguage: Record<string, unknown>,
): Promise<JobRow> {
  await supabase.from('ai_usage').insert({
    restaurant_id: job.restaurant_id,
    kind: 'import',
    credits_charged: 15,
    ai_job_id: job.id,
    metadata: { sourceType: input.sourceType, backend: 'vercel-steps' },
  });
  const { data, error } = await supabase.from('ai_jobs')
    .update({
      status: 'completed',
      output: { ...extracted, translationsByLanguage } as unknown as JobRow['output'],
      progress: 100,
      ai_credits_charged: 15,
      input: { ...input, progressStage: 'Importación completada' } as unknown as JobRow['input'],
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function markFailed(supabase: StepSupabase, jobId: string, message: string): Promise<void> {
  await supabase.from('ai_jobs').update({
    status: 'failed',
    error: message,
    input: { progressStage: 'La importación ha fallado' } as unknown as JobRow['input'],
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}

function restaurantLanguages(restaurant: { default_language: string | null; supported_languages: unknown }): {
  defaultLanguage: string;
  extraLanguages: string[];
} {
  const defaultLanguage = String(restaurant.default_language ?? 'es');
  const languages = Array.isArray(restaurant.supported_languages)
    ? restaurant.supported_languages.map(String)
    : [defaultLanguage];
  return { defaultLanguage, extraLanguages: languages.filter((language) => language !== defaultLanguage) };
}

async function runStep(supabase: StepSupabase, job: StepJob, deadline: number): Promise<JobRow> {
  const input: JobInput = job.input ?? {};

  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants')
    .select('default_language, supported_languages')
    .eq('id', job.restaurant_id)
    .maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) throw new Error('Restaurante no encontrado');

  // ---- PREPARE: extract raw text once and split it into chunks ----
  if ((input.phase ?? 'prepare') === 'prepare') {
    if (!input.source) throw new Error('Falta la fuente original de la importación');
    const raw = await sourceText(input.source);
    if (!raw) throw new Error('No se pudo extraer texto del menú');
    const chunks = splitText(raw);
    const next: JobInput = { ...input, phase: 'extract', chunks, chunkIndex: 0, extractions: [] };
    delete next.source;
    next.progressStage = `Texto preparado · ${chunks.length} bloques por analizar`;
    return saveState(supabase, job.id, next, 8);
  }

  // ---- EXTRACT: one chunk per step ----
  if (input.phase === 'extract') {
    const chunks = input.chunks ?? [];
    const index = input.chunkIndex ?? 0;
    if (index < chunks.length) {
      const locale = String(restaurant.default_language ?? 'es');
      await saveState(
        supabase,
        job.id,
        { ...input, progressStage: `Analizando bloque ${index + 1} de ${chunks.length}` },
        10 + Math.round((index / chunks.length) * 52),
      );
      const prompt = buildExtractionPrompt(chunks[index], locale, { fragment: chunks.length > 1 });
      const extraction = await withFallback(
        (endpoint, inactivity, hard, callDeadline) => callStructured(
          endpoint, prompt.system, chunks[index], extractionSchema, inactivity, hard, callDeadline,
        ),
        deadline,
      );
      const extractions = [...(input.extractions ?? []), extraction];
      const nextIndex = index + 1;
      const next: JobInput = { ...input, chunkIndex: nextIndex, extractions };
      if (nextIndex < chunks.length) {
        next.progressStage = `Bloque ${nextIndex} de ${chunks.length} analizado`;
        return saveState(supabase, job.id, next, 10 + Math.round((nextIndex / chunks.length) * 52));
      }
      const extracted = mergeExtractions(extractions);
      const { extraLanguages } = restaurantLanguages(restaurant);
      if (extraLanguages.length === 0) {
        return finishJob(supabase, job, input, extracted, {});
      }
      const nextPhase: JobInput = {
        ...input,
        phase: 'translate',
        extracted,
        translationsByLanguage: {},
        languageIndex: 0,
        progressStage: 'Preparando traducciones',
      };
      return saveState(supabase, job.id, nextPhase, 65);
    }
  }

  // ---- TRANSLATE: one language per step ----
  if (input.phase === 'translate') {
    const extracted = input.extracted;
    if (!extracted) throw new Error('Falta el menú extraído antes de traducir');
    const { defaultLanguage, extraLanguages } = restaurantLanguages(restaurant);
    const index = input.languageIndex ?? 0;
    const language = extraLanguages[index];
    if (!language) {
      return finishJob(supabase, job, input, extracted, input.translationsByLanguage ?? {});
    }
    const translationInput = {
      menuName: extracted.menuName,
      categories: extracted.categories.map((category) => ({
        name: category.name,
        description: category.description ?? null,
        items: category.items.map((item) => ({ name: item.name, description: item.description ?? null })),
      })),
    };
    await saveState(
      supabase,
      job.id,
      { ...input, progressStage: `Traduciendo al idioma ${language}` },
      65 + Math.round((index / extraLanguages.length) * 30),
    );
    const prompt = buildMenuBatchTranslationPrompt(translationInput, defaultLanguage, language);
    const translated = await withFallback(
      (endpoint, inactivity, hard, callDeadline) => callStructured(
        endpoint, prompt.system, JSON.stringify(translationInput), translationSchema, inactivity, hard, callDeadline,
      ),
      deadline,
    );
    const translationsByLanguage = {
      ...(input.translationsByLanguage ?? {}),
      [language]: translated,
    };
    const nextIndex = index + 1;
    const next: JobInput = { ...input, languageIndex: nextIndex, translationsByLanguage };
    if (nextIndex < extraLanguages.length) {
      next.progressStage = `Traducción al idioma ${language} completada`;
      return saveState(supabase, job.id, next, 65 + Math.round((nextIndex / extraLanguages.length) * 30));
    }
    next.progressStage = 'Preparando el resultado para revisión';
    await saveState(supabase, job.id, next, 97);
    return finishJob(supabase, job, next, extracted, translationsByLanguage);
  }

  // Unknown state: return the current row so the client does not loop forever.
  const { data: current, error: currentError } = await supabase.from('ai_jobs')
    .select('*').eq('id', job.id).maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new Error('Job no encontrado');
  return current;
}

interface StepRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface StepResponse {
  status(code: number): StepResponse;
  json(body: unknown): StepResponse;
  end(): void;
}

export default async function handler(req: StepRequest, res: StepResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return res.status(500).json({ error: 'Falta configurar Supabase en Vercel' });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  let jobId: string | undefined;
  try {
    const authorization = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const token = String(authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return res.status(401).json({ error: 'Invalid session' });
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { jobId?: string };
    jobId = String(body.jobId ?? '');
    if (!jobId) return res.status(400).json({ error: 'jobId es obligatorio' });

    const { data: job, error: jobError } = await supabase.from('ai_jobs')
      .select('id, restaurant_id, created_by, status, input')
      .eq('id', jobId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // The job must belong to the authenticated owner.
    if (job.created_by !== userData.user.id) return res.status(403).json({ error: 'Forbidden' });
    const { data: restaurant } = await supabase.from('restaurants').select('id')
      .eq('id', job.restaurant_id).eq('owner_id', userData.user.id).maybeSingle();
    if (!restaurant) return res.status(403).json({ error: 'Forbidden' });

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(200).json(job);
    }

    const deadline = Date.now() + STEP_BUDGET_MS;
    const updated = await runStep(supabase, job as unknown as StepJob, deadline);
    return res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ai-import-step] failed', message);
    if (jobId && process.env.SUPABASE_URL) {
      await markFailed(supabase, jobId, message).catch(() => {});
    }
    return res.status(500).json({ error: message });
  }
}
