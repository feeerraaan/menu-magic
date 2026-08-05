import { useState, useEffect } from 'react';
import * as aiApi from '@/lib/ai-api';
import type { MenuImportSourceType, MenuImportResult } from '@ai/menuImport';
import type { AiJob, AiJobType } from '@ai/common';

export function useAiImport(restaurantId: string | undefined, jobType: AiJobType = 'menu_import') {
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<AiJob | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const start = async (input: {
    sourceType: MenuImportSourceType;
    text?: string;
    fileBase64?: string;
    fileName?: string;
  }) => {
    if (!restaurantId) throw new Error('No restaurant');
    setStarting(true);
    setError(null);
    setJob(null);
    try {
      const payload = { ...input, restaurantId, jobType };
      const { jobId } = jobType === 'ai_setup'
        ? await aiApi.startAiSetupImport(payload)
        : await aiApi.startMenuImport(payload);
      const initial = await aiApi.fetchAiJob(jobId);
      setJob(initial);
      return jobId;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setJob(null);
    setError(null);
  };

  // Drives the import one step at a time: each call to /api/ai-import-step performs one
  // chunk extraction or one language translation and returns the fresh job row. Because the
  // client (not the function itself) chains the steps, a menu of any length can be imported
  // without hitting Vercel's 300s per-function cap, and there is no self-invocation so the
  // 508 loop-protection can never fire.
  useEffect(() => {
    if (!job?.id || job.status === 'completed' || job.status === 'failed') return;
    let disposed = false;
    const drive = async () => {
      while (!disposed) {
        try {
          const next = await aiApi.continueImportStep(job.id);
          if (disposed) return;
          setJob(next);
          if (next.status === 'completed' || next.status === 'failed') return;
        } catch (e) {
          if (disposed) return;
          setError(e as Error);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    };
    drive();
    return () => {
      disposed = true;
    };
  }, [job?.id, job?.status]);

  const result = (job?.status === 'completed' ? (job.output as unknown as MenuImportResult) : null);

  return { start, reset, starting, job, result, error };
}
