import { colors } from './colors';

export const themes = {
  light: {
    background: colors.neutral[50],
    foreground: colors.neutral[900],
    primary: colors.primary[600],
    accent: colors.primary[500],
    border: colors.neutral[200],
  },
  dark: {
    background: colors.neutral[900],
    foreground: colors.neutral[50],
    primary: colors.primary[200],
    accent: colors.primary[500],
    border: colors.neutral[700],
  },
} as const;
