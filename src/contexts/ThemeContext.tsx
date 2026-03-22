'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorScheme = 'default' | 'neon' | 'sunset';

export const COLOR_SCHEME_LABELS: Record<ColorScheme, string> = {
  default: '經典藍紫',
  neon: '潮流霓虹',
  sunset: '日落橙紫',
};

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('theme') as Theme | null;
  return saved ?? 'dark';
}

function getInitialScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'neon';
  const saved = localStorage.getItem('colorScheme') as ColorScheme | null;
  if (saved === 'default' || saved === 'sunset') return saved;
  return 'neon';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialScheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (colorScheme === 'default') {
      document.documentElement.removeAttribute('data-color-scheme');
    } else {
      document.documentElement.setAttribute('data-color-scheme', colorScheme);
    }
  }, [colorScheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem('colorScheme', scheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, toggleTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
