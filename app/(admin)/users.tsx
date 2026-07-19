import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  UserPlus,
  Search,
  ChevronDown,
  X,
  Mail,
  User,
  Lock,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserRoleRecord, UserRole } from '@/lib/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import RoleBadge from '@/components/RoleBadge';
import EmptyState from '@/components/ui/EmptyState';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'professor', label: 'Professor' },
  { value: 'aluno', label: 'Aluno' },
  { value: 'responsavel', label: 'Responsável' },
];

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...ROLE_OPTIONS,
];

export default function UsersScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56 + insets.bottom;
  const [users, setUsers] = useState<UserRoleRecord[]>([]);
  const [filtered, setFiltered] = useState<UserRoleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '', email: '', password: '', role: 'aluno' as UserRole,
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadUsers = async () => {
    if (!institutionId) return;
    const { data } = await supabase
      .from('user_roles')
      .select('*, profile:profiles!user_id(*)')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
  };

  useEffect(() => { loadUsers(); }, [institutionId]);

  useEffect(() => {
    let result = users;
    if (roleFilter) result = result.filter(u => u.role === roleFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(u =>
        (u as any).profile?.full_name?.toLowerCase().includes(s)
      );
    }
    setFiltered(result);
  }, [users, search, roleFilter]);

  const handleAddUser = async () => {
    setAddError('');
    if (!addForm.fullName || !addForm.email || !addForm.password) {
      setAddError('Preencha todos os campos.');
      return;
    }
    if (addForm.password.length < 6) {
      setAddError('Senha mínima: 6 caracteres.');
      return;
    }
    setAddLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.admin
      ? ({ data: null, error: new Error('admin not available') })
      : await supabase.auth.signUp({ email: addForm.email, password: addForm.password });

    if (authErr || !authData?.user) {
      setAddError((authErr as any)?.message ?? 'Erro ao criar usuário.');
      setAddLoading(false);
      return;
    }

    const uid = authData.user.id;
    await supabase.from('profiles').upsert({ id: uid, full_name: addForm.fullName });
    await supabase.from('user_roles').upsert({
      user_id: uid, institution_id: institutionId, role: addForm.role,
    });

    setAddLoading(false);
    setShowAddModal(false);
    setAddForm({ fullName: '', email: '', password: '', role: 'aluno' });
    await loadUsers();
  };

  const handleDeactivate = async (roleId: string) => {
    await supabase.from('user_roles').update({ is_active: false }).eq('id', roleId);
    await loadUsers();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Gerenciar Usuários</Text>
        <Text style={styles.headerSub}>
          {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <Search size={16} color="#6B7280" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {ROLE_FILTER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setRoleFilter(opt.value)}
              style={[
                styles.filterChip,
                roleFilter === opt.value && { backgroundColor: theme.primary },
              ]}
            >
              <Text style={[
                styles.filterChipText,
                roleFilter === opt.value && { color: '#FFFFFF' },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<User size={28} color="#9CA3AF" />}
            title="Nenhum usuário encontrado"
            description="Adicione usuários à instituição clicando no botão abaixo."
          />
        ) : (
          filtered.map(ur => {
            const profile = (ur as any).profile;
            return (
              <Card key={ur.id} style={styles.userCard} padding={14}>
                <View style={styles.userRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{profile?.full_name ?? 'Sem nome'}</Text>
                    <RoleBadge role={ur.role} />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeactivate(ur.id)}
                    style={styles.deactivateBtn}
                  >
                    <Text style={styles.deactivateText}>Desativar</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: TAB_BAR_HEIGHT + 16, backgroundColor: theme.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <UserPlus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Usuário</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Input label="Nome Completo" value={addForm.fullName}
              onChangeText={v => setAddForm(f => ({ ...f, fullName: v }))}
              placeholder="Nome do usuário"
              icon={<User size={16} color="#6B7280" />} />
            <Input label="E-mail" value={addForm.email}
              onChangeText={v => setAddForm(f => ({ ...f, email: v }))}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              icon={<Mail size={16} color="#6B7280" />} />
            <Input label="Senha" value={addForm.password}
              onChangeText={v => setAddForm(f => ({ ...f, password: v }))}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              icon={<Lock size={16} color="#6B7280" />} />

            <Text style={styles.roleLabel}>Perfil de Acesso</Text>
            <View style={styles.roleOptions}>
              {ROLE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setAddForm(f => ({ ...f, role: opt.value }))}
                  style={[
                    styles.roleOption,
                    addForm.role === opt.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                >
                  <Shield size={14} color={addForm.role === opt.value ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[
                    styles.roleOptionText,
                    addForm.role === opt.value && { color: '#FFFFFF' },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {addError ? <Text style={styles.error}>{addError}</Text> : null}

            <Button
              title="Adicionar Usuário"
              onPress={handleAddUser}
              loading={addLoading}
              size="lg"
              color={theme.primary}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  controls: { padding: 16, gap: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 14, color: '#111827', borderWidth: 0, backgroundColor: 'transparent' },
  filterRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  list: { padding: 16, gap: 10 },
  userCard: {},
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  deactivateBtn: { padding: 6 },
  deactivateText: { fontSize: 12, color: '#C81E1E', fontWeight: '600' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, gap: 14 },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  roleOptionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  error: { fontSize: 13, color: '#C81E1E', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' },
});
