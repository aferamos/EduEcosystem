import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  GraduationCap,
  Calendar,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';

interface ReportData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalOccurrences: number;
  openOccurrences: number;
  resolvedOccurrences: number;
  attendanceToday: number;
  recentGrades: number;
  occurrencesByType: Record<string, number>;
}

export default function ReportsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [data, setData] = useState<ReportData>({
    totalStudents: 0, totalTeachers: 0, totalClasses: 0,
    totalOccurrences: 0, openOccurrences: 0, resolvedOccurrences: 0,
    attendanceToday: 0, recentGrades: 0, occurrencesByType: {},
  });
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadData = async () => {
    if (!institutionId) return;
    const today = new Date().toISOString().split('T')[0];

    const [studentsRes, teachersRes, classesRes, occAllRes, occOpenRes, occResolvedRes, attendRes, gradesRes] =
      await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('role', 'aluno').eq('is_active', true),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('role', 'professor').eq('is_active', true),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('active', true),
        supabase.from('occurrences').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId),
        supabase.from('occurrences').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('status', 'open'),
        supabase.from('occurrences').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId).eq('status', 'resolved'),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
        supabase.from('grades').select('id', { count: 'exact', head: true }).eq('status', 'graded').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

    const { data: occTypes } = await supabase
      .from('occurrences')
      .select('type')
      .eq('institution_id', institutionId);

    const byType: Record<string, number> = {};
    (occTypes ?? []).forEach(o => { byType[o.type] = (byType[o.type] ?? 0) + 1; });

    setData({
      totalStudents: studentsRes.count ?? 0,
      totalTeachers: teachersRes.count ?? 0,
      totalClasses: classesRes.count ?? 0,
      totalOccurrences: occAllRes.count ?? 0,
      openOccurrences: occOpenRes.count ?? 0,
      resolvedOccurrences: occResolvedRes.count ?? 0,
      attendanceToday: attendRes.count ?? 0,
      recentGrades: gradesRes.count ?? 0,
      occurrencesByType: byType,
    });
  };

  useEffect(() => { loadData(); }, [institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const typeLabel = (t: string) => ({
    disciplinary: 'Disciplinar', academic: 'Acadêmica',
    behavioral: 'Comportamental', commendation: 'Elogio', observation: 'Observação',
  }[t] ?? t);

  const typeColor = (t: string) => ({
    disciplinary: theme.danger, academic: theme.warning,
    behavioral: theme.warning, commendation: theme.success, observation: theme.secondary,
  }[t] ?? theme.textMuted);

  const maxOcc = Math.max(1, ...Object.values(data.occurrencesByType));

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Relatórios e Indicadores</Text>
        <Text style={styles.headerSub}>Visão consolidada da instituição</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Corpo Escolar</Text>
        <View style={styles.statsRow}>
          <StatCard label="Alunos" value={data.totalStudents} icon={<GraduationCap size={20} color={theme.primary} />} color={theme.primary} />
          <StatCard label="Professores" value={data.totalTeachers} icon={<Users size={20} color={theme.secondary} />} color={theme.secondary} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Turmas Ativas" value={data.totalClasses} icon={<BarChart3 size={20} color={theme.success} />} color={theme.success} />
          <StatCard label="Notas (7 dias)" value={data.recentGrades} icon={<TrendingUp size={20} color={theme.warning} />} color={theme.warning} />
        </View>

        <Text style={styles.sectionTitle}>Frequência Hoje</Text>
        <Card style={styles.attendanceCard}>
          <View style={styles.attendanceRow}>
            <Calendar size={24} color={theme.secondary} />
            <View style={styles.attendanceInfo}>
              <Text style={styles.attendanceValue}>{data.attendanceToday}</Text>
              <Text style={styles.attendanceLabel}>presenças registradas hoje</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Ocorrências</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total" value={data.totalOccurrences} icon={<AlertTriangle size={20} color={theme.warning} />} color={theme.warning} />
          <StatCard label="Em Aberto" value={data.openOccurrences} icon={<TrendingDown size={20} color={theme.danger} />} color={theme.danger} />
        </View>

        {Object.keys(data.occurrencesByType).length > 0 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Ocorrências por Tipo</Text>
            {Object.entries(data.occurrencesByType).map(([type, count]) => (
              <View key={type} style={styles.barRow}>
                <Text style={styles.barLabel}>{typeLabel(type)}</Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    {
                      width: `${(count / maxOcc) * 100}%` as any,
                      backgroundColor: typeColor(type),
                    },
                  ]} />
                </View>
                <Text style={styles.barCount}>{count}</Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.resolutionCard}>
          <Text style={styles.chartTitle}>Taxa de Resolução</Text>
          {data.totalOccurrences > 0 ? (
            <>
              <View style={styles.resolutionBar}>
                <View style={[
                  styles.resolutionFill,
                  {
                    flex: data.resolvedOccurrences,
                    backgroundColor: theme.success,
                  },
                ]} />
                <View style={[
                  styles.resolutionFill,
                  {
                    flex: data.totalOccurrences - data.resolvedOccurrences,
                    backgroundColor: theme.danger + '40',
                  },
                ]} />
              </View>
              <View style={styles.resolutionLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                  <Text style={styles.legendText}>Resolvidas: {data.resolvedOccurrences}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
                  <Text style={styles.legendText}>Em aberto: {data.openOccurrences}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noData}>Nenhuma ocorrência registrada</Text>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  statsRow: { flexDirection: 'row', gap: 12 },
  attendanceCard: { padding: 16 },
  attendanceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  attendanceInfo: {},
  attendanceValue: { fontSize: 28, fontWeight: '700', color: '#111827' },
  attendanceLabel: { fontSize: 13, color: '#6B7280' },
  chartCard: { padding: 16, gap: 12 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 110, fontSize: 12, color: '#374151' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barCount: { width: 28, fontSize: 12, color: '#374151', fontWeight: '700', textAlign: 'right' },
  resolutionCard: { padding: 16, gap: 12 },
  resolutionBar: { height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row' },
  resolutionFill: { height: '100%' },
  resolutionLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#374151' },
  noData: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
});
