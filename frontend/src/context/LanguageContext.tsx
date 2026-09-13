import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { en, sq, type TranslationKey } from "../i18n/translations";

export type Language = "en" | "sq";

const STORAGE_KEY = "ie_language";
const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, sq };

function readStoredLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "sq" || stored === "en" ? stored : "en";
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const toggleLanguage = () => setLanguage(language === "en" ? "sq" : "en");

  const t = useMemo(() => {
    const dict = DICTIONARIES[language];
    return (key: TranslationKey, vars?: Record<string, string | number>) => interpolate(dict[key], vars);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
