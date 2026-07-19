import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  color = '#1A56DB',
  style,
  textStyle,
  icon,
}: Props) {
  const containerStyles = [
    styles.base,
    sizeStyles[size],
    variant === 'primary' && { backgroundColor: color },
    variant === 'secondary' && styles.secondary,
    variant === 'outline' && [styles.outline, { borderColor: color }],
    variant === 'ghost' && styles.ghost,
    variant === 'danger' && styles.danger,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    sizeTextStyles[size],
    variant === 'primary' && styles.textWhite,
    variant === 'secondary' && styles.textSecondary,
    variant === 'outline' && { color },
    variant === 'ghost' && { color },
    variant === 'danger' && styles.textWhite,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? color : '#FFFFFF'}
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 8,
  },
  secondary: { backgroundColor: '#F3F4F6' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5 },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: '#C81E1E' },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '600' },
  textWhite: { color: '#FFFFFF' },
  textSecondary: { color: '#374151' },
});

const sizeStyles = {
  sm: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  md: { paddingHorizontal: 16, paddingVertical: 12 },
  lg: { paddingHorizontal: 24, paddingVertical: 16 },
};

const sizeTextStyles = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 17 },
};
