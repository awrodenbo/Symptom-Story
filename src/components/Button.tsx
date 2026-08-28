import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/tokens.ts';

type ButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  icon,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const iconColor = danger
    ? theme.colors.danger
    : secondary
      ? theme.colors.brandPrimary
      : theme.colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        danger && styles.buttonDanger,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={19} color={disabled ? theme.colors.disabledText : iconColor} />}
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonSecondaryText,
          danger && styles.buttonDangerText,
          disabled && styles.buttonDisabledText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.touchTarget.minHeight,
    minWidth: theme.touchTarget.minWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.brandPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.brandPrimary,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    borderColor: theme.colors.disabledBg,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.surface,
    textAlign: 'center',
  },
  buttonSecondaryText: {
    color: theme.colors.brandPrimary,
  },
  buttonDangerText: {
    color: theme.colors.danger,
  },
  buttonDisabledText: {
    color: theme.colors.disabledText,
  },
});
