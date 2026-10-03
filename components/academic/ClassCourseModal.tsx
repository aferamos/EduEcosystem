import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, GraduationCap, X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface CourseOption {
  id: string;
  nome: string;
}

interface ClassOption {
  id: string;
  nome: string;
  curso_id: string | null;
}

interface Props {
  visible: boolean;
  turma: ClassOption | null;
  courses: CourseOption[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function ClassCourseModal({
  visible,
  turma,
  courses,
  canEdit,
  onClose,
  onSaved,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedCourseId(turma?.curso_id ?? '');
      setError('');
    }
  }, [turma?.id, turma?.curso_id, visible]);

  const changed = (turma?.curso_id ?? '') !== selectedCourseId;

  const saveCourse = async () => {
    if (!turma || !canEdit || !changed) return;
    setSaving(true);
    setError('');

    try {
      const { data, error: updateError } = await supabase
        .from('turmas')
        .update({ curso_id: selectedCourseId || null })
        .eq('id', turma.id)
        .select('id')
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);
      if (!data) throw new Error('Nenhuma alteração foi salva. Verifique se sua conta pode editar esta turma.');

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível vincular o curso à turma.');
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
            <View style={styles.headerIcon}><GraduationCap size={21} color="#FFFFFF" /></View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Curso da turma</Text>
              <Text style={styles.headerSubtitle}>{turma?.nome ?? ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Fechar">
              <X size={21} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerDescription}>Selecione o curso ao qual esta turma pertence.</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]}>
          {error ? (
            <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cursos disponíveis</Text>
          <TouchableOpacity
            onPress={() => canEdit && setSelectedCourseId('')}
            disabled={!canEdit}
            style={[
              styles.option,
              { borderColor: selectedCourseId === '' ? theme.primary : theme.border, backgroundColor: theme.surface },
            ]}
          >
            <View style={[styles.radio, { borderColor: selectedCourseId === '' ? theme.primary : theme.border }]}>
              {selectedCourseId === '' ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
            </View>
            <Text style={[styles.optionText, { color: theme.text }]}>Sem curso vinculado</Text>
            {selectedCourseId === '' ? <Check size={16} color={theme.primary} /> : null}
          </TouchableOpacity>

          {courses.map((course) => {
            const selected = selectedCourseId === course.id;
            return (
              <TouchableOpacity
                key={course.id}
                onPress={() => canEdit && setSelectedCourseId(course.id)}
                disabled={!canEdit}
                style={[
                  styles.option,
                  { borderColor: selected ? theme.primary : theme.border, backgroundColor: theme.surface },
                ]}
              >
                <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                </View>
                <Text style={[styles.optionText, { color: theme.text }]}>{course.nome}</Text>
                {selected ? <Check size={16} color={theme.primary} /> : null}
              </TouchableOpacity>
            );
          })}

          {courses.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Cadastre um curso antes de vincular esta turma.</Text>
            </Card>
          ) : null}

          {!canEdit ? (
            <Text style={[styles.readOnlyHint, { color: theme.textMuted }]}>
              Apenas administradores podem alterar os vínculos acadêmicos.
            </Text>
          ) : null}

          {canEdit ? (
            <Button
              title="Salvar curso"
              onPress={saveCourse}
              loading={saving}
              disabled={!changed}
              size="lg"
              color={theme.primary}
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  closeButton: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  headerDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18, marginTop: 15 },
  content: { padding: 16, gap: 11 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9 },
  radio: { width: 19, height: 19, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 13, fontWeight: '600' },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 11 },
  errorText: { color: '#991B1B', fontSize: 12, lineHeight: 17 },
  emptyCard: { borderWidth: 1, borderRadius: 11 },
  emptyText: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  readOnlyHint: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});