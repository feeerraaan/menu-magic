import { supabase } from '@/integrations/supabase/client';
import type { GenerateDescriptionInput, GenerateDescriptionResult } from '@ai/description';
import type { TranslateFieldInput, TranslateFieldResult } from '@ai/translation';

// One function per AI operation, mirroring src/lib/api.ts's convention. Every call goes
// through supabase.functions.invoke — never a direct provider/agent import (see
// docs/AI_ARCHITECTURE.md §1 and §5).

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
