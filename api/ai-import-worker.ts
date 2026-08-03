import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import type { Database } from '../src/integrations/supabase/types.js';
import {
  buildExtractionPrompt,
  buildMenuBatchTranslationPrompt,
  callStructured,
  enqueueImportWorker,
  extractionSchema,
  mergeExtractions,
  sourceText,
  splitText,
  translationSchema,
  withFallback,
  type Extraction,
} from './ai-import-start.js';

export const config = { maxDuration: 300 };

type JobInput = {
  sourceType?: string;
  fileName?: string | null;
  progressStage?: string;
  phase?: 'prepare' | 'extract' | 'translate';
  source?: Record<string, unknown>;
  chunks?: string[];
  chunkIndex?: number;
  extractions?: Extraction[];
  extracted?: Extraction;
  translationsByLanguage?: Record<string, unknown>;
  languageIndex?: number;
};

type WorkerJob = {
  id: string;
  restaurant_id: string;
  status: string;
  input: JobInput;
};

type WorkerSupabase = SupabaseClient<Database>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function updateJob(
  supabase: WorkerSupabase,
  jobId: string,
  input: JobInput,
  progress: number,
  progressStage: string,
): Promise<JobInput> {
  const nextInput = { ...input, progressStage };
  const { error } = await supabase.from('ai_jobs').update({
    input: nextInput as unknown as Database['public']['Tables']['ai_jobs']['Row']['input'],
    progress,
  }).eq('id', jobId);
  if (error) throw error;
  return nextInput;
}

async function enqueueNext(jobId: string): Promise<void> {
  await enqueueImportWorker(jobId);
}

