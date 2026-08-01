import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
    url?: string;
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

  // Follows the job's queued -> processing -> completed/failed transitions live, since
  // ai-import-start returns as soon as the job is queued and does the real work in the
  // background (see docs/AI_ARCHITECTURE.md §4).
  useEffect(() => {
    if (!job?.id) return;
    const channel = supabase
      .channel(`ai_jobs:import:${job.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_jobs', filter: `id=eq.${job.id}` },
        (payload) => {
          setJob(payload.new as AiJob);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [job?.id]);

  const result = (job?.status === 'completed' ? (job.output as unknown as MenuImportResult) : null);

  return { start, reset, starting, job, result, error };
}
