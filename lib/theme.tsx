import React, { createContext, useContext } from 'react';
import type { Institution } from '@/lib/types';

export interface AppTheme {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  white: string;
}

const DEFAULT_THEME: AppTheme = {
  primary: '#1A56DB',
  primaryDark: '#1E429F',
  primaryLight: '#3F83F8',
  secondary: '#0694A2',
  success: '#057A55',
  warning: '#C27803',
  danger: '#C81E1E',
  bg: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  white: '#FFFFFF',
};

function buildTheme(institution: Institution | null): AppTheme {
  if (!institution) return DEFAULT_THEME;
  return {
    ...DEFAULT_THEME,
    primary: institution.primary_color,
    primaryDark: institution.primary_color,
    primaryLight: institution.secondary_color,
    secondary: institution.secondary_color,
  };
}

interface ThemeContextValue {
  theme: AppTheme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: DEFAULT_THEME });

export function ThemeProvider({
  institution,
  children,
}: {
  institution: Institution | null;
  children: React.ReactNode;
}) {
  const theme = buildTheme(institution);
  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext).theme;
}
