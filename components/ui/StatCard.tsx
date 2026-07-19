import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

export default function StatCard({ label, value, icon, color, subtitle }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 140,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  value: { fontSize: 22, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  subtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
