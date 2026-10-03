import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Layers, Users, X } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export interface SubjectOption {
  id: string;
  nome: string;
  codigo: string | null;
}

interface TeacherOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  nome: string;
  ano: number;
}

interface ExistingAssignment {
  professor_id: string | null;
  horas_semanais: number;
}

interface Props {
  visible: boolean;
  turma: ClassOption | null;
  subjects: SubjectOption[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function ClassSubjectsModal({
  visible,
  turma,
  subjects,
  canEdit,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const institutionId = user?.currentInstitution?.id;
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [existing, setExisting] = useState<Record<string, ExistingAssignment>>({});
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAssignments = useCallback(async () => {
    if (!visible || !turma || !institutionId) return;
    setLoading(true);
    setError('');

    try {
      const [assignmentResult, teacherResult] = await Promise.all([
        supabase
          .from('turma_disciplinas')
          .select('disciplina_id, professor_id, horas_semanais')
          .eq('turma_id', turma.id),
        supabase
          .from('perfis_usuario')
          .select('usuario_id, perfil_join:perfis!usuario_id(nome_completo)')
          .eq('instituicao_id', institutionId)
          .eq('perfil', 'professor')
          .eq('ativo', true)
          .order('criado_em', { ascending: true }),
      ]);

      if (assignmentResult.error) throw new Error(assignmentResult.error.message);
      if (teacherResult.error) throw new Error(teacherResult.error.message);

      const rows = assignmentResult.data ?? [];
      const nextExisting: Record<string, ExistingAssignment> = {};
      const nextAssignments: Record<string, string | null> = {};
      rows.forEach((row: any) => {
        nextExisting[row.disciplina_id] = {
          professor_id: row.professor_id ?? null,
          horas_semanais: row.horas_semanais ?? 2,
        };
        nextAssignments[row.disciplina_id] = row.professor_id ?? null;
      });

      setExisting(nextExisting);
      setAssignments(nextAssignments);
      setTeachers((teacherResult.data ?? []).map((row: any) => ({
        id: row.usuario_id,
        name: row.perfil_join?.nome_completo?.trim() || 'Professor sem nome',
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as disciplinas da turma.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, turma?.id, visible]);

  useEffect(() => {
    if (visible) void loadAssignments();
  }, [loadAssignments, visible]);

  const selectedIds = Object.keys(assignments);
  const existingIds = Object.keys(existing);
  const hasChanges =
    selectedIds.length !== existingIds.length ||
    selectedIds.some((subjectId) =>
      !existing[subjectId] || existing[subjectId].professor_id !== assignments[subjectId],
    );

  const toggleSubject = (subjectId: string) => {
    if (!canEdit) return;
    setAssignments((current) => {
      const next = { ...current };
      if (subjectId in next) delete next[subjectId];
      else next[subjectId] = null;
      return next;
    });
  };

  const setTeacher = (subjectId: string, teacherId: string | null) => {
    setAssignments((current) => ({ ...current, [subjectId]: teacherId }));
  };

  const saveAssignments = async () => {
    if (!turma || !canEdit) return;
    setSaving(true);
    setError('');

    try {
      const toSave = selectedIds.map((subjectId) => ({
        turma_id: turma.id,
        disciplina_id: subjectId,
        professor_id: assignments[subjectId] ?? null,
        horas_semanais: existing[subjectId]?.horas_semanais ?? 2,
      }));

      if (toSave.length > 0) {
        const { error: saveError } = await supabase
          .from('turma_disciplinas')
          .upsert(toSave, { onConflict: 'turma_id,disciplina_id' });
        if (saveError) throw new Error(saveError.message);
      }

      const removedIds = existingIds.filter((subjectId) => !(subjectId in assignments));
      for (const subjectId of removedIds) {
        const { error: deleteError } = await supabase
          .from('turma_disciplinas')
          .delete()
          .eq('turma_id', turma.id)
          .eq('disciplina_id', subjectId);
        if (deleteError) throw new Error(deleteError.message);
      }

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar os vínculos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: Math.max(insets.top, 18) + 8 }]}>
          <View style={styles.headerTop}>
            <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Layers size={21} color="#FFFFFF" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Disciplinas da turma</Text>
              <Text style={styles.headerSubtitle}>{turma ? `${turma.nome} · ${turma.ano}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Fechar">
              <X size={21} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerDescription}>
            Associe disciplinas e defina o professor responsável por cada uma.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textMuted }]}>Carregando vínculos...</Text>
            </View>
          ) : subjects.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Layers size={25} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhuma disciplina cadastrada</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Cadastre disciplinas antes de associá-las a esta turma.
              </Text>
            </Card>
          ) : (
            <>
              {subjects.map((subject) => {
                const selected = subject.id in assignments;
                const selectedTeacher = assignments[subject.id] ?? null;
                const unknownTeacher = selectedTeacher && !teachers.some((teacher) => teacher.id === selectedTeacher);

                return (
                  <Card
                    key={subject.id}
                    style={[
                      styles.subjectCard,
                      { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border },
                    ]}
                    padding={13}
                  >
                    <TouchableOpacity
                      onPress={() => toggleSubject(subject.id)}
                      disabled={!canEdit}
                      style={styles.subjectHeading}
                    >
                      <View style={[
                        styles.checkbox,
                        { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : theme.surface },
                      ]}>
                        {selected ? <Check size={14} color="#FFFFFF" /> : null}
                      </View>
                      <View style={styles.subjectInfo}>
                        <Text style={[styles.subjectName, { color: theme.text }]}>{subject.nome}</Text>
                        {subject.codigo ? <Text style={[styles.subjectCode, { color: theme.textMuted }]}>{subject.codigo}</Text> : null}
                      </View>
                      {selected ? <Users size={17} color={theme.primary} /> : null}
                    </TouchableOpacity>

                    {selected ? (
                      <View style={[styles.teacherSection, { borderTopColor: theme.border }]}>
                        <Text style={[styles.teacherLabel, { color: theme.textSecondary }]}>Professor responsável</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teacherOptions}>
                          <TeacherChip
                            label="Sem professor"
                            selected={selectedTeacher === null}
                            disabled={!canEdit}
                            theme={theme}
                            onPress={() => setTeacher(subject.id, null)}
                          />
                          {unknownTeacher ? (
                            <TeacherChip
                              label="Professor inativo"
                              selected
                              disabled
                              theme={theme}
                              onPress={() => undefined}
                            />
                          ) : null}
                          {teachers.map((teacher) => (
                            <TeacherChip
                              key={teacher.id}
                              label={teacher.name}
                              selected={selectedTeacher === teacher.id}
                              disabled={!canEdit}
                              theme={theme}
                              onPress={() => setTeacher(subject.id, teacher.id)}
                            />
                          ))}
                        </ScrollView>
                        {teachers.length === 0 ? (
                          <Text style={[styles.noTeachers, { color: theme.textMuted }]}>
                            Não há professores ativos cadastrados nesta instituição.
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </Card>
                );
              })}

              {!canEdit ? (
                <Text style={[styles.readOnlyHint, { color: theme.textMuted }]}>
                  Apenas administradores podem alterar os vínculos acadêmicos.
                </Text>
              ) : null}
            </>
          )}

          {canEdit && subjects.length > 0 ? (
            <Button
              title="Salvar vínculos"
              onPress={saveAssignments}
              loading={saving}
              disabled={loading || !hasChanges}
              size="lg"
              color={theme.primary}
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TeacherChip({
  label,
  selected,
  disabled,
  theme,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.teacherChip,
        { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary + '12' : theme.surface },
      ]}
    >
      <Text style={[styles.teacherChipText, { color: selected ? theme.primary : theme.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  closeButton: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, marginTop: 15 },
  content: { padding: 16, gap: 12 },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 11 },
  errorText: { color: '#991B1B', fontSize: 12, lineHeight: 17 },
  loading: { paddingVertical: 35, alignItems: 'center', gap: 9 },
  loadingText: { fontSize: 12 },
  emptyCard: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 13 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { textAlign: 'center', fontSize: 12, lineHeight: 17 },
  subjectCard: { borderWidth: 1, borderRadius: 12, gap: 12 },
  subjectHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 14, fontWeight: '700' },
  subjectCode: { fontSize: 11, marginTop: 2 },
  teacherSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  teacherLabel: { fontSize: 12, fontWeight: '700' },
  teacherOptions: { gap: 7, paddingRight: 8 },
  teacherChip: { maxWidth: 190, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 },
  teacherChipText: { fontSize: 11, fontWeight: '600' },
  noTeachers: { fontSize: 11, lineHeight: 16 },
  readOnlyHint: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});