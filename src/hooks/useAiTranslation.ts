import { useState } from 'react';
import * as aiApi from '@/lib/ai-api';

export function useAiTranslation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const translate = async (
    text: string,
    sourceLocale: string,
    targetLocale: string,
    restaurantId: string,
    context?: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.translateField({ text, sourceLocale, targetLocale, restaurantId, context });
      return result.translatedText;
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { translate, loading, error };
}
