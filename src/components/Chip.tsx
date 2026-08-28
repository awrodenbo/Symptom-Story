import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme/tokens.ts';

type ChipProps = {
  label: string;
  checked: boolean;
  onPress: () => void;
  accessibilityRole?: 'radio' | 'checkbox' | 'button';
  accessibilityLabel?: string;
};

export function Chip({
  label,
  checked,
  onPress,
  accessibilityRole = 'radio',
  accessibilityLabel,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[styles.chip, checked && styles.chipChecked]}
    >
      <Text style={[styles.chipText, checked && styles.chipTextChecked]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: theme.touchTarget.minHeight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipChecked: {
    borderColor: theme.colors.brandPrimary,
    backgroundColor: theme.colors.accentSage,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chipTextChecked: {
    color: theme.colors.brandPrimary,
  },
});
