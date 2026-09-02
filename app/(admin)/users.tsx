import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { UserPlus, Search, User, X, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserRole } from '@/lib/types';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import RoleBadge from '@/components/RoleBadge';
import EmptyState from '@/components/ui/EmptyState';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'professor', label: 'Professor' },
  { value: 'aluno', label: 'Aluno' },
  { value: 'responsavel', label: 'Responsável' },
];

const ROLE_FILTER_OPTIONS = [{ value: '', label: 'Todos' }, ...ROLE_OPTIONS];

interface UserItem {
  id: string;           // perfis_usuario.id
  user_id: string;      // auth user id
  institution_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  profile: { id: string; full_name: string; avatar_url: string | null } | null;
}

interface EditForm {
  full_name: string;
  role: UserRole;
}

export default function UsersScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 56 + insets.bottom;

  const [users, setUsers] = useState<UserItem[]>([]);
  const [filtered, setFiltered] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal de edição
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', role: 'aluno' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const institutionId = user?.currentInstitution?.id;

  const loadUsers = async () => {
    if (!institutionId) return;

    const { data: rolesData, error } = await supabase
      .from('perfis_usuario')
      .select('id, usuario_id, instituicao_id, perfil, ativo, criado_em')
      .eq('instituicao_id', institutionId)
      .order('criado_em', { ascending: false });

    if (error) { console.warn('loadUsers error', error.message); return; }
    if (!rolesData?.length) { setUsers([]); return; }

    const userIds = [...new Set(rolesData.map((r: any) => r.usuario_id))];
    const { data: perfisData } = await supabase
      .from('perfis')
      .select('id, nome_completo, avatar_url')
      .in('id', userIds);

    const perfisMap = new Map((perfisData ?? []).map((p: any) => [p.id, p]));

    const allItems = rolesData.map((r: any) => {
      const perfil = perfisMap.get(r.usuario_id);
      return {
        id: r.id,
        user_id: r.usuario_id,
        institution_id: r.instituicao_id,
        role: r.perfil as UserRole,
        is_active: r.ativo,
        created_at: r.criado_em,
        profile: perfil
          ? { id: perfil.id, full_name: perfil.nome_completo, avatar_url: perfil.avatar_url }
          : null,
      };
    });

    // Deduplicação: se o mesmo usuário tiver múltiplos registros na instituição,
    // mantém apenas o mais recente (último criado)
    const seen = new Map<string, typeof allItems[0]>();
    for (const item of allItems) {
      const existing = seen.get(item.user_id);
      if (!existing || item.created_at > existing.created_at) {
        seen.set(item.user_id, item);
      }
    }
    setUsers([...seen.values()]);
  };

  useEffect(() => { loadUsers(); }, [institutionId]);

  useEffect(() => {
    let result = users;
    if (roleFilter) result = result.filter(u => u.role === roleFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(u => u.profile?.full_name?.toLowerCase().includes(s));
    }
    setFiltered(result);
  }, [users, search, roleFilter]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await supabase
      .from('perfis_usuario')
      .update({ ativo: !currentActive })
      .eq('id', id);
    await loadUsers();
  };

  // Abre modal de edição ao dar duplo toque no avatar
  const openEdit = (ur: UserItem) => {
    setEditTarget(ur);
    setEditForm({
      full_name: ur.profile?.full_name ?? '',
      role: ur.role,
    });
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.full_name.trim()) {
      setEditError('Nome obrigatório.');
      return;
    }
    setEditSaving(true);
    setEditError('');

    // Atualiza nome no perfil
    const { error: perfErr } = await supabase
      .from('perfis')
      .update({ nome_completo: editForm.full_name.trim() })
      .eq('id', editTarget.user_id);

    if (perfErr) {
      setEditError(perfErr.message);
      setEditSaving(false);
      return;
    }

    // Atualiza papel na instituição
    const { error: roleErr } = await supabase
      .from('perfis_usuario')
      .update({ perfil: editForm.role })
      .eq('id', editTarget.id);

    if (roleErr) {
      setEditError(roleErr.message);
      setEditSaving(false);
      return;
    }

    setEditSaving(false);
    setEditTarget(null);
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
          {filtered.length} usuário{filtered.length !== 1 ? 's' : ''} · toque 2x no avatar para editar
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
          filtered.map(ur => (
            <Card key={ur.id} style={styles.userCard} padding={14}>
              <View style={styles.userRow}>
                {/* Duplo toque no avatar abre edição */}
                <TouchableOpacity
                  onPress={() => openEdit(ur)}
                  delayLongPress={300}
                  style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}
                >
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {ur.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{ur.profile?.full_name || 'Sem nome'}</Text>
                  <View style={styles.badgeRow}>
                    <RoleBadge role={ur.role} />
                    <Badge
                      label={ur.is_active ? 'Ativo' : 'Inativo'}
                      variant={ur.is_active ? 'success' : 'danger'}
                    />
                  </View>
                </View>

                <TouchableOpacity onPress={() => handleToggleActive(ur.id, ur.is_active)}>
                  <Text style={{ color: ur.is_active ? '#C81E1E' : '#16A34A', fontWeight: '600' }}>
                    {ur.is_active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: TAB_BAR_HEIGHT + 16, backgroundColor: theme.primary }]}
        onPress={() => router.push('/modal-new-user')}
      >
        <UserPlus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de edição de usuário */}
      <Modal
        visible={editTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditTarget(null)}
      >
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Usuário</Text>
            <TouchableOpacity onPress={() => setEditTarget(null)}>
              <X size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Avatar grande com inicial */}
            <View style={styles.editAvatarWrap}>
              <View style={[styles.editAvatar, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.editAvatarText, { color: theme.primary }]}>
                  {editForm.full_name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            </View>

            <Input
              label="Nome Completo"
              value={editForm.full_name}
              onChangeText={v => setEditForm(f => ({ ...f, full_name: v }))}
              placeholder="Nome do usuário"
              icon={<User size={16} color="#6B7280" />}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Perfil de Acesso
            </Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setEditForm(f => ({ ...f, role: opt.value }))}
                  style={[
                    styles.roleOption,
                    { borderColor: theme.border },
                    editForm.role === opt.value && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <Shield
                    size={14}
                    color={editForm.role === opt.value ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text style={[
                    styles.roleOptionText,
                    { color: theme.textSecondary },
                    editForm.role === opt.value && { color: '#FFFFFF' },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editError ? (
              <Text style={styles.error}>{editError}</Text>
            ) : null}

            <Button
              title="Salvar Alterações"
              onPress={handleSaveEdit}
              loading={editSaving}
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
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
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
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, gap: 16 },
  editAvatarWrap: { alignItems: 'center', paddingVertical: 8 },
  editAvatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  editAvatarText: { fontSize: 30, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, backgroundColor: '#F9FAFB' },
  roleOptionText: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 13, color: '#C81E1E', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, textAlign: 'center' },
});
