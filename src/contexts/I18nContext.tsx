'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import zhTW from '@/i18n/zh-TW.json';
import zhCN from '@/i18n/zh-CN.json';
import en from '@/i18n/en.json';
import ja from '@/i18n/ja.json';
import ko from '@/i18n/ko.json';

export type Locale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
};

type Messages = typeof zhTW;

const MESSAGES: Record<Locale, Messages> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  'en': en as unknown as Messages,
  'ja': ja as unknown as Messages,
  'ko': ko as unknown as Messages,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-TW');

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(MESSAGES[locale] as unknown as Record<string, unknown>, key);
    },
    [locale]
  );

  // Restore locale from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('locale') as Locale | null;
    if (saved && MESSAGES[saved]) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
