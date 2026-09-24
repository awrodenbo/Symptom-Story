export type ThemeId = 'sage' | 'lavender' | 'ocean' | 'dusk' | 'golden';

type ThemeColors = {
  background: string;
  surface: string;
  surfaceBorder: string;
  textPrimary: string;
  textMuted: string;
  brandPrimary: string;
  brandSecondary: string;
  accentSage: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  noticeBg: string;
  noticeText: string;
  errorBg: string;
  errorText: string;
  danger: string;
  disabledBg: string;
  disabledText: string;
  pressedOverlay: string;
};

export type ThemeTokens = {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radii: { sm: number; md: number; lg: number; pill: number };
  touchTarget: { minHeight: number; minWidth: number };
};

const shared = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 8, md: 12, lg: 16, pill: 999 },
  touchTarget: { minHeight: 48, minWidth: 48 },
};

export const themes: Record<ThemeId, ThemeTokens> = {
  sage: {
    id: 'sage', name: 'Sage',
    colors: { background:'#F8F6F0', surface:'#FFFFFF', surfaceBorder:'#DFE5E0', textPrimary:'#25342E', textMuted:'#4A5852', brandPrimary:'#35594D', brandSecondary:'#35594D', accentSage:'#DCEBE3', inputBg:'#FFFFFF', inputBorder:'#BCC8C1', placeholder:'#505E57', noticeBg:'#DCEBE3', noticeText:'#2A4B40', errorBg:'#F6E6E5', errorText:'#8B262B', danger:'#8B262B', disabledBg:'#E2E8E4', disabledText:'#7B8982', pressedOverlay:'rgba(53, 89, 77, 0.12)' },
    ...shared,
  },
  lavender: {
    id: 'lavender', name: 'Lavender',
    colors: { background:'#F8F5FA', surface:'#FFFFFF', surfaceBorder:'#E5DDE9', textPrimary:'#342E3A', textMuted:'#625A68', brandPrimary:'#675276', brandSecondary:'#675276', accentSage:'#E9DFF0', inputBg:'#FFFFFF', inputBorder:'#CFC2D6', placeholder:'#6D6472', noticeBg:'#E9DFF0', noticeText:'#554263', errorBg:'#F6E6E5', errorText:'#8B262B', danger:'#8B262B', disabledBg:'#ECE7EF', disabledText:'#8A818F', pressedOverlay:'rgba(103, 82, 118, 0.12)' },
    ...shared,
  },
  ocean: {
    id: 'ocean', name: 'Ocean',
    colors: { background:'#F3F8F8', surface:'#FFFFFF', surfaceBorder:'#D8E5E6', textPrimary:'#24383B', textMuted:'#52686B', brandPrimary:'#356A70', brandSecondary:'#356A70', accentSage:'#DCEDEF', inputBg:'#FFFFFF', inputBorder:'#BCD0D2', placeholder:'#5A7073', noticeBg:'#DCEDEF', noticeText:'#2D5960', errorBg:'#F6E6E5', errorText:'#8B262B', danger:'#8B262B', disabledBg:'#E2ECEC', disabledText:'#7A8D8F', pressedOverlay:'rgba(53, 106, 112, 0.12)' },
    ...shared,
  },
  dusk: {
    id: 'dusk', name: 'Dusk',
    colors: { background:'#FAF5F5', surface:'#FFFFFF', surfaceBorder:'#E9DDDF', textPrimary:'#3D3034', textMuted:'#6C5A60', brandPrimary:'#795363', brandSecondary:'#795363', accentSage:'#F0E0E5', inputBg:'#FFFFFF', inputBorder:'#D6C3C9', placeholder:'#74646A', noticeBg:'#F0E0E5', noticeText:'#654352', errorBg:'#F6E6E5', errorText:'#8B262B', danger:'#8B262B', disabledBg:'#EFE7E9', disabledText:'#918187', pressedOverlay:'rgba(121, 83, 99, 0.12)' },
    ...shared,
  },
  golden: {
    id: 'golden', name: 'Golden',
    colors: { background:'#FBF7EA', surface:'#FFFDF7', surfaceBorder:'#E8DFC5', textPrimary:'#373426', textMuted:'#66614C', brandPrimary:'#64613B', brandSecondary:'#9A792E', accentSage:'#F3E6B8', inputBg:'#FFFDF7', inputBorder:'#D7CBA6', placeholder:'#746E58', noticeBg:'#F3E6B8', noticeText:'#56522F', errorBg:'#F6E6E5', errorText:'#8B262B', danger:'#8B262B', disabledBg:'#EEE8D5', disabledText:'#8D866E', pressedOverlay:'rgba(154, 121, 46, 0.14)' },
    ...shared,
  },
};

export const sageTheme = themes.sage;
export const theme: ThemeTokens = sageTheme;
