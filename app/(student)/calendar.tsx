import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { Event, Assessment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface CalendarItem {
  date: string;
  type: 'event' | 'assessment';
  title: string;
  subjectName?: string;
  eventType?: string;
  assessmentType?: string;
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadData = async () => {
    if (!user?.id || !institutionId) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('status', 'active');

    const classIds = (enrollments ?? []).map(e => e.class_id);

    const [eventsRes, assessmentsRes] = await Promise.all([
      supabase.from('events')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('event_date', today)
        .order('event_date')
        .limit(30),
      classIds.length > 0
        ? supabase.from('assessments')
            .select('*, class_subject:class_subjects(*, subject:subjects(name))')
            .in('class_subject_id',
              await supabase.from('class_subjects').select('id').in('class_id', classIds).then(r => (r.data ?? []).map(c => c.id))
            )
            .gte('date', today)
            .order('date')
            .limit(30)
        : Promise.resolve({ data: [] }),
    ]);

    const calItems: CalendarItem[] = [
      ...(eventsRes.data ?? []).map((e: Event) => ({
        date: e.event_date,
        type: 'event' as const,
        title: e.title,
        eventType: e.type,
      })),
      ...(assessmentsRes.data ?? []).filter((a: any) => a.date).map((a: any) => ({
        date: a.date,
        type: 'assessment' as const,
        title: a.title,
        subjectName: a.class_subject?.subject?.name,
        assessmentType: a.type,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    setItems(calItems);
  };

  useEffect(() => { loadData(); }, [user?.id, institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const grouped: Record<string, CalendarItem[]> = {};
  items.forEach(item => {
    if (!grouped[item.date]) grouped[item.date] = [];
    grouped[item.date].push(item);
  });

  const typeConfig: Record<string, { variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral'; label: string }> = {
    holiday: { variant: 'success', label: 'Feriado' },
    exam: { variant: 'danger', label: 'Prova' },
    meeting: { variant: 'warning', label: 'Reunião' },
    activity: { variant: 'info', label: 'Atividade' },
    general: { variant: 'neutral', label: 'Evento' },
    test: { variant: 'danger', label: 'Teste' },
    assignment: { variant: 'warning', label: 'Trabalho' },
    project: { variant: 'warning', label: 'Projeto' },
    quiz: { variant: 'info', label: 'Quiz' },
    recovery: { variant: 'neutral', label: 'Recuperação' },
  };

  const isToday = (date: string) => {
    return date === new Date().toISOString().split('T')[0];
  };

  const isTomorrow = (date: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date === tomorrow.toISOString().split('T')[0];
  };

  const formatDate = (date: string) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Agenda Acadêmica</Text>
        <Text style={styles.headerSub}>Provas, trabalhos e eventos</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} color="#9CA3AF" />}
            title="Agenda vazia"
            description="Não há provas ou eventos nos próximos dias."
          />
        ) : (
          Object.entries(grouped).map(([date, dayItems]) => (
            <View key={date} style={styles.dayGroup}>
              <View style={[styles.dayHeader, isToday(date) && { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.dayLabel, isToday(date) && { color: theme.primary }]}>
                  {formatDate(date)}
                </Text>
                {isToday(date) && <Badge label="Hoje" variant="primary" />}
                {isTomorrow(date) && <Badge label="Amanhã" variant="warning" />}
              </View>
              {dayItems.map((item, idx) => {
                const cfg = item.type === 'assessment'
                  ? (typeConfig[item.assessmentType ?? ''] ?? typeConfig.general)
                  : (typeConfig[item.eventType ?? ''] ?? typeConfig.general);
                return (
                  <Card key={idx} style={[
                    styles.itemCard,
                    item.type === 'assessment' && { borderLeftWidth: 4, borderLeftColor: cfg.variant === 'danger' ? theme.danger : cfg.variant === 'warning' ? theme.warning : theme.secondary },
                  ]} padding={14}>
                    <View style={styles.itemHeader}>
                      <Badge label={cfg.label} variant={cfg.variant} />
                      {item.subjectName && (
                        <Text style={styles.itemSubject}>{item.subjectName}</Text>
                      )}
                    </View>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </Card>
                );
              })}
            </View>
          ))
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
  dayGroup: { gap: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize', flex: 1 },
  itemCard: {},
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  itemSubject: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
});
