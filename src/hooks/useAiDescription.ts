import { useState } from 'react';
import * as aiApi from '@/lib/ai-api';
import type { DescriptionStyle } from '@ai/description';

export function useAiDescription() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (itemId: string, style: DescriptionStyle, locale: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.generateItemDescription({ itemId, style, locale });
      return result.description;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}
