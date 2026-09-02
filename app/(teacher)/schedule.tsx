import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { CalendarDays, Clock, BookOpen } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  tipo: string;
}

export default function ScheduleScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [events, setEvents] = useState<Evento[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadData = async () => {
    if (!institutionId || !user?.id) return;

    const today = new Date().toISOString().split('T')[0];

    // Busca na tabela real `eventos` com colunas PT
    const { data: evts } = await supabase
      .from('eventos')
      .select('*')
      .eq('instituicao_id', institutionId)
      .gte('data_evento', today)
      .order('data_evento')
      .limit(20);

    // Busca na tabela real `turma_disciplinas` com colunas PT
    const { data: cs } = await supabase
      .from('turma_disciplinas')
      .select('*, disciplina:disciplinas(nome), turma:turmas(nome, ano, turno)')
      .eq('professor_id', user.id);

    setEvents(evts ?? []);
    setMyClasses(cs ?? []);
  };

  useEffect(() => { loadData(); }, [institutionId, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const eventTypeConfig: Record<string, { color: string; variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral' }> = {
    feriado: { color: theme.success, variant: 'success' },
    avaliacao: { color: theme.danger, variant: 'danger' },
    reuniao: { color: theme.warning, variant: 'warning' },
    atividade: { color: theme.secondary, variant: 'info' },
    geral: { color: theme.primary, variant: 'neutral' },
  };

  const typeLabel = (t: string) => ({ feriado: 'Feriado', avaliacao: 'Avaliação', reuniao: 'Reunião', atividade: 'Atividade', geral: 'Geral' }[t] ?? t);
  const shiftLabel = (s: string) => ({ manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' }[s] ?? s);

  const groupByDate = (evts: Evento[]) => {
    const groups: Record<string, Evento[]> = {};
    evts.forEach(e => {
      if (!groups[e.data_evento]) groups[e.data_evento] = [];
      groups[e.data_evento].push(e);
    });
    return groups;
  };

  const grouped = groupByDate(events);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Agenda Escolar</Text>
        <Text style={styles.headerSub}>Próximos eventos e compromissos</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Minhas Turmas</Text>
        {myClasses.length === 0 ? (
          <Card>
            <Text style={styles.emptyInline}>Nenhuma turma atribuída.</Text>
          </Card>
        ) : (
          myClasses.map((cs: any) => (
            <Card key={cs.id} style={styles.classCard} padding={14}>
              <View style={styles.classRow}>
                <View style={[styles.classIcon, { backgroundColor: theme.primary + '20' }]}>
                  <BookOpen size={18} color={theme.primary} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.subjectName}>{cs.disciplina?.nome}</Text>
                  <View style={styles.classMeta}>
                    <Text style={styles.className}>{cs.turma?.nome}</Text>
                    <Badge label={shiftLabel(cs.turma?.turno ?? '')} variant="info" />
                    <View style={styles.hoursRow}>
                      <Clock size={11} color={theme.textMuted} />
                      <Text style={styles.hoursText}>{cs.horas_semanais}h/sem</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>Próximos Eventos</Text>
        {Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={28} color="#9CA3AF" />}
            title="Nenhum evento próximo"
            description="Não há eventos agendados para os próximos dias."
          />
        ) : (
          Object.entries(grouped).map(([date, dayEvents]) => (
            <View key={date} style={styles.dayGroup}>
              <Text style={styles.dayLabel}>
                {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long', day: '2-digit', month: 'long',
                })}
              </Text>
              {dayEvents.map(evt => {
                const cfg = eventTypeConfig[evt.tipo] ?? eventTypeConfig.geral;
                return (
                  <Card key={evt.id} style={[styles.eventCard, { borderLeftColor: cfg.color }]} padding={14}>
                    <View style={styles.eventHeader}>
                      <Badge label={typeLabel(evt.tipo)} variant={cfg.variant} />
                    </View>
                    <Text style={styles.eventTitle}>{evt.titulo}</Text>
                    {evt.descricao && <Text style={styles.eventDesc}>{evt.descricao}</Text>}
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
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  classCard: {},
  classRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  classIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  classInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  classMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  className: { fontSize: 12, color: '#374151' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hoursText: { fontSize: 11, color: '#6B7280' },
  dayGroup: { gap: 8 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  eventCard: { borderLeftWidth: 4 },
  eventHeader: { marginBottom: 6 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  eventDesc: { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 18 },
  emptyInline: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
});
