import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// Importar las traducciones
import esTranslations from '@/locales/es.json';
import enTranslations from '@/locales/en.json';
import caTranslations from '@/locales/ca.json';

const translations: Record<string, Record<string, unknown>> = {
  es: esTranslations,
  en: enTranslations,
  ca: caTranslations,
};

export function useTranslation() {
  const { language } = useLanguage();

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = key;
        break;
      }
    }

    if (typeof value !== 'string') {
      value = key;
    }

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }

    return value;
  }, [language]);

  const tReplace = useCallback((key: string, replacements: Record<string, string | number>): string => {
    return t(key, replacements);
  }, [t]);

  /** Returns the raw JSON value for a key (arrays/objects), or undefined. */
  const tRaw = useCallback((key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  }, [language]);

  return { t, tReplace, tRaw, language };
}