async function markJobFailed(supabase: WorkerSupabase, jobId: string, message: string): Promise<void> {
  await supabase.from('ai_jobs').update({
    status: 'failed',
    error: message,
    input: { progressStage: 'La importación ha fallado' } as unknown as Database['public']['Tables']['ai_jobs']['Row']['input'],
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
}

async function finishJob(
  supabase: WorkerSupabase,
  job: WorkerJob,
  input: JobInput,
  extracted: Extraction,
  translationsByLanguage: Record<string, unknown>,
): Promise<void> {
  const { error: chargeError } = await supabase.from('ai_usage').insert({
    restaurant_id: job.restaurant_id,
    kind: 'import',
    credits_charged: 15,
    ai_job_id: job.id,
    metadata: { sourceType: input.sourceType, backend: 'vercel' },
  });
  if (chargeError) throw chargeError;
  const { error } = await supabase.from('ai_jobs').update({
    status: 'completed',
    output: { ...extracted, translationsByLanguage } as unknown as Database['public']['Tables']['ai_jobs']['Row']['output'],
    progress: 100,
    ai_credits_charged: 15,
    input: { ...input, progressStage: 'Importación completada' } as unknown as Database['public']['Tables']['ai_jobs']['Row']['input'],
    completed_at: new Date().toISOString(),
  }).eq('id', job.id);
  if (error) throw error;
}

async function runWorker(supabase: WorkerSupabase, job: WorkerJob): Promise<void> {
  let input = job.input ?? {};
  const { data: restaurant, error: restaurantError } = await supabase.from('restaurants')
    .select('default_language, supported_languages')
    .eq('id', job.restaurant_id)
    .maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) throw new Error('Restaurante no encontrado');

  if ((input.phase ?? 'prepare') === 'prepare') {
    if (!input.source) throw new Error('Falta la fuente original de la importación');
    const raw = await sourceText(input.source);
    if (!raw) throw new Error('No se pudo extraer texto del menú');
    const chunks = splitText(raw);
    input = {
      ...input,
      phase: 'extract',
      chunks,
      chunkIndex: 0,
      extractions: [],
    };
    delete input.source;
    input = await updateJob(supabase, job.id, input, 8, `Texto preparado · ${chunks.length} bloques por analizar`);
  }

  if (input.phase === 'extract') {
    const chunks = input.chunks ?? [];
    const index = input.chunkIndex ?? 0;
    const extractions = [...(input.extractions ?? [])];
    if (index < chunks.length) {
      const locale = String(restaurant.default_language ?? 'es');
      input = await updateJob(
        supabase,
        job.id,
        input,
        10 + Math.round((index / chunks.length) * 52),
        `Analizando bloque ${index + 1} de ${chunks.length}`,
      );
      const prompt = buildExtractionPrompt(chunks[index], locale, { fragment: chunks.length > 1 });
      const extraction = await withFallback((model, inactivity, hard) => callStructured(
        model,
        prompt.system,
        chunks[index],
        extractionSchema,
        inactivity,
        hard,
      ));
      extractions.push(extraction);
      input = {
        ...input,
        chunkIndex: index + 1,
        extractions,
      };
      const finishedProgress = 10 + Math.round(((index + 1) / chunks.length) * 52);
      if (index + 1 < chunks.length) {
        input = await updateJob(
          supabase,
          job.id,
          input,
          finishedProgress,
          `Bloque ${index + 1} de ${chunks.length} analizado`,
        );
        await enqueueNext(job.id);
        return;
      }
    }

    const extracted = mergeExtractions(input.extractions ?? []);
    const defaultLanguage = String(restaurant.default_language ?? 'es');
    const languages = Array.isArray(restaurant.supported_languages)
      ? restaurant.supported_languages.map(String)
      : [defaultLanguage];
    const extraLanguages = languages.filter((language) => language !== defaultLanguage);
    if (extraLanguages.length === 0) {
      await finishJob(supabase, job, input, extracted, {});
      return;
    }
    input = {
      ...input,
      phase: 'translate',
      extracted,
      translationsByLanguage: {},
      languageIndex: 0,
    };
    input = await updateJob(supabase, job.id, input, 65, 'Preparando traducciones');
  }

  if (input.phase === 'translate') {
    const extracted = input.extracted;
    if (!extracted) throw new Error('Falta el menú extraído antes de traducir');
    const defaultLanguage = String(restaurant.default_language ?? 'es');
    const languages = Array.isArray(restaurant.supported_languages)
      ? restaurant.supported_languages.map(String)
      : [defaultLanguage];
    const extraLanguages = languages.filter((language) => language !== defaultLanguage);
    const index = input.languageIndex ?? 0;
    const language = extraLanguages[index];
    if (!language) {
      await finishJob(supabase, job, input, extracted, input.translationsByLanguage ?? {});
      return;
    }
    const translationInput = {
      menuName: extracted.menuName,
      categories: extracted.categories.map((category) => ({
        name: category.name,
        description: category.description ?? null,
        items: category.items.map((item) => ({ name: item.name, description: item.description ?? null })),
      })),
    };
    input = await updateJob(
      supabase,
      job.id,
      input,
      65 + Math.round((index / extraLanguages.length) * 30),
      `Traduciendo al idioma ${language}`,
    );
    const prompt = buildMenuBatchTranslationPrompt(translationInput, defaultLanguage, language);
    const translated = await withFallback((model, inactivity, hard) => callStructured(
      model,
      prompt.system,
      JSON.stringify(translationInput),
      translationSchema,
      inactivity,
      hard,
    ));
    const translationsByLanguage = {
      ...(input.translationsByLanguage ?? {}),
      [language]: translated,
    };
    input = {
      ...input,
      languageIndex: index + 1,
      translationsByLanguage,
    };
    if (index + 1 < extraLanguages.length) {
      input = await updateJob(
        supabase,
        job.id,
        input,
        65 + Math.round(((index + 1) / extraLanguages.length) * 30),
        `Traducción al idioma ${language} completada`,
      );
      await enqueueNext(job.id);
      return;
    }
    await updateJob(supabase, job.id, input, 97, 'Preparando el resultado para revisión');
    await finishJob(supabase, job, input, extracted, translationsByLanguage);
  }
}

interface WorkerRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface WorkerResponse {
  status(code: number): WorkerResponse;
  json(body: unknown): WorkerResponse;
  end(): void;
}

export default async function handler(req: WorkerRequest, res: WorkerResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { jobId?: string };
    if (!body.jobId) return res.status(400).json({ error: 'jobId is required' });
    const supabase = createClient(process.env.SUPABASE_URL!, serviceRoleKey, { auth: { persistSession: false } });
    const { data: job, error } = await supabase.from('ai_jobs')
      .select('id, restaurant_id, status, input')
      .eq('id', body.jobId)
      .single();
    if (error) throw error;
    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(200).json({ status: job.status });
    }
    const work = runWorker(supabase, job as WorkerJob).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[ai-import-worker] failed', message);
      await markJobFailed(supabase, body.jobId!, message);
    });
    waitUntil(work);
    return res.status(200).json({ status: 'processing' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ai-import-worker] failed', message);
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { jobId?: string };
    if (body?.jobId && process.env.SUPABASE_URL) {
      const supabase = createClient(process.env.SUPABASE_URL, serviceRoleKey!, { auth: { persistSession: false } });
      await markJobFailed(supabase, body.jobId, message);
    }
    return res.status(500).json({ error: message });
  }
}
