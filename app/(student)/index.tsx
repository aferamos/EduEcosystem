import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen, CalendarCheck, Bell, TrendingUp, Calendar, AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const [stats, setStats] = useState({
    gradeAvg: null as number | null,
    attendancePct: null as number | null,
    unreadNotifications: 0,
    upcomingAssessments: 0,
  });
  const [recentComms, setRecentComms] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadData = async () => {
    if (!user?.id || !institutionId) return;

    const today = new Date().toISOString().split('T')[0];

    const [notifRes, assessRes, commsRes, eventsRes] = await Promise.all([
      // Tabela real `notificacoes`
      supabase.from('notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', user.id)
        .eq('lida', false),
      // Tabela real `avaliacoes`
      supabase.from('avaliacoes')
        .select('id', { count: 'exact', head: true })
        .gte('data', today),
      // Tabela real `comunicados`
      supabase.from('comunicados')
        .select('*')
        .eq('instituicao_id', institutionId)
        .order('publicado_em', { ascending: false })
        .limit(3),
      // Tabela real `eventos`
      supabase.from('eventos')
        .select('*')
        .eq('instituicao_id', institutionId)
        .gte('data_evento', today)
        .order('data_evento')
        .limit(3),
    ]);

    // Notas via tabela real `notas`
    const { data: notasData } = await supabase
      .from('notas')
      .select('nota')
      .eq('aluno_id', user.id)
      .eq('situacao', 'lancada');

    // Frequência via tabela real `frequencias`
    const { data: freqData } = await supabase
      .from('frequencias')
      .select('situacao')
      .eq('aluno_id', user.id);

    const notas = (notasData ?? []).map((n: any) => n.nota).filter((s: any) => s !== null) as number[];
    const gradeAvg = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;

    const freqAll = freqData?.length ?? 0;
    const freqPresent = (freqData ?? []).filter((a: any) => a.situacao === 'presente' || a.situacao === 'atraso').length;
    const attendancePct = freqAll > 0 ? Math.round((freqPresent / freqAll) * 100) : null;

    setStats({
      gradeAvg: gradeAvg !== null ? parseFloat(gradeAvg.toFixed(1)) : null,
      attendancePct,
      unreadNotifications: notifRes.count ?? 0,
      upcomingAssessments: assessRes.count ?? 0,
    });

    setRecentComms((commsRes.data ?? []).map((c: any) => ({
      id: c.id,
      title: c.titulo,
      message: c.mensagem,
      pinned: c.fixado,
      published_at: c.publicado_em,
    })));

    setUpcomingEvents((eventsRes.data ?? []).map((e: any) => ({
      id: e.id,
      title: e.titulo,
      description: e.descricao,
      event_date: e.data_evento,
    })));
  };

  useEffect(() => { loadData(); }, [user?.id, institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const gradeColor = (avg: number | null) => {
    if (avg === null) return theme.textMuted;
    if (avg >= 7) return theme.success;
    if (avg >= 5) return theme.warning;
    return theme.danger;
  };

  const attendColor = (pct: number | null) => {
    if (pct === null) return theme.textMuted;
    if (pct >= 75) return theme.success;
    if (pct >= 60) return theme.warning;
    return theme.danger;
  };

  const greeting = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.profile.full_name?.split(' ')[0] ?? 'Aluno'}</Text>
          </View>
          <TouchableOpacity onPress={() => signOut()} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.institutionChip}>
          <Text style={styles.institutionText}>{user?.currentInstitution?.name ?? 'Escola'}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryCards}>
          <Card style={[styles.summaryCard, { borderTopColor: gradeColor(stats.gradeAvg) }]} padding={14}>
            <View style={[styles.summaryIcon, { backgroundColor: gradeColor(stats.gradeAvg) + '20' }]}>
              <TrendingUp size={20} color={gradeColor(stats.gradeAvg)} />
            </View>
            <Text style={[styles.summaryValue, { color: gradeColor(stats.gradeAvg) }]}>
              {stats.gradeAvg !== null ? stats.gradeAvg.toFixed(1) : '–'}
            </Text>
            <Text style={styles.summaryLabel}>Média Geral</Text>
          </Card>

          <Card style={[styles.summaryCard, { borderTopColor: attendColor(stats.attendancePct) }]} padding={14}>
            <View style={[styles.summaryIcon, { backgroundColor: attendColor(stats.attendancePct) + '20' }]}>
              <CalendarCheck size={20} color={attendColor(stats.attendancePct)} />
            </View>
            <Text style={[styles.summaryValue, { color: attendColor(stats.attendancePct) }]}>
              {stats.attendancePct !== null ? `${stats.attendancePct}%` : '–'}
            </Text>
            <Text style={styles.summaryLabel}>Frequência</Text>
          </Card>

          <Card style={[styles.summaryCard, { borderTopColor: theme.warning }]} padding={14}>
            <View style={[styles.summaryIcon, { backgroundColor: theme.warning + '20' }]}>
              <BookOpen size={20} color={theme.warning} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.warning }]}>{stats.upcomingAssessments}</Text>
            <Text style={styles.summaryLabel}>Avaliações</Text>
          </Card>

          <Card style={[styles.summaryCard, { borderTopColor: theme.primary }]} padding={14}>
            <View style={[styles.summaryIcon, { backgroundColor: theme.primary + '20' }]}>
              <Bell size={20} color={theme.primary} />
            </View>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>{stats.unreadNotifications}</Text>
            <Text style={styles.summaryLabel}>Avisos</Text>
          </Card>
        </View>

        {stats.attendancePct !== null && stats.attendancePct < 75 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertRow}>
              <AlertTriangle size={18} color={theme.warning} />
              <Text style={styles.alertText}>
                Atenção: sua frequência ({stats.attendancePct}%) está abaixo do mínimo de 75%.
              </Text>
            </View>
          </Card>
        )}

        {recentComms.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Comunicados Recentes</Text>
            {recentComms.map(comm => (
              <Card key={comm.id} style={styles.commCard} padding={14}>
                {comm.pinned && <Badge label="Fixado" variant="warning" />}
                <Text style={styles.commTitle}>{comm.title}</Text>
                <Text style={styles.commMsg} numberOfLines={2}>{comm.message}</Text>
                <Text style={styles.commDate}>
                  {new Date(comm.published_at).toLocaleDateString('pt-BR')}
                </Text>
              </Card>
            ))}
          </>
        )}

        {upcomingEvents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Próximos Eventos</Text>
            {upcomingEvents.map(evt => (
              <Card key={evt.id} style={styles.eventCard} padding={14}>
                <View style={styles.eventRow}>
                  <View style={[styles.eventDate, { backgroundColor: theme.primary }]}>
                    <Text style={styles.eventDay}>
                      {new Date(evt.event_date + 'T12:00:00').getDate()}
                    </Text>
                    <Text style={styles.eventMonth}>
                      {new Date(evt.event_date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    {evt.description && <Text style={styles.eventDesc}>{evt.description}</Text>}
                  </View>
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
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  name: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  institutionChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  institutionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  summaryCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { width: '47%', borderTopWidth: 3, alignItems: 'center', gap: 6 },
  summaryIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  alertCard: { borderLeftWidth: 4, borderLeftColor: '#C27803', backgroundColor: '#FFFBEB' },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  alertText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  commCard: { gap: 6 },
  commTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  commMsg: { fontSize: 13, color: '#374151', lineHeight: 18 },
  commDate: { fontSize: 11, color: '#9CA3AF' },
  eventCard: {},
  eventRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  eventDate: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  eventDay: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  eventMonth: { fontSize: 10, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  eventDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
