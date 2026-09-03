import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Layers3,
  LockKeyhole,
  Plus,
  Power,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface RoleItem {
  id: string | null;
  key: string;
  name: string;
  description: string;
  level: number;
  system: boolean;
  active: boolean;
  memberCount: number;
  permissionCount: number;
}

interface RolePermission {
  recurso: string;
  acao: string;
}

interface AccessUser {
  id: string;
  userId: string;
  name: string;
  role: string;
  active: boolean;
}

interface RoleDraft {
  name: string;
  description: string;
  level: string;
}

type AccessTab = 'roles' | 'users';

const STANDARD_ROLES: Record<string, Omit<RoleItem, 'id' | 'memberCount' | 'permissionCount'>> = {
  super_admin: { key: 'super_admin', name: 'Super Administrador', description: 'Acesso global à plataforma', level: 5, system: true, active: true },
  admin: { key: 'admin', name: 'Administrador da Instituição', description: 'Governança completa da instituição', level: 5, system: true, active: true },
  coordenador: { key: 'coordenador', name: 'Coordenador', description: 'Gestão acadêmica e pedagógica', level: 4, system: true, active: true },
  professor: { key: 'professor', name: 'Professor', description: 'Operação de turmas, notas e frequência', level: 3, system: true, active: true },
  aluno: { key: 'aluno', name: 'Aluno', description: 'Acompanhamento acadêmico individual', level: 1, system: true, active: true },
  responsavel: { key: 'responsavel', name: 'Responsável', description: 'Acompanhamento dos dependentes', level: 2, system: true, active: true },
};

function roleFallback(key: string) {
  return STANDARD_ROLES[key] ?? {
    key,
    name: key.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: 'Papel personalizado da instituição',
    level: 1,
    system: false,
    active: true,
  };
}

