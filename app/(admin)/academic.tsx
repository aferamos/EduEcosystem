import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { BookOpen, Plus, X, GraduationCap, Users, Layers } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Course, Class, Subject } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

type Tab = 'courses' | 'classes' | 'subjects';

export default function AcademicScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56 + insets.bottom;
  const [tab, setTab] = useState<Tab>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const institutionId = user?.currentInstitution?.id;

  const loadAll = async () => {
    if (!institutionId) return;
    const [c, cl, s] = await Promise.all([
      supabase.from('courses').select('*').eq('institution_id', institutionId).eq('active', true).order('name'),
      supabase.from('classes').select('*, course:courses(name)').eq('institution_id', institutionId).eq('active', true).order('name'),
      supabase.from('subjects').select('*').eq('institution_id', institutionId).eq('active', true).order('name'),
    ]);
    setCourses(c.data ?? []);
    setClasses(cl.data ?? []);
    setSubjects(s.data ?? []);
  };

  useEffect(() => { loadAll(); }, [institutionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const openModal = () => {
    setForm({});
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    let err = null;

    if (tab === 'courses') {
      if (!form.name) { setError('Nome obrigatório.'); setSaving(false); return; }
      const { error: e } = await supabase.from('courses').insert({
        institution_id: institutionId, name: form.name,
        level: form.level || 'fundamental', duration_years: parseInt(form.duration_years || '1'),
      });
      err = e;
    } else if (tab === 'classes') {
      if (!form.name || !form.year) { setError('Nome e ano são obrigatórios.'); setSaving(false); return; }
      const { error: e } = await supabase.from('classes').insert({
        institution_id: institutionId, name: form.name,
        year: parseInt(form.year), shift: form.shift || 'morning',
        course_id: form.course_id || null,
      });
      err = e;
    } else {
      if (!form.name) { setError('Nome obrigatório.'); setSaving(false); return; }
      const { error: e } = await supabase.from('subjects').insert({
        institution_id: institutionId, name: form.name,
        code: form.code || null, workload_hours: form.workload_hours ? parseInt(form.workload_hours) : null,
      });
      err = e;
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false);
    await loadAll();
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'courses', label: 'Cursos', icon: <GraduationCap size={16} color={tab === 'courses' ? '#FFFFFF' : '#6B7280'} /> },
    { key: 'classes', label: 'Turmas', icon: <Users size={16} color={tab === 'classes' ? '#FFFFFF' : '#6B7280'} /> },
    { key: 'subjects', label: 'Disciplinas', icon: <Layers size={16} color={tab === 'subjects' ? '#FFFFFF' : '#6B7280'} /> },
  ];

  const shiftLabel = (s: string) => ({ morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite', full: 'Integral' }[s] ?? s);
  const levelLabel = (l: string) => ({ fundamental: 'Fund.', medio: 'Médio', superior: 'Superior', tecnico: 'Técnico' }[l] ?? l);

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Gestão Acadêmica</Text>
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, tab === t.key && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
            >
              {t.icon}
              <Text style={[styles.tabText, tab === t.key && { color: '#FFFFFF', fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'courses' && (
          courses.length === 0
            ? <EmptyState icon={<GraduationCap size={28} color="#9CA3AF" />} title="Nenhum curso cadastrado" description="Adicione cursos para organizar as turmas da instituição." />
            : courses.map(c => (
              <Card key={c.id} style={styles.itemCard} padding={14}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.primary + '20' }]}>
                    <GraduationCap size={20} color={theme.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{c.name}</Text>
                    <View style={styles.itemMeta}>
                      <Badge label={levelLabel(c.level)} variant="info" />
                      <Text style={styles.metaText}>{c.duration_years} ano{c.duration_years > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))
        )}

        {tab === 'classes' && (
          classes.length === 0
            ? <EmptyState icon={<Users size={28} color="#9CA3AF" />} title="Nenhuma turma cadastrada" description="Crie turmas e vincule-as a cursos." />
            : classes.map(cl => (
              <Card key={cl.id} style={styles.itemCard} padding={14}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.secondary + '20' }]}>
                    <Users size={20} color={theme.secondary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{cl.name}</Text>
                    <View style={styles.itemMeta}>
                      <Badge label={`${cl.year}`} variant="neutral" />
                      <Badge label={shiftLabel(cl.shift ?? '')} variant="info" />
                      {(cl as any).course?.name && <Text style={styles.metaText}>{(cl as any).course.name}</Text>}
                    </View>
                  </View>
                </View>
              </Card>
            ))
        )}

        {tab === 'subjects' && (
          subjects.length === 0
            ? <EmptyState icon={<Layers size={28} color="#9CA3AF" />} title="Nenhuma disciplina cadastrada" description="Adicione disciplinas para atribuir a turmas e professores." />
            : subjects.map(s => (
              <Card key={s.id} style={styles.itemCard} padding={14}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.success + '20' }]}>
                    <BookOpen size={20} color={theme.success} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{s.name}</Text>
                    <View style={styles.itemMeta}>
                      {s.code && <Badge label={s.code} variant="neutral" />}
                      {s.workload_hours && <Text style={styles.metaText}>{s.workload_hours}h</Text>}
                    </View>
                  </View>
                </View>
              </Card>
            ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: TAB_BAR_HEIGHT + 16, backgroundColor: theme.primary }]}
        onPress={openModal}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {tab === 'courses' ? 'Novo Curso' : tab === 'classes' ? 'Nova Turma' : 'Nova Disciplina'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Input label="Nome *" value={form.name ?? ''}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder={tab === 'courses' ? 'Ex: Ensino Médio' : tab === 'classes' ? 'Ex: 1° Ano A' : 'Ex: Matemática'} />

            {tab === 'courses' && (
              <Input label="Duração (anos)" value={form.duration_years ?? ''}
                onChangeText={v => setForm(f => ({ ...f, duration_years: v }))}
                placeholder="1" keyboardType="numeric" />
            )}
            {tab === 'classes' && (
              <>
                <Input label="Ano Letivo *" value={form.year ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, year: v }))}
                  placeholder="2025" keyboardType="numeric" />
                <Text style={styles.fieldLabel}>Turno</Text>
                <View style={styles.shiftRow}>
                  {['morning','afternoon','evening','full'].map(s => (
                    <TouchableOpacity key={s}
                      onPress={() => setForm(f => ({ ...f, shift: s }))}
                      style={[styles.shiftBtn, form.shift === s && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      <Text style={[styles.shiftText, form.shift === s && { color: '#FFFFFF' }]}>
                        {shiftLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {tab === 'subjects' && (
              <>
                <Input label="Código (opcional)" value={form.code ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, code: v }))}
                  placeholder="MAT" />
                <Input label="Carga Horária (h)" value={form.workload_hours ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, workload_hours: v }))}
                  placeholder="80" keyboardType="numeric" />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Salvar" onPress={handleSave} loading={saving} size="lg" color={theme.primary} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, gap: 14 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  tabs: { flexDirection: 'row', gap: 6 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  list: { padding: 16, gap: 10 },
  itemCard: {},
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: '#6B7280' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  shiftRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  shiftBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  shiftText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  error: { fontSize: 13, color: '#C81E1E', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' },
});
