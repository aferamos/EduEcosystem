import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { BookOpen, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface SubjectGrades {
  subjectName: string;
  classSubjectId: string;
  grades: { title: string; score: number | null; maxScore: number; type: string; date: string | null }[];
  average: number | null;
  status: 'approved' | 'recovery' | 'failed' | 'in_progress';
}

export default function StudentGrades() {
  const { user } = useAuth();
  const theme = useTheme();
  const [subjectData, setSubjectData] = useState<SubjectGrades[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGrades = async () => {
    if (!user?.id) return;

    // Busca matrículas via tabela real `matriculas`
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('turma_id')
      .eq('aluno_id', user.id)
      .eq('situacao', 'ativo');

    const turmaIds = (matriculas ?? []).map((m: any) => m.turma_id);
    if (turmaIds.length === 0) { setSubjectData([]); return; }

    // Busca turma_disciplinas
    const { data: turmaDiscs } = await supabase
      .from('turma_disciplinas')
      .select('*, disciplina:disciplinas(nome)')
      .in('turma_id', turmaIds);

    if (!turmaDiscs || turmaDiscs.length === 0) { setSubjectData([]); return; }

    const tdIds = turmaDiscs.map((td: any) => td.id);

    // Busca avaliações
    const { data: avaliacoes } = await supabase
      .from('avaliacoes')
      .select('*')
      .in('turma_disciplina_id', tdIds);

    const avaliacaoIds = (avaliacoes ?? []).map((a: any) => a.id);

    let notasData: any[] = [];
    if (avaliacaoIds.length > 0) {
      const { data } = await supabase
        .from('notas')
        .select('*')
        .eq('aluno_id', user.id)
        .in('avaliacao_id', avaliacaoIds);
      notasData = data ?? [];
    }

    const notaMap: Record<string, any> = {};
    notasData.forEach(n => { notaMap[n.avaliacao_id] = n; });

    const result: SubjectGrades[] = turmaDiscs.map((td: any) => {
      const tdAvaliacoes = (avaliacoes ?? []).filter((a: any) => a.turma_disciplina_id === td.id);
      const gradedItems = tdAvaliacoes.map((a: any) => ({
        title: a.titulo,
        score: notaMap[a.id]?.nota ?? null,
        maxScore: a.nota_maxima,
        type: a.tipo,
        date: a.data,
      }));

      const scored = gradedItems.filter(g => g.score !== null);
      const avg = scored.length > 0
        ? scored.reduce((sum, g) => sum + (g.score! / g.maxScore) * 10, 0) / scored.length
        : null;

      const status: SubjectGrades['status'] =
        avg === null ? 'in_progress'
        : avg >= 7 ? 'approved'
        : avg >= 5 ? 'recovery'
        : 'failed';

      return {
        subjectName: td.disciplina?.nome ?? 'Disciplina',
        classSubjectId: td.id,
        grades: gradedItems,
        average: avg !== null ? parseFloat(avg.toFixed(1)) : null,
        status,
      };
    });

    setSubjectData(result);
  };

  useEffect(() => { loadGrades(); }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGrades();
    setRefreshing(false);
  };

  const avgColor = (avg: number | null) => {
    if (avg === null) return theme.textMuted;
    if (avg >= 7) return theme.success;
    if (avg >= 5) return theme.warning;
    return theme.danger;
  };

  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    approved: { label: 'Aprovado', variant: 'success' },
    recovery: { label: 'Recuperação', variant: 'warning' },
    failed: { label: 'Reprovado', variant: 'danger' },
    in_progress: { label: 'Em Andamento', variant: 'neutral' },
  };

  const typeLabel = (t: string) => ({ prova: 'P', teste: 'T', trabalho: 'Tr', projeto: 'Pr', quiz: 'Q', recuperacao: 'R' }[t] ?? 'A');

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Boletim Escolar</Text>
        <Text style={styles.headerSub}>Notas e médias por disciplina</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {subjectData.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} color="#9CA3AF" />}
            title="Sem notas registradas"
            description="Suas notas aparecerão aqui quando os professores lançarem as avaliações."
          />
        ) : (
          subjectData.map(sd => {
            const cfg = statusConfig[sd.status];
            return (
              <Card key={sd.classSubjectId} style={styles.subjectCard}>
                <View style={styles.subjectHeader}>
                  <View style={styles.subjectHeaderLeft}>
                    <Text style={styles.subjectName}>{sd.subjectName}</Text>
                    <Badge label={cfg.label} variant={cfg.variant} />
                  </View>
                  <View style={[styles.avgBadge, { borderColor: avgColor(sd.average) }]}>
                    <Text style={[styles.avgValue, { color: avgColor(sd.average) }]}>
                      {sd.average !== null ? sd.average.toFixed(1) : '–'}
                    </Text>
                    <Text style={styles.avgLabel}>média</Text>
                  </View>
                </View>

                {sd.average !== null && (
                  <View style={styles.progressBar}>
                    <View style={[
                      styles.progressFill,
                      { width: `${Math.min(100, (sd.average / 10) * 100)}%` as any, backgroundColor: avgColor(sd.average) },
                    ]} />
                    <View style={[styles.progressMark, { left: '70%' as any }]} />
                  </View>
                )}

                {sd.grades.length > 0 && (
                  <View style={styles.gradesGrid}>
                    {sd.grades.map((g, i) => (
                      <View key={i} style={styles.gradeItem}>
                        <Text style={styles.gradeType}>{typeLabel(g.type)}</Text>
                        <Text style={[styles.gradeScore, { color: avgColor(g.score !== null ? (g.score / g.maxScore) * 10 : null) }]}>
                          {g.score !== null ? g.score : '–'}
                        </Text>
                        <Text style={styles.gradeMax}>/{g.maxScore}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        )}

        {subjectData.length > 0 && (
          <Card style={styles.summaryCard} padding={16}>
            <View style={styles.summaryRow}>
              <TrendingUp size={20} color={theme.primary} />
              <Text style={styles.summaryTitle}>Média Geral</Text>
              <Text style={[styles.overallAvg, { color: avgColor(
                subjectData.filter(s => s.average !== null).length > 0
                  ? subjectData.filter(s => s.average !== null).reduce((sum, s) => sum + s.average!, 0) / subjectData.filter(s => s.average !== null).length
                  : null
              ) }]}>
                {subjectData.filter(s => s.average !== null).length > 0
                  ? (subjectData.filter(s => s.average !== null).reduce((sum, s) => sum + s.average!, 0) / subjectData.filter(s => s.average !== null).length).toFixed(1)
                  : '–'}
              </Text>
            </View>
            <View style={styles.statusSummary}>
              {['approved', 'recovery', 'failed'].map(st => {
                const count = subjectData.filter(s => s.status === st).length;
                return count > 0 ? (
                  <Badge key={st} label={`${count} ${statusConfig[st as keyof typeof statusConfig].label}`} variant={statusConfig[st as keyof typeof statusConfig].variant} size="md" />
                ) : null;
              })}
            </View>
          </Card>
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
  subjectCard: { gap: 12 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  subjectHeaderLeft: { flex: 1, gap: 6 },
  subjectName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  avgBadge: { alignItems: 'center', borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, minWidth: 54 },
  avgValue: { fontSize: 20, fontWeight: '700' },
  avgLabel: { fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase' },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'visible', position: 'relative' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressMark: { position: 'absolute', top: -2, width: 2, height: 12, backgroundColor: '#E5E7EB' },
  gradesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradeItem: { flexDirection: 'row', alignItems: 'baseline', gap: 2, backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  gradeType: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  gradeScore: { fontSize: 15, fontWeight: '700' },
  gradeMax: { fontSize: 11, color: '#9CA3AF' },
  summaryCard: {},
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  summaryTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  overallAvg: { fontSize: 24, fontWeight: '700' },
  statusSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
