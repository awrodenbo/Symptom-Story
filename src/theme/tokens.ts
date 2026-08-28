export const sageTheme = {
  id: 'sage',
  name: 'Sage',
  colors: {
    background: '#F8F6F0',
    surface: '#FFFFFF',
    surfaceBorder: '#DFE5E0',
    textPrimary: '#25342E',
    textMuted: '#4A5852',
    brandPrimary: '#35594D',
    brandSecondary: '#35594D',
    accentSage: '#DCEBE3',
    inputBg: '#FFFFFF',
    inputBorder: '#BCC8C1',
    placeholder: '#505E57',
    noticeBg: '#DCEBE3',
    noticeText: '#2A4B40',
    errorBg: '#F6E6E5',
    errorText: '#8B262B',
    danger: '#8B262B',
    disabledBg: '#E2E8E4',
    disabledText: '#7B8982',
    pressedOverlay: 'rgba(53, 89, 77, 0.12)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },
} as const;

export type ThemeTokens = typeof sageTheme;

export const theme: ThemeTokens = sageTheme;
