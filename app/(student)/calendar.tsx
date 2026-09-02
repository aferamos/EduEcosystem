import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
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

    // Busca matrículas
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('turma_id')
      .eq('aluno_id', user.id)
      .eq('situacao', 'ativo');

    const turmaIds = (matriculas ?? []).map((m: any) => m.turma_id);

    // Busca turma_disciplinas
    let tdIds: string[] = [];
    if (turmaIds.length > 0) {
      const { data: tds } = await supabase
        .from('turma_disciplinas')
        .select('id')
        .in('turma_id', turmaIds);
      tdIds = (tds ?? []).map((td: any) => td.id);
    }

    const [eventsRes, assessmentsRes] = await Promise.all([
      // Tabela real `eventos` com colunas PT
      supabase.from('eventos')
        .select('*')
        .eq('instituicao_id', institutionId)
        .gte('data_evento', today)
        .order('data_evento')
        .limit(30),
      tdIds.length > 0
        ? supabase.from('avaliacoes')
            .select('*, turma_disciplina:turma_disciplinas(*, disciplina:disciplinas(nome))')
            .in('turma_disciplina_id', tdIds)
            .gte('data', today)
            .order('data')
            .limit(30)
        : Promise.resolve({ data: [] }),
    ]);

    const calItems: CalendarItem[] = [
      ...(eventsRes.data ?? []).map((e: any) => ({
        date: e.data_evento,
        type: 'event' as const,
        title: e.titulo,
        eventType: e.tipo,
      })),
      ...(assessmentsRes.data ?? []).filter((a: any) => a.data).map((a: any) => ({
        date: a.data,
        type: 'assessment' as const,
        title: a.titulo,
        subjectName: a.turma_disciplina?.disciplina?.nome,
        assessmentType: a.tipo,
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
    feriado: { variant: 'success', label: 'Feriado' },
    avaliacao: { variant: 'danger', label: 'Avaliação' },
    reuniao: { variant: 'warning', label: 'Reunião' },
    atividade: { variant: 'info', label: 'Atividade' },
    geral: { variant: 'neutral', label: 'Evento' },
    prova: { variant: 'danger', label: 'Prova' },
    teste: { variant: 'danger', label: 'Teste' },
    trabalho: { variant: 'warning', label: 'Trabalho' },
    projeto: { variant: 'warning', label: 'Projeto' },
    quiz: { variant: 'info', label: 'Quiz' },
    recuperacao: { variant: 'neutral', label: 'Recuperação' },
  };

  const isToday = (date: string) => date === new Date().toISOString().split('T')[0];
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
                  ? (typeConfig[item.assessmentType ?? ''] ?? typeConfig.geral)
                  : (typeConfig[item.eventType ?? ''] ?? typeConfig.geral);
                return (
                  <Card key={idx} style={[
                    styles.itemCard,
                    item.type === 'assessment' && {
                      borderLeftWidth: 4,
                      borderLeftColor: cfg.variant === 'danger' ? theme.danger : cfg.variant === 'warning' ? theme.warning : theme.secondary,
                    },
                  ]} padding={14}>
                    <View style={styles.itemHeader}>
                      <Badge label={cfg.label} variant={cfg.variant} />
                      {item.subjectName && <Text style={styles.itemSubject}>{item.subjectName}</Text>}
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
