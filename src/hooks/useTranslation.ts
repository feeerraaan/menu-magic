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

  const t = (key: string, defaultValue?: string): any => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return defaultValue || key;
      }
    }

    return value !== undefined ? value : defaultValue || key;
  };

  const tReplace = (key: string, replacements: Record<string, string>): string => {
    let text = t(key);
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };

  return { t, tReplace, language };
}
