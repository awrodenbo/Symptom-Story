import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme/tokens.ts';

type FieldProps = {
  label: string;
} & TextInputProps;

export function Field({ label, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.placeholder}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  input: {
    minHeight: theme.touchTarget.minHeight,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBg,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
