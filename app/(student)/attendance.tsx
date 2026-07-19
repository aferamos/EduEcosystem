import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { CalendarCheck, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface SubjectAttendance {
  subjectName: string;
  total: number;
  present: number;
  absent: number;
  justified: number;
  late: number;
  percentage: number;
}

export default function StudentAttendance() {
  const { user } = useAuth();
  const theme = useTheme();
  const [data, setData] = useState<SubjectAttendance[]>([]);
  const [recentAbsences, setRecentAbsences] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;

    const { data: attData } = await supabase
      .from('attendance')
      .select('*, class_subject:class_subjects(*, subject:subjects(name))')
      .eq('student_id', user.id)
      .order('date', { ascending: false });

    const grouped: Record<string, { subjectName: string; records: any[] }> = {};
    (attData ?? []).forEach(a => {
      const csId = a.class_subject_id;
      if (!grouped[csId]) {
        grouped[csId] = {
          subjectName: (a.class_subject as any)?.subject?.name ?? 'Disciplina',
          records: [],
        };
      }
      grouped[csId].records.push(a);
    });

    const result: SubjectAttendance[] = Object.values(grouped).map(({ subjectName, records }) => {
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const justified = records.filter(r => r.status === 'justified').length;
      const late = records.filter(r => r.status === 'late').length;
      const total = records.length;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
      return { subjectName, total, present, absent, justified, late, percentage };
    });

    const recent = (attData ?? []).filter(a => a.status === 'absent' || a.status === 'justified').slice(0, 10);

    setData(result);
    setRecentAbsences(recent);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pctColor = (pct: number) => {
    if (pct >= 75) return theme.success;
    if (pct >= 60) return theme.warning;
    return theme.danger;
  };

  const overallPct = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.percentage, 0) / data.length)
    : null;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Frequência Escolar</Text>
        <Text style={styles.headerSub}>Acompanhe suas presenças e faltas</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {overallPct !== null && (
          <Card style={styles.overallCard} padding={20}>
            <View style={styles.overallRow}>
              <View>
                <Text style={styles.overallLabel}>Frequência Geral</Text>
                <Text style={[styles.overallValue, { color: pctColor(overallPct) }]}>
                  {overallPct}%
                </Text>
                <Text style={styles.overallSub}>Mínimo exigido: 75%</Text>
              </View>
              <View style={styles.gaugeWrap}>
                <View style={styles.gaugeTrack}>
                  <View style={[
                    styles.gaugeFill,
                    { width: `${overallPct}%` as any, backgroundColor: pctColor(overallPct) },
                  ]} />
                  <View style={[styles.gaugeMark, { left: '75%' as any }]} />
                </View>
              </View>
            </View>
            {overallPct < 75 && (
              <View style={styles.warningRow}>
                <AlertTriangle size={16} color={theme.danger} />
                <Text style={styles.warningText}>Risco de reprovação por falta!</Text>
              </View>
            )}
          </Card>
        )}

        {data.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={28} color="#9CA3AF" />}
            title="Sem registros de frequência"
            description="Suas presenças e faltas aparecerão aqui."
          />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Por Disciplina</Text>
            {data.map(sd => (
              <Card key={sd.subjectName} style={styles.subjectCard} padding={14}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{sd.subjectName}</Text>
                  <Text style={[styles.pctText, { color: pctColor(sd.percentage) }]}>
                    {sd.percentage}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { width: `${sd.percentage}%` as any, backgroundColor: pctColor(sd.percentage) },
                  ]} />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.success }]}>{sd.present}</Text>
                    <Text style={styles.statLabel}>Presentes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.danger }]}>{sd.absent}</Text>
                    <Text style={styles.statLabel}>Faltas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.warning }]}>{sd.late}</Text>
                    <Text style={styles.statLabel}>Atrasos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.secondary }]}>{sd.justified}</Text>
                    <Text style={styles.statLabel}>Justificadas</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {recentAbsences.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Faltas Recentes</Text>
            {recentAbsences.map(a => (
              <Card key={a.id} style={styles.absenceCard} padding={12}>
                <View style={styles.absenceRow}>
                  <Badge
                    label={a.status === 'absent' ? 'Falta' : 'Justificada'}
                    variant={a.status === 'absent' ? 'danger' : 'warning'}
                  />
                  <Text style={styles.absenceSubject}>
                    {(a.class_subject as any)?.subject?.name ?? 'Disciplina'}
                  </Text>
                  <Text style={styles.absenceDate}>
                    {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  overallCard: {},
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  overallLabel: { fontSize: 13, color: '#6B7280' },
  overallValue: { fontSize: 36, fontWeight: '700' },
  overallSub: { fontSize: 11, color: '#9CA3AF' },
  gaugeWrap: { flex: 1 },
  gaugeTrack: { height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'visible', position: 'relative' },
  gaugeFill: { height: '100%', borderRadius: 6 },
  gaugeMark: { position: 'absolute', top: -3, width: 2, height: 18, backgroundColor: '#D1D5DB' },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  warningText: { fontSize: 13, color: '#C81E1E', fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subjectCard: { gap: 10 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  pctText: { fontSize: 18, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, color: '#9CA3AF' },
  absenceCard: {},
  absenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  absenceSubject: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
  absenceDate: { fontSize: 12, color: '#9CA3AF' },
});
