import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Bell,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';

interface DashboardStats {
  students: number;
  teachers: number;
  classes: number;
  courses: number;
  occurrences: number;
  notifications: number;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56 + insets.bottom;
  const [stats, setStats] = useState<DashboardStats>({
    students: 0, teachers: 0, classes: 0, courses: 0, occurrences: 0, notifications: 0,
  });
  const [recentOccurrences, setRecentOccurrences] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadData = async () => {
    if (!institutionId) return;

    const [studentsRes, teachersRes, classesRes, coursesRes, occurrencesRes] = await Promise.all([
      supabase.from('user_roles').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('role', 'aluno').eq('is_active', true),
      supabase.from('user_roles').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('role', 'professor').eq('is_active', true),
      supabase.from('classes').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('active', true),
      supabase.from('courses').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('active', true),
      supabase.from('occurrences').select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('status', 'open'),
    ]);

    setStats({
      students: studentsRes.count ?? 0,
      teachers: teachersRes.count ?? 0,
      classes: classesRes.count ?? 0,
      courses: coursesRes.count ?? 0,
      occurrences: occurrencesRes.count ?? 0,
      notifications: 0,
    });

    const { data: occ } = await supabase
      .from('occurrences')
      .select('*, student_profile:profiles!student_id(full_name)')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentOccurrences(occ ?? []);
  };

  useEffect(() => { loadData(); }, [institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const severityColor = (s: string | null) =>
    s === 'high' ? theme.danger : s === 'medium' ? theme.warning : theme.textMuted;

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bom dia,</Text>
            <Text style={styles.name}>{user?.profile.full_name || 'Administrador'}</Text>
          </View>
          <TouchableOpacity onPress={() => signOut()} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.institutionChip}>
          <Text style={styles.institutionText}>
            {user?.currentInstitution?.name ?? 'Instituição'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionLabel}>Visão Geral</Text>
        <View style={styles.statsRow}>
        <StatCard label="Alunos" value={stats.students} icon={<GraduationCap size={20} color={theme.primary} />} color={theme.primary} onPress={() => router.push('/modal-students')} />
          <StatCard label="Professores" value={stats.teachers} icon={<Users size={20} color={theme.secondary} />} color={theme.secondary} onPress={() => router.push('/modal-teachers')} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Turmas" value={stats.classes} icon={<BookOpen size={20} color={theme.success} />} color={theme.success} onPress={() => router.push('/modal-classes')} />
          <StatCard label="Cursos" value={stats.courses} icon={<TrendingUp size={20} color={theme.warning} />} color={theme.warning} onPress={() => router.push('/modal-courses')} />
        </View>

        {stats.occurrences > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertRow}>
              <AlertTriangle size={20} color={theme.warning} />
              <Text style={styles.alertText}>
                {stats.occurrences} ocorrência{stats.occurrences > 1 ? 's' : ''} em aberto
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Ocorrências Recentes</Text>
          <ChevronRight size={16} color={theme.textMuted} />
        </View>

        {recentOccurrences.length === 0 ? (
          <Card>
            <View style={styles.emptyRow}>
              <CheckCircle size={18} color={theme.success} />
              <Text style={styles.emptyText}>Nenhuma ocorrência recente</Text>
            </View>
          </Card>
        ) : (
          recentOccurrences.map(occ => (
            <Card key={occ.id} style={styles.occCard}>
              <View style={styles.occRow}>
                <View style={[styles.occDot, { backgroundColor: severityColor(occ.severity) }]} />
                <View style={styles.occContent}>
                  <Text style={styles.occTitle}>{occ.title}</Text>
                  <Text style={styles.occStudent}>
                    {occ.student_profile?.full_name ?? 'Aluno'} · {occ.type}
                  </Text>
                </View>
                <Text style={styles.occDate}>
                  {new Date(occ.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </Text>
              </View>
            </Card>
          ))
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionLabel}>Ações Rápidas</Text>
          <View style={styles.actionsGrid}>
            {[
            { label: 'Novo Usuário', icon: <Users size={20} color={theme.primary} />, desc: 'Cadastrar aluno, professor, Coordenador...', onPress: () => router.push('/modal-new-user') },
            { label: 'Nova Turma', icon: <BookOpen size={20} color={theme.secondary} />, desc: 'Criar turma acadêmica', onPress: () => router.push('/modal-new-class') },
            { label: 'Comunicado', icon: <Bell size={20} color={theme.warning} />, desc: 'Enviar para comunidade' },
            { label: 'Relatório', icon: <TrendingUp size={20} color={theme.success} />, desc: 'Ver indicadores' },
            ].map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionCard}
                activeOpacity={'onPress' in action ? 0.75 : 1}
                onPress={'onPress' in action ? (action as any).onPress : undefined}
              >
                <Card style={{ flex: 1 }} padding={14}>
                  <View style={[styles.actionIcon, { backgroundColor: theme.bg }]}>
                    {action.icon}
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDesc}>{action.desc}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  institutionChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  institutionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  alertCard: { borderLeftWidth: 4, borderLeftColor: '#C27803', backgroundColor: '#FFFBEB' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertText: { fontSize: 14, color: '#92400E', fontWeight: '600' },
  occCard: { marginBottom: 0 },
  occRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  occDot: { width: 10, height: 10, borderRadius: 5 },
  occContent: { flex: 1 },
  occTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  occStudent: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  occDate: { fontSize: 11, color: '#9CA3AF' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  emptyText: { fontSize: 14, color: '#6B7280' },
  quickActions: { gap: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', gap: 6 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  actionDesc: { fontSize: 11, color: '#6B7280' },
});
