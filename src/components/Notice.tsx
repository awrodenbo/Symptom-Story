import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/context';

export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, error && styles.noticeError]}
    >
      <Text style={[styles.noticeText, error && styles.noticeTextError]}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: import('../theme/tokens').ThemeTokens) => StyleSheet.create({
  notice: {
    padding: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.noticeBg,
  },
  noticeError: {
    backgroundColor: theme.colors.errorBg,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.noticeText,
    fontWeight: '600',
  },
  noticeTextError: {
    color: theme.colors.errorText,
  },
});