function roleKey(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${normalized || 'papel'}_${Date.now().toString(36)}`;
}

function formatPermissionPart(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AccessControlScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const institutionId = user?.currentInstitution?.id;

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [permissionsByRole, setPermissionsByRole] = useState<Record<string, RolePermission[]>>({});
  const [accessTab, setAccessTab] = useState<AccessTab>('roles');
  const [roleSearch, setRoleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit'>('create');
  const [roleDraft, setRoleDraft] = useState<RoleDraft>({ name: '', description: '', level: '1' });
  const [savingRole, setSavingRole] = useState(false);
  const [roleDetailsTarget, setRoleDetailsTarget] = useState<RoleItem | null>(null);

  const [userModalTarget, setUserModalTarget] = useState<AccessUser | null>(null);
  const [userRoleDraft, setUserRoleDraft] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const loadData = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }

    const [
      { data: roleRows, error: roleError },
      { data: membershipRows, error: membershipError },
      { data: globalPermissionRows },
    ] = await Promise.all([
      supabase
        .from('papeis')
        .select('id, chave, nome, descricao, nivel_acesso, sistema, ativo')
        .eq('instituicao_id', institutionId)
        .order('nivel_acesso', { ascending: false })
        .order('nome'),
      supabase
        .from('perfis_usuario')
        .select('id, usuario_id, perfil, ativo, criado_em')
        .eq('instituicao_id', institutionId)
        .order('criado_em', { ascending: false }),
      supabase.from('permissoes_perfil').select('perfil, recurso, acao'),
    ]);

    if (membershipError) {
      setError(membershipError.message);
      setLoading(false);
      return;
    }

    const memberships = membershipRows ?? [];
    const userIds = [...new Set(memberships.map((row: any) => row.usuario_id))];
    const { data: profileRows } = userIds.length
      ? await supabase.from('perfis').select('id, nome_completo').in('id', userIds)
      : { data: [] };
    const profileMap = new Map((profileRows ?? []).map((profile: any) => [profile.id, profile.nome_completo]));

    const uniqueUsers = new Map<string, AccessUser>();
    memberships.forEach((row: any) => {
      if (!uniqueUsers.has(row.usuario_id)) {
        uniqueUsers.set(row.usuario_id, {
          id: row.id,
          userId: row.usuario_id,
          name: profileMap.get(row.usuario_id) || 'Usuário sem nome',
          role: row.perfil,
          active: row.ativo,
        });
      }
    });
    setAccessUsers([...uniqueUsers.values()]);

    const storedRoles = roleError ? [] : (roleRows ?? []);
    const roleKeys = new Set<string>([
      ...storedRoles.map((row: any) => row.chave),
      ...memberships.map((row: any) => row.perfil),
    ]);
    const permissions = globalPermissionRows ?? [];
    const nextPermissionsByRole = permissions.reduce((map: Record<string, RolePermission[]>, permission: any) => {
      if (!map[permission.perfil]) map[permission.perfil] = [];
      map[permission.perfil].push({ recurso: permission.recurso, acao: permission.acao });
      return map;
    }, {});
    setPermissionsByRole(nextPermissionsByRole);

    const roleItems = [...roleKeys].map((key) => {
      const stored = storedRoles.find((row: any) => row.chave === key);
      const fallback = roleFallback(key);
      return {
        id: stored?.id ?? null,
        key,
        name: stored?.nome ?? fallback.name,
        description: stored?.descricao ?? fallback.description,
        level: stored?.nivel_acesso ?? fallback.level,
        system: stored?.sistema ?? fallback.system,
        active: stored?.ativo ?? fallback.active,
        memberCount: memberships.filter((row: any) => row.perfil === key).length,
        permissionCount: permissions.filter((permission: any) => permission.perfil === key).length,
      };
    }).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

    setRoles(roleItems);
    if (selectedRole) {
      const freshRole = roleItems.find((role) => role.key === selectedRole.key);
      if (!freshRole) {
        setSelectedRole(roleItems[0] ?? null);
      } else if (
        freshRole.id !== selectedRole.id ||
        freshRole.name !== selectedRole.name ||
        freshRole.active !== selectedRole.active ||
        freshRole.memberCount !== selectedRole.memberCount
      ) {
        setSelectedRole(freshRole);
      }
    } else {
      setSelectedRole(roleItems[0] ?? null);
    }
    setError(roleError ? 'O catálogo de papéis ainda não está disponível. A visualização dos acessos existentes continua funcionando.' : '');
    setLoading(false);
  }, [institutionId, selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    return query
      ? roles.filter((role) => `${role.name} ${role.description}`.toLowerCase().includes(query))
      : roles;
  }, [roles, roleSearch]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return query
      ? accessUsers.filter((accessUser) => `${accessUser.name} ${accessUser.role}`.toLowerCase().includes(query))
      : accessUsers;
  }, [accessUsers, userSearch]);

  const openCreateRole = () => {
    setRoleModalMode('create');
    setRoleDraft({ name: '', description: '', level: '1' });
    setRoleModalVisible(true);
  };

  const openEditRole = (role: RoleItem) => {
    if (role.system) {
      Alert.alert(
        'Papel protegido',
        'Papéis do sistema não podem ter nome ou nível alterados.',
        [
          { text: 'Fechar', style: 'cancel' },
          { text: 'Consultar papel', onPress: () => setRoleDetailsTarget(role) },
        ],
      );
      return;
    }
    if (!role.id) {
      Alert.alert('Catálogo indisponível', 'A migration do catálogo de papéis precisa estar aplicada para editar este item.');
      return;
    }
    setSelectedRole(role);
    setRoleModalMode('edit');
    setRoleDraft({ name: role.name, description: role.description, level: String(role.level) });
    setRoleModalVisible(true);
  };

  const saveRole = async () => {
    if (!institutionId || !roleDraft.name.trim()) return;
    setSavingRole(true);
    const fields = {
      nome: roleDraft.name.trim(),
      descricao: roleDraft.description.trim() || null,
      nivel_acesso: Math.min(5, Math.max(1, Number(roleDraft.level) || 1)),
    };
    const result = roleModalMode === 'create'
      ? await supabase.from('papeis').insert({
        instituicao_id: institutionId,
        chave: roleKey(roleDraft.name),
        ...fields,
        sistema: false,
        ativo: true,
      })
      : await supabase.from('papeis').update(fields).eq('id', selectedRole?.id);

    setSavingRole(false);
    if (result.error) {
      Alert.alert('Não foi possível salvar o papel', result.error.message);
      return;
    }
    setRoleModalVisible(false);
    await loadData();
  };

  const toggleRole = async (role: RoleItem) => {
    if (role.system) {
      Alert.alert('Papel protegido', 'Papéis do sistema permanecem ativos para garantir o funcionamento básico da instituição.');
      return;
    }
    if (!role.id) {
      Alert.alert('Catálogo indisponível', 'A migration do catálogo de papéis precisa estar aplicada para alterar o status.');
      return;
    }
    const { error: updateError } = await supabase.from('papeis').update({ ativo: !role.active }).eq('id', role.id);
    if (updateError) Alert.alert('Não foi possível atualizar o papel', updateError.message);
    else await loadData();
  };

  const openUserRole = (accessUser: AccessUser) => {
    setUserModalTarget(accessUser);
    setUserRoleDraft(accessUser.role);
  };

  const saveUserRole = async () => {
    if (!userModalTarget || !userRoleDraft) return;
    setSavingUser(true);
    const { error: updateError } = await supabase
      .from('perfis_usuario')
      .update({ perfil: userRoleDraft })
      .eq('id', userModalTarget.id);
    setSavingUser(false);
    if (updateError) {
      Alert.alert('Não foi possível atualizar o acesso', updateError.message);
      return;
    }
    setUserModalTarget(null);
    await loadData();
  };

  const toggleUserStatus = async (accessUser: AccessUser) => {
    const { error: updateError } = await supabase
      .from('perfis_usuario')
      .update({ ativo: !accessUser.active })
      .eq('id', accessUser.id);
    if (updateError) Alert.alert('Não foi possível atualizar o usuário', updateError.message);
    else await loadData();
  };

  const roleDetailsPermissions = roleDetailsTarget
    ? permissionsByRole[roleDetailsTarget.key] ?? []
    : [];

  const activeUsers = accessUsers.filter((accessUser) => accessUser.active).length;
  const inactiveUsers = accessUsers.length - activeUsers;

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando controle de acesso...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: Math.max(insets.top, 18) + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Voltar">
            <ArrowLeft size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Controle de Acesso</Text>
            <Text style={styles.headerSubtitle}>{user?.currentInstitution?.name ?? 'Instituição atual'}</Text>
          </View>
          <View style={styles.headerIcon}><ShieldCheck size={22} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.headerDescription}>
          Administre papéis e usuários autorizados da sua instituição.
        </Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setAccessTab('roles')}
            style={[styles.tabBtn, accessTab === 'roles' && styles.activeTabBtn]}
          >
            <ShieldCheck size={16} color={accessTab === 'roles' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, accessTab === 'roles' && styles.activeTabText]}>
              Papéis institucionais
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAccessTab('users')}
            style={[styles.tabBtn, accessTab === 'users' && styles.activeTabBtn]}
          >
            <Users size={16} color={accessTab === 'users' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, accessTab === 'users' && styles.activeTabText]}>
              Usuários autorizados
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={theme.primary} />}
      >
        {error ? (
          <View style={styles.warningBanner}>
            <CircleHelp size={18} color="#92400E" />
            <Text style={styles.warningText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <StatCard icon={<Users size={19} color={theme.primary} />} value={accessUsers.length} label="Usuários" color={theme.primary} />
          <StatCard icon={<UserCheck size={19} color={theme.success} />} value={activeUsers} label="Ativos" color={theme.success} />
          <StatCard icon={<UserX size={19} color={theme.danger} />} value={inactiveUsers} label="Inativos" color={theme.danger} />
          <StatCard icon={<Layers3 size={19} color="#7C3AED" />} value={roles.length} label="Papéis" color="#7C3AED" />
        </View>

        {accessTab === 'roles' ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderMain}>
                <View style={styles.sectionIcon}><ShieldCheck size={19} color={theme.primary} /></View>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Papéis institucionais</Text>
                  <Text style={styles.sectionDescription}>Consulte e gerencie os grupos de acesso.</Text>
                </View>
              </View>
              <TouchableOpacity onPress={openCreateRole} style={[styles.primaryAction, { backgroundColor: theme.primary }]}>
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Novo papel</Text>
              </TouchableOpacity>
            </View>

            <SearchBox value={roleSearch} onChangeText={setRoleSearch} placeholder="Buscar papel..." theme={theme} />
            <View style={styles.roleList}>
              {filteredRoles.map((role) => (
                <RoleCard
                  key={role.key}
                  role={role}
                  selected={selectedRole?.key === role.key}
                  theme={theme}
                  onSelect={() => setSelectedRole(role)}
                  onEdit={() => openEditRole(role)}
                  onToggle={() => toggleRole(role)}
                />
              ))}
              {!filteredRoles.length ? <Card padding={18}><Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum papel encontrado.</Text></Card> : null}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderMain}>
                <View style={styles.sectionIcon}><Users size={19} color={theme.primary} /></View>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Usuários autorizados</Text>
                  <Text style={styles.sectionDescription}>Consulte e administre os acessos atribuídos.</Text>
                </View>
              </View>
            </View>

            <SearchBox value={userSearch} onChangeText={setUserSearch} placeholder="Buscar usuário..." theme={theme} />
            <Card style={styles.userCardList} padding={0}>
              {filteredUsers.map((accessUser) => {
                const role = roles.find((item) => item.key === accessUser.role);
                const isCurrentUser = accessUser.userId === user?.id;
                return (
                  <View key={accessUser.userId} style={[styles.userRow, { borderBottomColor: theme.border }]}>
                    <View style={[styles.userAvatar, { backgroundColor: theme.primary + '16' }]}><UserRound size={18} color={theme.primary} /></View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.text }]}>{accessUser.name}</Text>
                      <View style={styles.userMetaRow}>
                        <Text style={[styles.userRole, { color: theme.primary }]}>{role?.name ?? accessUser.role}</Text>
                        <View style={[styles.statusDot, { backgroundColor: accessUser.active ? theme.success : theme.danger }]} />
                        <Text style={[styles.userStatus, { color: accessUser.active ? theme.success : theme.danger }]}>{accessUser.active ? 'Ativo' : 'Inativo'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => openUserRole(accessUser)} style={styles.userAction} accessibilityLabel={`Editar acesso de ${accessUser.name}`}>
                      <ChevronRight size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                    {!isCurrentUser ? (
                      <TouchableOpacity onPress={() => toggleUserStatus(accessUser)} style={styles.statusAction}>
                        <Power size={15} color={accessUser.active ? theme.danger : theme.success} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
              {!filteredUsers.length ? <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum usuário autorizado encontrado.</Text> : null}
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={roleModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRoleModalVisible(false)}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <ModalHeader title={roleModalMode === 'create' ? 'Novo papel' : 'Editar papel'} subtitle="Configure os dados do grupo de acesso." onClose={() => setRoleModalVisible(false)} theme={theme} />
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Field label="Nome do papel" value={roleDraft.name} onChangeText={(value) => setRoleDraft((current) => ({ ...current, name: value }))} placeholder="Ex.: Secretaria acadêmica" theme={theme} />
            <Field label="Descrição" value={roleDraft.description} onChangeText={(value) => setRoleDraft((current) => ({ ...current, description: value }))} placeholder="Objetivo deste acesso" multiline theme={theme} />
            <Field label="Nível de acesso (1 a 5)" value={roleDraft.level} onChangeText={(value) => setRoleDraft((current) => ({ ...current, level: value.replace(/[^1-5]/g, '') }))} placeholder="1" keyboardType="number-pad" theme={theme} />
            <Button title="Salvar papel" onPress={saveRole} loading={savingRole} color={theme.primary} size="lg" />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={roleDetailsTarget !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRoleDetailsTarget(null)}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <ModalHeader title="Consultar papel" subtitle="Visualização somente leitura" onClose={() => setRoleDetailsTarget(null)} theme={theme} />
          {roleDetailsTarget ? (
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.detailsHero, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '28' }]}>
                <View style={[styles.detailsHeroIcon, { backgroundColor: theme.primary }]}>
                  <ShieldCheck size={23} color="#FFFFFF" />
                </View>
                <View style={styles.detailsHeroText}>
                  <View style={styles.roleNameRow}>
                    <Text style={[styles.detailsName, { color: theme.text }]}>{roleDetailsTarget.name}</Text>
                    <View style={styles.systemMiniPill}>
                      <LockKeyhole size={11} color="#92400E" />
                      <Text style={styles.systemMiniPillText}>Sistema</Text>
                    </View>
                  </View>
                  <Text style={[styles.detailsDescription, { color: theme.textMuted }]}>
                    {roleDetailsTarget.description}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsStats}>
                <DetailStat label="Nível de acesso" value={`${roleDetailsTarget.level}/5`} theme={theme} />
                <DetailStat label="Usuários" value={String(roleDetailsTarget.memberCount)} theme={theme} />
                <DetailStat label="Permissões" value={String(roleDetailsPermissions.length)} theme={theme} />
              </View>

              <View style={styles.detailsSection}>
                <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>Dados do papel</Text>
                <View style={[styles.detailsDataCard, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                  <DetailRow label="Chave do papel" value={roleDetailsTarget.key} theme={theme} />
                  <DetailRow label="Tipo" value="Papel do sistema" theme={theme} />
                  <DetailRow label="Status" value={roleDetailsTarget.active ? 'Ativo' : 'Inativo'} theme={theme} />
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={[styles.detailsSectionTitle, { color: theme.text }]}>Permissões globais</Text>
                {roleDetailsPermissions.length ? (
                  <View style={styles.permissionList}>
                    {roleDetailsPermissions.map((permission, index) => (
                      <View key={`${permission.recurso}-${permission.acao}-${index}`} style={[styles.permissionRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                        <View style={[styles.permissionIcon, { backgroundColor: theme.primary + '14' }]}>
                          <Check size={15} color={theme.primary} />
                        </View>
                        <View style={styles.permissionText}>
                          <Text style={[styles.permissionName, { color: theme.text }]}>{formatPermissionPart(permission.recurso)}</Text>
                          <Text style={[styles.permissionAction, { color: theme.textMuted }]}>{formatPermissionPart(permission.acao)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.noPermissions, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                    <CircleHelp size={18} color={theme.textMuted} />
                    <Text style={[styles.noPermissionsText, { color: theme.textMuted }]}>Nenhuma permissão global cadastrada para este papel.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      <Modal visible={userModalTarget !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setUserModalTarget(null)}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <ModalHeader title="Papel do usuário" subtitle={userModalTarget?.name ?? 'Usuário autorizado'} onClose={() => setUserModalTarget(null)} theme={theme} />
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Selecione o papel institucional</Text>
            <View style={styles.roleChoiceList}>
              {roles.filter((role) => role.active).map((role) => (
                <TouchableOpacity key={role.key} onPress={() => setUserRoleDraft(role.key)} style={[styles.roleChoice, { borderColor: theme.border }, userRoleDraft === role.key && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}>
                  <View style={[styles.roleChoiceIcon, { backgroundColor: userRoleDraft === role.key ? theme.primary : theme.bg }]}>
                    {userRoleDraft === role.key ? <Check size={15} color="#FFFFFF" /> : <ShieldCheck size={15} color={theme.textMuted} />}
                  </View>
                  <View style={styles.roleChoiceText}>
                    <Text style={[styles.roleChoiceName, { color: theme.text }]}>{role.name}</Text>
                    <Text style={[styles.roleChoiceDescription, { color: theme.textMuted }]}>{role.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Salvar acesso" onPress={saveUserRole} loading={savingUser} color={theme.primary} size="lg" />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SearchBox({ value, onChangeText, placeholder, theme }: { value: string; onChangeText: (value: string) => void; placeholder: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Search size={17} color={theme.textMuted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.textMuted} style={[styles.searchInput, { color: theme.text }]} />
    </View>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return <Card style={styles.statCard} padding={13}><View style={[styles.statIcon, { backgroundColor: color + '14' }]}>{icon}</View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Card>;
}

function RoleCard({ role, selected, theme, onSelect, onEdit, onToggle }: { role: RoleItem; selected: boolean; theme: ReturnType<typeof useTheme>; onSelect: () => void; onEdit: () => void; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.85} style={[styles.roleCard, { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border }, selected && { shadowColor: theme.primary, shadowOpacity: 0.12 }]}>
      <View style={[styles.roleCardIcon, { backgroundColor: selected ? theme.primary : theme.primary + '12' }]}><ShieldCheck size={19} color={selected ? '#FFFFFF' : theme.primary} /></View>
      <View style={styles.roleCardInfo}>
        <View style={styles.roleNameRow}>
          <Text style={[styles.roleName, { color: theme.text }]}>{role.name}</Text>
          {role.system ? <View style={styles.systemMiniPill}><LockKeyhole size={11} color="#92400E" /><Text style={styles.systemMiniPillText}>Sistema</Text></View> : null}
        </View>
        <Text style={[styles.roleDescription, { color: theme.textMuted }]} numberOfLines={1}>{role.description}</Text>
        <View style={styles.roleStats}>
          <Text style={[styles.roleStatText, { color: theme.textSecondary }]}>{role.memberCount} usuário{role.memberCount !== 1 ? 's' : ''}</Text>
          <View style={[styles.statSeparator, { backgroundColor: theme.border }]} />
          <Text style={[styles.roleStatText, { color: theme.textSecondary }]}>{role.permissionCount} permissões globais</Text>
          <View style={[styles.statusBadge, { backgroundColor: role.active ? '#D1FAE5' : '#FEE2E2' }]}><Text style={[styles.statusBadgeText, { color: role.active ? '#065F46' : '#991B1B' }]}>{role.active ? 'Ativo' : 'Inativo'}</Text></View>
        </View>
      </View>
      <View style={styles.roleActions}>
        <TouchableOpacity onPress={onEdit} style={styles.iconAction} accessibilityLabel={`Editar ${role.name}`}><ChevronRight size={16} color={theme.textMuted} /></TouchableOpacity>
        <TouchableOpacity onPress={onToggle} disabled={role.system} style={[styles.iconAction, role.system && styles.disabledAction]} accessibilityLabel={`Alternar ${role.name}`}>
          {role.system ? <LockKeyhole size={15} color={theme.textMuted} /> : <Power size={16} color={role.active ? theme.danger : theme.success} />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ModalHeader({ title, subtitle, onClose, theme }: { title: string; subtitle: string; onClose: () => void; theme: ReturnType<typeof useTheme> }) {
  return <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}><View><Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>{subtitle}</Text></View><TouchableOpacity onPress={onClose}><X size={22} color={theme.text} /></TouchableOpacity></View>;
}

function Field({ label, value, onChangeText, placeholder, theme, multiline, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; theme: ReturnType<typeof useTheme>; multiline?: boolean; keyboardType?: 'default' | 'number-pad' }) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.textMuted} keyboardType={keyboardType} multiline={multiline} style={[styles.fieldInput, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }, multiline && styles.multilineInput]} /></View>;
}

function DetailStat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.detailStat, { backgroundColor: theme.surfaceAlt }]}>
      <Text style={[styles.detailStatValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.detailStatLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailRowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.detailRowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerTitles: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 2 },
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 18 },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 14 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  activeTabBtn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  activeTabText: { color: '#FFFFFF', fontWeight: '700' },
  content: { padding: 16, gap: 16 },
  warningBanner: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 11, padding: 12 },
  warningText: { flex: 1, color: '#92400E', fontSize: 12, lineHeight: 17 },
  statsGrid: { flexDirection: 'row', gap: 9 },
  statCard: { flex: 1, minWidth: 65, gap: 5 },
  statIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { color: '#111827', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  sectionHeaderMain: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { color: '#111827', fontSize: 16, fontWeight: '800' },
  sectionDescription: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 },
  primaryActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  searchBox: { height: 44, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  roleList: { gap: 9 },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 13, padding: 12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 1 },
  roleCardIcon: { width: 39, height: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  roleCardInfo: { flex: 1, minWidth: 0 },
  roleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  roleName: { fontSize: 14, fontWeight: '800' },
  roleDescription: { fontSize: 11, marginTop: 3 },
  roleStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  roleStatText: { fontSize: 10, fontWeight: '600' },
  statSeparator: { width: 3, height: 3, borderRadius: 2 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, marginLeft: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  roleActions: { flexDirection: 'row', gap: 2 },
  iconAction: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  disabledAction: { opacity: 0.65 },
  systemMiniPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  systemMiniPillText: { color: '#92400E', fontSize: 9, fontWeight: '700' },
  userCardList: { overflow: 'hidden' },
  userRow: { minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 13, fontWeight: '700' },
  userMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  userRole: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 5, height: 5, borderRadius: 3, marginLeft: 4 },
  userStatus: { fontSize: 10, fontWeight: '600' },
  userAction: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  statusAction: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  emptyText: { padding: 20, textAlign: 'center', fontSize: 13 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 17, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, marginTop: 3 },
  modalBody: { padding: 20, gap: 17 },
  detailsHero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  detailsHeroIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  detailsHeroText: { flex: 1, minWidth: 0 },
  detailsName: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  detailsDescription: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  detailsStats: { flexDirection: 'row', gap: 9 },
  detailStat: { flex: 1, borderRadius: 11, padding: 11, gap: 3 },
  detailStatValue: { fontSize: 18, fontWeight: '800' },
  detailStatLabel: { fontSize: 10, fontWeight: '600' },
  detailsSection: { gap: 9 },
  detailsSectionTitle: { fontSize: 15, fontWeight: '800' },
  detailsDataCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13 },
  detailRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  detailRowLast: { borderBottomWidth: 0 },
  detailRowLabel: { fontSize: 12 },
  detailRowValue: { fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  permissionList: { gap: 8 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 11, padding: 10 },
  permissionIcon: { width: 29, height: 29, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  permissionText: { flex: 1, gap: 2 },
  permissionName: { fontSize: 13, fontWeight: '700' },
  permissionAction: { fontSize: 11 },
  noPermissions: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 11, padding: 12 },
  noPermissionsText: { flex: 1, fontSize: 12, lineHeight: 17 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  fieldInput: { minHeight: 46, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  multilineInput: { minHeight: 88, textAlignVertical: 'top' },
  roleChoiceList: { gap: 9 },
  roleChoice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 11, padding: 11 },
  roleChoiceIcon: { width: 29, height: 29, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  roleChoiceText: { flex: 1 },
  roleChoiceName: { fontSize: 13, fontWeight: '700' },
  roleChoiceDescription: { fontSize: 11, marginTop: 2 },
});