import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { X, Users } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface Turma {
  id: string;
  nome: string;
  ano: number;
  turno: string | null;
  curso?: { nome: string } | null;
}

const shiftLabel = (s: string | null) =>
  ({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }[s ?? ''] ?? s ?? '—');

export default function ModalClasses() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<Turma[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const load = async () => {
    if (!institutionId) return;
    const { data } = await supabase
      .from('turmas')
      .select('*, curso:cursos(nome)')
      .eq('instituicao_id', institutionId)
      .eq('ativo', true)
      .order('nome');
    setClasses(data ?? []);
  };

  useEffect(() => { load(); }, [institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.success, paddingTop: 56 + insets.top * 0.5 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Turmas</Text>
            <Text style={styles.headerSub}>{classes.length} turma{classes.length !== 1 ? 's' : ''} ativa{classes.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.success} />}
      >
        {classes.length === 0 ? (
          <EmptyState
            icon={<Users size={28} color="#9CA3AF" />}
            title="Nenhuma turma cadastrada"
            description="Crie turmas e vincule-as a cursos."
          />
        ) : (
          classes.map(cl => (
            <Card key={cl.id} style={styles.itemCard} padding={14}>
              <View style={styles.itemRow}>
                <View style={[styles.itemIcon, { backgroundColor: theme.success + '20' }]}>
                  <Users size={20} color={theme.success} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.text }]}>{cl.nome}</Text>
                  <View style={styles.itemMeta}>
                    <Badge label={`${cl.ano}`} variant="neutral" />
                    <Badge label={shiftLabel(cl.turno)} variant="info" />
                    {cl.curso?.nome && <Text style={styles.metaText}>{cl.curso.nome}</Text>}
                  </View>
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
  itemCard: {},
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#6B7280' },
});
