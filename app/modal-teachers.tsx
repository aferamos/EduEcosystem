import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { X, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import RoleBadge from '@/components/RoleBadge';
import type { UserRole } from '@/lib/types';

interface TeacherItem {
  id: string;
  role: UserRole;
  profile: { full_name: string; avatar_url: string | null } | null;
}

export default function ModalTeachers() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const load = async () => {
    if (!institutionId) return;

    const { data, error } = await supabase
      .from('perfis_usuario')
      .select('*, perfil_join:perfis!usuario_id(id, nome_completo, avatar_url)')
      .eq('instituicao_id', institutionId)
      .eq('perfil', 'professor')
      .eq('ativo', true)
      .order('criado_em', { ascending: false });

    if (error) { console.warn('modal-teachers error', error.message); return; }

    setTeachers((data ?? []).map((r: any) => ({
      id: r.id,
      role: r.perfil as UserRole,
      profile: r.perfil_join
        ? { full_name: r.perfil_join.nome_completo, avatar_url: r.perfil_join.avatar_url }
        : null,
    })));
  };

  useEffect(() => { load(); }, [institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.secondary, paddingTop: 56 + insets.top * 0.5 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Professores</Text>
            <Text style={styles.headerSub}>
              {teachers.length} professor{teachers.length !== 1 ? 'es' : ''} ativo{teachers.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.secondary} />}
      >
        {teachers.length === 0 ? (
          <EmptyState
            icon={<Users size={28} color="#9CA3AF" />}
            title="Nenhum professor cadastrado"
            description="Adicione professores à instituição."
          />
        ) : (
          teachers.map(ur => (
            <Card key={ur.id} style={styles.userCard} padding={14}>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: theme.secondary + '20' }]}>
                  <Text style={[styles.avatarText, { color: theme.secondary }]}>
                    {ur.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {ur.profile?.full_name ?? 'Sem nome'}
                  </Text>
                  <RoleBadge role={ur.role} />
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 },
  list: { padding: 16, gap: 10 },
  userCard: {},
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: '600' },
});
