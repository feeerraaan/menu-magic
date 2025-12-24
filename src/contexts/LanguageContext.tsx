import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, getBrowserLanguage, t as translate } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ 
  children, 
  defaultLanguage,
  supportedLanguages = ['en', 'es', 'ca']
}: { 
  children: React.ReactNode;
  defaultLanguage?: Language;
  supportedLanguages?: string[];
}) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (defaultLanguage) return defaultLanguage;
    const browserLang = getBrowserLanguage();
    if (supportedLanguages.includes(browserLang)) return browserLang;
    return (supportedLanguages[0] as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('SaCarta-language', lang);
  };

  useEffect(() => {
    const stored = localStorage.getItem('SaCarta-language') as Language | null;
    if (stored && supportedLanguages.includes(stored)) {
      setLanguageState(stored);
    }
  }, [supportedLanguages]);

  const t = (key: string) => translate(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}