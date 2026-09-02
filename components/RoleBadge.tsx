import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { UserRole } from '@/lib/types';

const roleConfig: Record<UserRole, { label: string; bg: string; text: string }> = {
  super_admin: { label: 'Super Admin', bg: '#7C3AED20', text: '#5B21B6' },
  admin: { label: 'Administrador', bg: '#DBEAFE', text: '#1E429F' },
  coordenador: { label: 'Coordenador', bg: '#FEF3C7', text: '#92400E' },
  professor: { label: 'Professor', bg: '#D1FAE5', text: '#065F46' },
  aluno: { label: 'Aluno', bg: '#E0F2FE', text: '#0C4A6E' },
  responsavel: { label: 'Responsável', bg: '#FDE8FF', text: '#6B21A8' },
};

export default function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role] ?? roleConfig.aluno;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
