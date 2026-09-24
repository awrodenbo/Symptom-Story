import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { themes, type ThemeId, type ThemeTokens } from './tokens';

const STORAGE_KEY = 'symptom-story:appearance';

type ThemeContextValue = {
  theme: ThemeTokens;
  themeId: ThemeId;
  setThemeId: (next: ThemeId) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.sage,
  themeId: 'sage',
  setThemeId: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('sage');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in themes) setThemeIdState(saved as ThemeId);
    });
  }, []);

  async function setThemeId(next: ThemeId) {
    setThemeIdState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }

  const value = useMemo(() => ({ theme: themes[themeId], themeId, setThemeId }), [themeId]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
