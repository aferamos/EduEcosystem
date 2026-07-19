import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { CalendarCheck, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { ClassSubject, StudentEnrollment } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

interface StudentAttendance {
  enrollment: StudentEnrollment;
  status: AttendanceStatus | null;
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [myClasses, setMyClasses] = useState<ClassSubject[]>([]);
  const [selectedCS, setSelectedCS] = useState<ClassSubject | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('class_subjects')
      .select('*, subject:subjects(name), class:classes(name, year)')
      .eq('teacher_id', user.id)
      .then(({ data }) => {
        setMyClasses(data ?? []);
        if (data && data.length > 0 && !selectedCS) setSelectedCS(data[0]);
      });
  }, [user?.id]);

  const loadStudents = async () => {
    if (!selectedCS) return;
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('*, profile:profiles!student_id(full_name, avatar_url)')
      .eq('class_id', selectedCS.class_id)
      .eq('status', 'active')
      .order('created_at');

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_subject_id', selectedCS.id)
      .eq('date', date);

    const statusMap: Record<string, AttendanceStatus> = {};
    (existing ?? []).forEach(a => { statusMap[a.student_id] = a.status; });

    setStudents(
      (enrollments ?? []).map(e => ({
        enrollment: e as any,
        status: statusMap[e.student_id] ?? null,
      }))
    );
  };

  useEffect(() => { loadStudents(); }, [selectedCS, date]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s =>
      s.enrollment.student_id === studentId
        ? { ...s, status: s.status === status ? null : status }
        : s
    ));
  };

  const markAll = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const handleSave = async () => {
    if (!selectedCS) return;
    setSaving(true);
    const records = students
      .filter(s => s.status !== null)
      .map(s => ({
        class_subject_id: selectedCS.id,
        student_id: s.enrollment.student_id,
        date,
        status: s.status!,
        recorded_by: user?.id,
      }));

    for (const record of records) {
      await supabase.from('attendance').upsert(record, {
        onConflict: 'class_subject_id,student_id,date',
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statusConfig = {
    present: { icon: <CheckCircle size={18} color="#057A55" />, label: 'P', bg: '#D1FAE5', border: '#057A55' },
    absent: { icon: <XCircle size={18} color="#C81E1E" />, label: 'F', bg: '#FEE2E2', border: '#C81E1E' },
    late: { icon: <Clock size={18} color="#C27803" />, label: 'A', bg: '#FEF3C7', border: '#C27803' },
    justified: { icon: <AlertCircle size={18} color="#0694A2" />, label: 'J', bg: '#E0F2FE', border: '#0694A2' },
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Diário de Chamada</Text>
        <Text style={styles.date}>
          {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.classPicker}
          onPress={() => setShowClassPicker(v => !v)}
        >
          <CalendarCheck size={16} color={theme.primary} />
          <Text style={styles.classPickerText} numberOfLines={1}>
            {selectedCS
              ? `${(selectedCS as any).subject?.name} – ${(selectedCS as any).class?.name}`
              : 'Selecione a turma/disciplina'}
          </Text>
          <ChevronDown size={16} color={theme.textMuted} />
        </TouchableOpacity>

        {showClassPicker && (
          <View style={styles.classDropdown}>
            {myClasses.map(cs => (
              <TouchableOpacity
                key={cs.id}
                style={[styles.classOption, selectedCS?.id === cs.id && { backgroundColor: theme.primary + '10' }]}
                onPress={() => { setSelectedCS(cs); setShowClassPicker(false); }}
              >
                <Text style={styles.classOptionText}>
                  {(cs as any).subject?.name} – {(cs as any).class?.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bulkActions}>
          <Text style={styles.bulkLabel}>Marcar todos:</Text>
          {(['present', 'absent'] as AttendanceStatus[]).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => markAll(s)}
              style={[styles.bulkBtn, { borderColor: statusConfig[s].border }]}
            >
              {statusConfig[s].icon}
              <Text style={[styles.bulkBtnText, { color: statusConfig[s].border }]}>
                {s === 'present' ? 'Presentes' : 'Faltas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {students.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck size={28} color="#9CA3AF" />}
            title="Nenhum aluno encontrado"
            description="Selecione uma turma para registrar a chamada."
          />
        ) : (
          students.map((s, idx) => {
            const profile = (s.enrollment as any).profile;
            return (
              <Card key={s.enrollment.id} style={styles.studentCard} padding={12}>
                <View style={styles.studentRow}>
                  <Text style={styles.studentIdx}>{idx + 1}</Text>
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {profile?.full_name ?? 'Aluno'}
                  </Text>
                  <View style={styles.statusBtns}>
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map(st => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setStatus(s.enrollment.student_id, st)}
                        style={[
                          styles.statusBtn,
                          {
                            backgroundColor: s.status === st ? statusConfig[st].bg : '#F9FAFB',
                            borderColor: s.status === st ? statusConfig[st].border : '#E5E7EB',
                          },
                        ]}
                      >
                        <Text style={[
                          styles.statusBtnText,
                          { color: s.status === st ? statusConfig[st].border : '#9CA3AF' },
                        ]}>
                          {statusConfig[st].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {students.length > 0 && (
        <View style={styles.footer}>
          {saved && (
            <View style={styles.savedRow}>
              <CheckCircle size={16} color={theme.success} />
              <Text style={styles.savedText}>Chamada salva!</Text>
            </View>
          )}
          <Button
            title={`Salvar Chamada (${students.filter(s => s.status !== null).length}/${students.length})`}
            onPress={handleSave}
            loading={saving}
            size="lg"
            color={theme.primary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, gap: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  date: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' },
  controls: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 12, gap: 10 },
  classPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  classPickerText: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  classDropdown: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  classOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  classOptionText: { fontSize: 14, color: '#374151' },
  bulkActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulkLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  bulkBtnText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 12, gap: 8, paddingBottom: 120 },
  studentCard: {},
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentIdx: { width: 22, fontSize: 13, color: '#9CA3AF', textAlign: 'right' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  studentName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  statusBtns: { flexDirection: 'row', gap: 4 },
  statusBtn: { width: 30, height: 30, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  statusBtnText: { fontSize: 11, fontWeight: '700' },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  savedText: { fontSize: 13, color: '#057A55', fontWeight: '600' },
});
