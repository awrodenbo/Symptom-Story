import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/tokens.ts';

type ToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function ToggleRow({ label, description, checked, onPress, disabled = false }: ToggleRowProps) {
  const fullLabel = description ? `${label}. ${description}` : label;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={fullLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Text style={[styles.value, checked && styles.valueChecked]}>{checked ? 'On' : 'Off'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.touchTarget.minHeight + 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
  },
  value: {
    minWidth: 36,
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textAlign: 'right',
  },
  valueChecked: {
    color: theme.colors.brandPrimary,
  },
});
