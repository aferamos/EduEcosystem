import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GraduationCap,
  CalendarCheck,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { ClassSubject } from '@/lib/types';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const [myClasses, setMyClasses] = useState<ClassSubject[]>([]);
  const [stats, setStats] = useState({ classes: 0, studentsTotal: 0, pendingGrades: 0, openOccurrences: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;

    const { data: cs } = await supabase
      .from('class_subjects')
      .select('*, subject:subjects(name), class:classes(name, year, shift)')
      .eq('teacher_id', user.id);

    setMyClasses(cs ?? []);

    const classIds = (cs ?? []).map(c => c.class_id);
    let studentsTotal = 0;
    if (classIds.length > 0) {
      const { count } = await supabase
        .from('student_enrollments')
        .select('id', { count: 'exact', head: true })
        .in('class_id', classIds)
        .eq('status', 'active');
      studentsTotal = count ?? 0;
    }

    const csIds = (cs ?? []).map(c => c.id);
    let pendingGrades = 0;
    if (csIds.length > 0) {
      const { count } = await supabase
        .from('grades')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingGrades = count ?? 0;
    }

    const institutionId = user.currentInstitution?.id;
    let openOccurrences = 0;
    if (institutionId) {
      const { count } = await supabase
        .from('occurrences')
        .select('id', { count: 'exact', head: true })
        .eq('reported_by', user.id)
        .eq('status', 'open');
      openOccurrences = count ?? 0;
    }

    setStats({ classes: cs?.length ?? 0, studentsTotal, pendingGrades, openOccurrences });
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const shiftLabel = (s: string | null) =>
    ({ morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', full: 'Integral' }[s ?? ''] ?? '');

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Portal do Professor</Text>
            <Text style={styles.name}>{user?.profile.full_name ?? 'Professor'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.statsRow}>
          <StatCard label="Turmas" value={stats.classes} icon={<GraduationCap size={20} color={theme.primary} />} color={theme.primary} />
          <StatCard label="Alunos" value={stats.studentsTotal} icon={<CalendarCheck size={20} color={theme.secondary} />} color={theme.secondary} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Notas Pendentes" value={stats.pendingGrades} icon={<Star size={20} color={theme.warning} />} color={theme.warning} />
          <StatCard label="Ocorrências Abertas" value={stats.openOccurrences} icon={<AlertTriangle size={20} color={theme.danger} />} color={theme.danger} />
        </View>

        <Text style={styles.sectionTitle}>Minhas Turmas e Disciplinas</Text>
        {myClasses.length === 0 ? (
          <Card>
            <View style={styles.emptyRow}>
              <CheckCircle size={18} color={theme.success} />
              <Text style={styles.emptyText}>Nenhuma turma atribuída ainda.</Text>
            </View>
          </Card>
        ) : (
          myClasses.map(cs => (
            <Card key={cs.id} style={styles.classCard} padding={14}>
              <View style={styles.classRow}>
                <View style={[styles.classIcon, { backgroundColor: theme.primary + '20' }]}>
                  <GraduationCap size={20} color={theme.primary} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.subjectName}>{(cs as any).subject?.name ?? 'Disciplina'}</Text>
                  <Text style={styles.className}>{(cs as any).class?.name ?? 'Turma'}</Text>
                  <View style={styles.classMeta}>
                    <Badge label={`${(cs as any).class?.year ?? ''}`} variant="neutral" />
                    <Badge label={shiftLabel((cs as any).class?.shift)} variant="info" />
                    <View style={styles.hoursRow}>
                      <Clock size={11} color={theme.textMuted} />
                      <Text style={styles.hoursText}>{cs.weekly_hours}h/sem</Text>
                    </View>
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
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  name: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  institutionChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  institutionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statsRow: { flexDirection: 'row', gap: 12 },
  classCard: {},
  classRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  classIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  classInfo: { flex: 1, gap: 4 },
  subjectName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  className: { fontSize: 13, color: '#374151' },
  classMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hoursText: { fontSize: 11, color: '#6B7280' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  emptyText: { fontSize: 14, color: '#6B7280' },
});
