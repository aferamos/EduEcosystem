import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Props {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: '#DBEAFE', text: '#1E429F' },
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  danger: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#E0F2FE', text: '#0C4A6E' },
  neutral: { bg: '#F3F4F6', text: '#374151' },
};

export default function Badge({ label, variant = 'neutral', size = 'sm' }: Props) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color: v.text }, size === 'md' && styles.textMd]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 11, fontWeight: '600' },
  textMd: { fontSize: 13 },
});
