import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GenerateDescriptionInput, GenerateDescriptionResult } from '@ai/description';
import type { TranslateFieldInput, TranslateFieldResult } from '@ai/translation';
import type { OptimizerOutput, MenuScoreHistoryEntry } from '@ai/optimizer';

// One function per AI operation, mirroring src/lib/api.ts's convention. Every call goes
// through supabase.functions.invoke — never a direct provider/agent import (see
// docs/AI_ARCHITECTURE.md §1 and §5).

// New AI tables (ai_jobs, ai_usage, ai_menu_scores, ai_generated_content) aren't in the
// generated Database type yet — src/integrations/supabase/types.ts is regenerated from the
// LIVE Supabase schema, and the Phase 0 migration hasn't been applied there yet (see
// docs/IMPLEMENTATION_PLAN.md's Deployment checklist). Cast narrowly for these tables only;
// remove this once `supabase gen types` is re-run after `supabase db push`.
const untypedSupabase = supabase as unknown as SupabaseClient;

export async function generateItemDescription(
  input: GenerateDescriptionInput,
): Promise<GenerateDescriptionResult> {
  const { data, error } = await supabase.functions.invoke('ai-generate-description', {
    body: input,
  });
  if (error) throw error;
  return data as GenerateDescriptionResult;
}

export async function translateField(input: TranslateFieldInput): Promise<TranslateFieldResult> {
  const { data, error } = await supabase.functions.invoke('ai-translate', {
    body: input,
  });
  if (error) throw error;
  return data as TranslateFieldResult;
}

export async function runMenuOptimizer(
  restaurantId: string,
): Promise<{ jobId: string; result: OptimizerOutput }> {
  const { data, error } = await supabase.functions.invoke('ai-optimize-menu', {
    body: { restaurantId },
  });
  if (error) throw error;
  return data as { jobId: string; result: OptimizerOutput };
}

export async function fetchMenuScoreHistory(restaurantId: string): Promise<MenuScoreHistoryEntry[]> {
  const { data, error } = await untypedSupabase
    .from('ai_menu_scores')
    .select('id, score, breakdown, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as MenuScoreHistoryEntry[];
}
