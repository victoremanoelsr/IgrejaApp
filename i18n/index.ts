import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './pt-BR.json';
import enUS from './en-US.json';
import esES from './es-ES.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
      'es-ES': { translation: esES },
    },
    fallbackLng: 'pt-BR',
    lng: localStorage.getItem('i18n_language') || 'pt-BR',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18n_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

export function formatCurrency(value: number, language: string): string {
  const localeMap: Record<string, { locale: string; currency: string }> = {
    'pt-BR': { locale: 'pt-BR', currency: 'BRL' },
    'en-US': { locale: 'en-US', currency: 'USD' },
    'es-ES': { locale: 'es-ES', currency: 'EUR' },
  };
  const config = localeMap[language] || localeMap['pt-BR'];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr: string, language: string): string {
  if (!dateStr) return '';
  const localeMap: Record<string, string> = {
    'pt-BR': 'pt-BR',
    'en-US': 'en-US',
    'es-ES': 'es-ES',
  };
  const locale = localeMap[language] || 'pt-BR';
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString(locale);
  } catch {
    return dateStr;
  }
}

export function getMonthName(monthIndex: number, language: string): string {
  const localeMap: Record<string, string> = {
    'pt-BR': 'pt-BR',
    'en-US': 'en-US',
    'es-ES': 'es-ES',
  };
  const locale = localeMap[language] || 'pt-BR';
  return new Date(0, monthIndex).toLocaleString(locale, { month: 'long' }).toUpperCase();
}
