'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyThemeToDocument = (nextTheme: Theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', nextTheme === 'dark');
  root.style.colorScheme = nextTheme;
  try {
    localStorage.setItem('goodgather_theme', nextTheme);
  } catch {
    // Ignore storage access errors
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initialTheme: Theme = 'light';
    try {
      const saved = localStorage.getItem('goodgather_theme');
      if (saved === 'dark' || saved === 'light') {
        initialTheme = saved;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialTheme = 'dark';
      }
    } catch {
      // Ignore storage access errors
    }
    setThemeState(initialTheme);
    applyThemeToDocument(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeToDocument(theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      applyThemeToDocument(next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    applyThemeToDocument(newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
