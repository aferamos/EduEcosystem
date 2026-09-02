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
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Layers3,
  LockKeyhole,
  Plus,
  Power,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UserCheck,
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

type PermissionScope = 'own' | 'institution' | 'all';

interface Permission {
  resource: string;
  action: string;
  scope: PermissionScope;
}

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

interface AccessUser {
  id: string;
  userId: string;
  name: string;
  role: string;
  active: boolean;
}

interface DraftRole {
  name: string;
  description: string;
  level: string;
}

const STANDARD_ROLES: Record<string, Omit<RoleItem, 'id' | 'memberCount' | 'permissionCount'>> = {
  super_admin: {
    key: 'super_admin',
    name: 'Super Administrador',
    description: 'Acesso global à plataforma',
    level: 5,
    system: true,
    active: true,
  },
  admin: {
    key: 'admin',
    name: 'Administrador da Instituição',
    description: 'Governança completa da instituição',
    level: 5,
    system: true,
    active: true,
  },
  coordenador: {
    key: 'coordenador',
    name: 'Coordenador',
    description: 'Gestão acadêmica e pedagógica',
    level: 4,
    system: true,
    active: true,
  },
  professor: {
    key: 'professor',
    name: 'Professor',
    description: 'Operação de turmas, notas e frequência',
    level: 3,
    system: true,
    active: true,
  },
  aluno: {
    key: 'aluno',
    name: 'Aluno',
    description: 'Acompanhamento acadêmico individual',
    level: 1,
    system: true,
    active: true,
  },
  responsavel: {
    key: 'responsavel',
    name: 'Responsável',
    description: 'Acompanhamento dos dependentes',
    level: 2,
    system: true,
    active: true,
  },
};

const FALLBACK_PERMISSIONS: Permission[] = [
  { resource: 'dashboard', action: 'read', scope: 'institution' },
  { resource: 'usuarios', action: 'read', scope: 'institution' },
  { resource: 'usuarios', action: 'create', scope: 'institution' },
  { resource: 'usuarios', action: 'update', scope: 'institution' },
  { resource: 'usuarios', action: 'delete', scope: 'institution' },
  { resource: 'papeis', action: 'read', scope: 'institution' },
  { resource: 'papeis', action: 'manage', scope: 'institution' },
  { resource: 'alunos', action: 'read', scope: 'institution' },
  { resource: 'professores', action: 'read', scope: 'institution' },
  { resource: 'turmas', action: 'read', scope: 'institution' },
  { resource: 'turmas', action: 'create', scope: 'institution' },
  { resource: 'notas', action: 'read', scope: 'institution' },
  { resource: 'notas', action: 'update', scope: 'own' },
  { resource: 'frequencia', action: 'read', scope: 'institution' },
  { resource: 'frequencia', action: 'update', scope: 'own' },
  { resource: 'financeiro', action: 'read', scope: 'institution' },
  { resource: 'comunicados', action: 'read', scope: 'institution' },
  { resource: 'relatorios', action: 'export', scope: 'institution' },
  { resource: 'configuracoes', action: 'manage', scope: 'institution' },
];

const RESOURCE_LABELS: Record<string, string> = {
  dashboard: 'Painel',
  usuarios: 'Usuários',
  users: 'Usuários',
  papeis: 'Papéis e permissões',
  permissoes: 'Papéis e permissões',
  roles: 'Papéis e permissões',
  alunos: 'Alunos',
  students: 'Alunos',
  professores: 'Professores',
  teachers: 'Professores',
  turmas: 'Turmas',
  classes: 'Turmas',
  notas: 'Notas',
  grades: 'Notas',
  frequencia: 'Frequência',
  attendance: 'Frequência',
  financeiro: 'Financeiro',
  financial: 'Financeiro',
  comunicados: 'Comunicados',
  announcements: 'Comunicados',
  autorizacoes: 'Autorizações digitais',
  relatorios: 'Relatórios',
  reports: 'Relatórios',
  configuracoes: 'Configurações',
  settings: 'Configurações',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Visualizar',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
  manage: 'Administrar',
  export: 'Exportar',
};

const SCOPE_LABELS: Record<PermissionScope, string> = {
  own: 'Próprio',
  institution: 'Instituição',
  all: 'Todos',
};

function roleFallback(key: string): Omit<RoleItem, 'id' | 'memberCount' | 'permissionCount'> {
  return STANDARD_ROLES[key] ?? {
    key,
    name: key.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    description: 'Papel personalizado da instituição',
    level: 1,
    system: false,
    active: true,
  };
}

function permissionKey(resource: string, action: string) {
  return `${resource}::${action}`;
}

function normalizeKey(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${normalized || 'papel'}_${Date.now().toString(36)}`;
}

export default function AccessControlScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const institutionId = user?.currentInstitution?.id;

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission>>({});
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<'create' | 'edit'>('create');
  const [roleDraft, setRoleDraft] = useState<DraftRole>({ name: '', description: '', level: '1' });
  const [savingRole, setSavingRole] = useState(false);

  const [userModalTarget, setUserModalTarget] = useState<AccessUser | null>(null);
  const [userRoleDraft, setUserRoleDraft] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const loadData = useCallback(async () => {
    if (!institutionId) return;
    setError('');

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
      supabase.from('permissoes_perfil').select('recurso, acao, escopo'),
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

    const usersById = new Map<string, AccessUser>();
    memberships.forEach((row: any) => {
      if (!usersById.has(row.usuario_id)) {
        usersById.set(row.usuario_id, {
          id: row.id,
          userId: row.usuario_id,
          name: profileMap.get(row.usuario_id) || 'Usuário sem nome',
          role: row.perfil,
          active: row.ativo,
        });
      }
    });
    setUsers([...usersById.values()]);

    const globalPermissions: Permission[] = (globalPermissionRows ?? []).map((row: any) => ({
      resource: row.recurso,
      action: row.acao,
      scope: row.escopo,
    }));
    const catalogMap = new Map<string, Permission>();
    [...globalPermissions, ...FALLBACK_PERMISSIONS].forEach((permission) => {
      catalogMap.set(permissionKey(permission.resource, permission.action), permission);
    });
    setPermissionCatalog([...catalogMap.values()]);

    const storedRoles = roleError ? [] : (roleRows ?? []);
    const roleKeys = new Set<string>([
      ...storedRoles.map((row: any) => row.chave),
      ...memberships.map((row: any) => row.perfil),
      ...globalPermissions.map((permission) => permission.resource === 'papeis' ? 'admin' : ''),
    ]);
    roleKeys.delete('');

    let institutionalPermissions: any[] = [];
    const storedRoleIds = storedRoles.map((row: any) => row.id);
    if (storedRoleIds.length) {
      const { data } = await supabase
        .from('permissoes_papel')
        .select('papel_id, recurso, acao, escopo')
        .in('papel_id', storedRoleIds);
      institutionalPermissions = data ?? [];
    }

    const roleItems: RoleItem[] = [...roleKeys].map((key) => {
      const stored = storedRoles.find((row: any) => row.chave === key);
      const fallback = roleFallback(key);
      const memberCount = memberships.filter((row: any) => row.perfil === key).length;
      const permissionCount = stored
        ? institutionalPermissions.filter((permission) => permission.papel_id === stored.id).length
        : globalPermissions.filter((permission) => {
          if (key === 'admin' || key === 'super_admin') return true;
          return permission.resource === key;
        }).length;
      return {
        id: stored?.id ?? null,
        key,
        name: stored?.nome ?? fallback.name,
        description: stored?.descricao ?? fallback.description,
        level: stored?.nivel_acesso ?? fallback.level,
        system: stored?.sistema ?? fallback.system,
        active: stored?.ativo ?? fallback.active,
        memberCount,
        permissionCount,
      };
    }).sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

    setRoles(roleItems);
    if (selectedRole) {
      const freshSelected = roleItems.find((role) => role.key === selectedRole.key);
      if (!freshSelected) {
        setSelectedRole(roleItems[0] ?? null);
      } else if (
        freshSelected.id !== selectedRole.id ||
        freshSelected.name !== selectedRole.name ||
        freshSelected.active !== selectedRole.active ||
        freshSelected.permissionCount !== selectedRole.permissionCount
      ) {
        setSelectedRole(freshSelected);
      }
    } else {
      setSelectedRole(roleItems[0] ?? null);
    }

    if (roleError && !roleRows) {
      setError('A migration do catálogo de papéis ainda não foi aplicada. A visualização legada está disponível, mas salvar alterações exige essa migration.');
    }
    setLoading(false);
  }, [institutionId, selectedRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadRolePermissions = useCallback(async (role: RoleItem | null) => {
    if (!role) {
      setRolePermissions({});
      return;
    }

    let rows: any[] = [];
    let institutionalLoaded = false;
    if (role.id) {
      const { data, error: institutionalError } = await supabase
        .from('permissoes_papel')
        .select('recurso, acao, escopo')
        .eq('papel_id', role.id);
      if (!institutionalError) {
        rows = data ?? [];
        institutionalLoaded = true;
      }
    }
    if (!institutionalLoaded) {
      const { data } = await supabase
        .from('permissoes_perfil')
        .select('recurso, acao, escopo')
        .eq('perfil', role.key);
      rows = data ?? [];
    }
    const next: Record<string, Permission> = {};
    rows.forEach((row) => {
      next[permissionKey(row.recurso, row.acao)] = {
        resource: row.recurso,
        action: row.acao,
        scope: row.escopo,
      };
    });
    setRolePermissions(next);
  }, []);

  useEffect(() => {
    loadRolePermissions(selectedRole);
  }, [selectedRole, loadRolePermissions]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    return query
      ? roles.filter((role) => `${role.name} ${role.description}`.toLowerCase().includes(query))
      : roles;
  }, [roles, roleSearch]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return query
      ? users.filter((accessUser) => `${accessUser.name} ${accessUser.role}`.toLowerCase().includes(query))
      : users;
  }, [users, userSearch]);

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    permissionCatalog.forEach((permission) => {
      const current = groups.get(permission.resource) ?? [];
      if (!current.some((item) => item.action === permission.action)) current.push(permission);
      groups.set(permission.resource, current);
    });
    return [...groups.entries()].sort(([a], [b]) =>
      (RESOURCE_LABELS[a] ?? a).localeCompare(RESOURCE_LABELS[b] ?? b),
    );
  }, [permissionCatalog]);

  const togglePermission = (permission: Permission) => {
    const key = permissionKey(permission.resource, permission.action);
    setRolePermissions((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = permission;
      return next;
    });
  };

  const updatePermissionScope = (permission: Permission, scope: PermissionScope) => {
    const key = permissionKey(permission.resource, permission.action);
    setRolePermissions((current) => ({
      ...current,
      [key]: { ...current[key], scope },
    }));
  };

  const savePermissions = async () => {
    if (!selectedRole?.id) {
      Alert.alert('Migration necessária', 'A matriz editável será habilitada assim que a migration de Controle de Acesso for aplicada.');
      return;
    }
    setSavingPermissions(true);
    const { error: deleteError } = await supabase
      .from('permissoes_papel')
      .delete()
      .eq('papel_id', selectedRole.id);
    if (deleteError) {
      setSavingPermissions(false);
      Alert.alert('Não foi possível salvar', deleteError.message);
      return;
    }
    const rows = Object.values(rolePermissions).map((permission) => ({
      papel_id: selectedRole.id,
      recurso: permission.resource,
      acao: permission.action,
      escopo: permission.scope,
    }));
    if (rows.length) {
      const { error: insertError } = await supabase.from('permissoes_papel').insert(rows);
      if (insertError) {
        setSavingPermissions(false);
        Alert.alert('Não foi possível salvar', insertError.message);
        return;
      }
    }
    setSavingPermissions(false);
    Alert.alert('Permissões salvas', `As permissões de ${selectedRole.name} foram atualizadas.`);
    await loadData();
  };

  const openCreateRole = () => {
    setRoleModalMode('create');
    setRoleDraft({ name: '', description: '', level: '1' });
    setRoleModalVisible(true);
  };

  const openEditRole = (role: RoleItem) => {
    if (!role.id) {
      Alert.alert('Migration necessária', 'Este papel ainda está no formato legado. A migration de Controle de Acesso habilita sua edição institucional.');
      return;
    }
    if (role.system) {
      Alert.alert('Papel protegido', 'Papéis do sistema não podem ter nome ou nível alterados. Você ainda pode ajustar suas permissões na matriz abaixo.');
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
    const payload = {
      nome: roleDraft.name.trim(),
      descricao: roleDraft.description.trim() || null,
      nivel_acesso: Math.min(5, Math.max(1, Number(roleDraft.level) || 1)),
    };
    const result = roleModalMode === 'create'
      ? await supabase.from('papeis').insert({
        instituicao_id: institutionId,
        chave: normalizeKey(roleDraft.name),
        ...payload,
        sistema: false,
        ativo: true,
      })
      : await supabase.from('papeis').update(payload).eq('id', selectedRole?.id);

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
      Alert.alert('Migration necessária', 'A ativação e desativação institucional estará disponível após aplicar a migration.');
      return;
    }
    const { error: updateError } = await supabase
      .from('papeis')
      .update({ ativo: !role.active })
      .eq('id', role.id);
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

  const activeUsers = users.filter((accessUser) => accessUser.active).length;
  const inactiveUsers = users.length - activeUsers;
  const totalPermissions = Object.keys(rolePermissions).length;

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
          <View style={styles.headerIcon}>
            <ShieldCheck size={22} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.headerDescription}>
          Configure papéis, permissões e acessos de forma segura para sua instituição.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}
      >
        {error ? (
          <View style={styles.warningBanner}>
            <CircleHelp size={18} color="#92400E" />
            <Text style={styles.warningText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <StatCard icon={<Users size={19} color={theme.primary} />} value={users.length} label="Usuários" color={theme.primary} />
          <StatCard icon={<UserCheck size={19} color={theme.success} />} value={activeUsers} label="Ativos" color={theme.success} />
          <StatCard icon={<UserX size={19} color={theme.danger} />} value={inactiveUsers} label="Inativos" color={theme.danger} />
          <StatCard icon={<Layers3 size={19} color="#7C3AED" />} value={roles.length} label="Papéis" color="#7C3AED" />
        </View>

        <SectionHeader
          icon={<ShieldCheck size={19} color={theme.primary} />}
          title="Papéis institucionais"
          description="Defina o nível de acesso e a matriz de cada grupo."
          action={
            <TouchableOpacity onPress={openCreateRole} style={[styles.primaryAction, { backgroundColor: theme.primary }]}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Novo papel</Text>
            </TouchableOpacity>
          }
        />

        <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Search size={17} color={theme.textMuted} />
          <TextInput
            value={roleSearch}
            onChangeText={setRoleSearch}
            placeholder="Buscar papel..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

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
          {!filteredRoles.length ? (
            <Card padding={18}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum papel encontrado.</Text>
            </Card>
          ) : null}
        </View>

        <SectionHeader
          icon={<SlidersHorizontal size={19} color={theme.primary} />}
          title="Matriz de permissões"
          description={selectedRole ? `Editando permissões de ${selectedRole.name}` : 'Selecione um papel acima.'}
          action={
            selectedRole?.system ? (
              <View style={styles.systemPill}>
                <LockKeyhole size={13} color="#92400E" />
                <Text style={styles.systemPillText}>Papel do sistema</Text>
              </View>
            ) : null
          }
        />

        <Card style={styles.permissionCard} padding={0}>
          {selectedRole ? permissionGroups.map(([resource, permissions]) => {
            const expanded = expandedResources[resource] ?? true;
            const selectedCount = permissions.filter((permission) =>
              Boolean(rolePermissions[permissionKey(permission.resource, permission.action)])).length;
            return (
              <View key={resource} style={[styles.permissionGroup, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  onPress={() => setExpandedResources((current) => ({ ...current, [resource]: !expanded }))}
                  style={styles.permissionGroupHeader}
                >
                  <View style={[styles.moduleIcon, { backgroundColor: theme.primary + '14' }]}>
                    <Layers3 size={16} color={theme.primary} />
                  </View>
                  <View style={styles.moduleTitleWrap}>
                    <Text style={[styles.moduleTitle, { color: theme.text }]}>
                      {RESOURCE_LABELS[resource] ?? resource}
                    </Text>
                    <Text style={[styles.moduleMeta, { color: theme.textMuted }]}>
                      {selectedCount}/{permissions.length} permissões selecionadas
                    </Text>
                  </View>
                  <ChevronDown
                    size={18}
                    color={theme.textMuted}
                    style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }}
                  />
                </TouchableOpacity>
                {expanded ? permissions.map((permission) => {
                  const key = permissionKey(permission.resource, permission.action);
                  const current = rolePermissions[key];
                  return (
                    <View key={key} style={[styles.permissionRow, { borderTopColor: theme.border }]}>
                      <TouchableOpacity
                        onPress={() => togglePermission(permission)}
                        style={[
                          styles.permissionToggle,
                          current ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border },
                        ]}
                      >
                        {current ? <Check size={14} color="#FFFFFF" /> : null}
                      </TouchableOpacity>
                      <Text style={[styles.permissionLabel, { color: theme.text }]}>
                        {ACTION_LABELS[permission.action] ?? permission.action}
                      </Text>
                      <View style={styles.scopeButtons}>
                        {(Object.keys(SCOPE_LABELS) as PermissionScope[]).map((scope) => (
                          <TouchableOpacity
                            key={scope}
                            disabled={!current}
                            onPress={() => updatePermissionScope(permission, scope)}
                            style={[
                              styles.scopeButton,
                              { borderColor: theme.border },
                              current?.scope === scope && { backgroundColor: theme.primary + '14', borderColor: theme.primary },
                              !current && styles.disabledScope,
                            ]}
                          >
                            <Text style={[
                              styles.scopeText,
                              { color: current?.scope === scope ? theme.primary : theme.textMuted },
                            ]}>
                              {SCOPE_LABELS[scope]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                }) : null}
              </View>
            );
          }) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Selecione um papel para ver as permissões.</Text>
          )}
          {selectedRole ? (
            <View style={[styles.permissionFooter, { borderTopColor: theme.border }]}>
              <Text style={[styles.permissionFooterText, { color: theme.textMuted }]}>
                {totalPermissions} permissões selecionadas
              </Text>
              <Button
                title="Salvar permissões"
                onPress={savePermissions}
                loading={savingPermissions}
                color={theme.primary}
                size="sm"
                icon={<Save size={15} color="#FFFFFF" />}
              />
            </View>
          ) : null}
        </Card>

        <SectionHeader
          icon={<Users size={19} color={theme.primary} />}
          title="Usuários autorizados"
          description="Consulte e administre os papéis atribuídos."
        />
        <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Search size={17} color={theme.textMuted} />
          <TextInput
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder="Buscar usuário..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>
        <Card style={styles.userCardList} padding={0}>
          {filteredUsers.map((accessUser) => {
            const role = roles.find((item) => item.key === accessUser.role);
            const isCurrentUser = accessUser.userId === user?.id;
            return (
              <View key={accessUser.userId} style={[styles.userRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.userAvatar, { backgroundColor: theme.primary + '16' }]}>
                  <UserRound size={18} color={theme.primary} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]}>{accessUser.name}</Text>
                  <View style={styles.userMetaRow}>
                    <Text style={[styles.userRole, { color: theme.primary }]}>{role?.name ?? accessUser.role}</Text>
                    <View style={[styles.statusDot, { backgroundColor: accessUser.active ? theme.success : theme.danger }]} />
                    <Text style={[styles.userStatus, { color: accessUser.active ? theme.success : theme.danger }]}>
                      {accessUser.active ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => openUserRole(accessUser)}
                  style={styles.userAction}
                  accessibilityLabel={`Editar acesso de ${accessUser.name}`}
                >
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
          {!filteredUsers.length ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum usuário autorizado encontrado.</Text>
          ) : null}
        </Card>
      </ScrollView>

      <Modal
        visible={roleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {roleModalMode === 'create' ? 'Novo papel' : 'Editar papel'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                {roleModalMode === 'create' ? 'Crie um acesso sob medida para sua equipe.' : 'Atualize os dados deste papel.'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
              <X size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Field
              label="Nome do papel"
              value={roleDraft.name}
              onChangeText={(value) => setRoleDraft((current) => ({ ...current, name: value }))}
              placeholder="Ex.: Secretaria acadêmica"
              theme={theme}
            />
            <Field
              label="Descrição"
              value={roleDraft.description}
              onChangeText={(value) => setRoleDraft((current) => ({ ...current, description: value }))}
              placeholder="Explique o objetivo deste acesso"
              multiline
              theme={theme}
            />
            <Field
              label="Nível de acesso (1 a 5)"
              value={roleDraft.level}
              onChangeText={(value) => setRoleDraft((current) => ({ ...current, level: value.replace(/[^1-5]/g, '') }))}
              keyboardType="number-pad"
              placeholder="1"
              theme={theme}
            />
            <Button title="Salvar papel" onPress={saveRole} loading={savingRole} color={theme.primary} size="lg" />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={userModalTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUserModalTarget(null)}
      >
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Papel do usuário</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                {userModalTarget?.name ?? 'Usuário autorizado'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setUserModalTarget(null)}>
              <X size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Selecione o papel institucional</Text>
            <View style={styles.roleChoiceList}>
              {roles.filter((role) => role.active).map((role) => (
                <TouchableOpacity
                  key={role.key}
                  onPress={() => setUserRoleDraft(role.key)}
                  style={[
                    styles.roleChoice,
                    { borderColor: theme.border },
                    userRoleDraft === role.key && { borderColor: theme.primary, backgroundColor: theme.primary + '10' },
                  ]}
                >
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

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <Card style={styles.statCard} padding={13}>
      <View style={[styles.statIcon, { backgroundColor: color + '14' }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderMain}>
        <View style={styles.sectionIcon}>{icon}</View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
      </View>
      {action}
    </View>
  );
}

function RoleCard({
  role,
  selected,
  theme,
  onSelect,
  onEdit,
  onToggle,
}: {
  role: RoleItem;
  selected: boolean;
  theme: ReturnType<typeof useTheme>;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.85}
      style={[
        styles.roleCard,
        { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border },
        selected && { shadowColor: theme.primary, shadowOpacity: 0.12 },
      ]}
    >
      <View style={[styles.roleCardIcon, { backgroundColor: selected ? theme.primary : theme.primary + '12' }]}>
        <ShieldCheck size={19} color={selected ? '#FFFFFF' : theme.primary} />
      </View>
      <View style={styles.roleCardInfo}>
        <View style={styles.roleNameRow}>
          <Text style={[styles.roleName, { color: theme.text }]}>{role.name}</Text>
          {role.system ? (
            <View style={styles.systemMiniPill}>
              <LockKeyhole size={11} color="#92400E" />
              <Text style={styles.systemMiniPillText}>Sistema</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.roleDescription, { color: theme.textMuted }]} numberOfLines={1}>{role.description}</Text>
        <View style={styles.roleStats}>
          <Text style={[styles.roleStatText, { color: theme.textSecondary }]}>{role.memberCount} usuário{role.memberCount !== 1 ? 's' : ''}</Text>
          <View style={[styles.statSeparator, { backgroundColor: theme.border }]} />
          <Text style={[styles.roleStatText, { color: theme.textSecondary }]}>{role.permissionCount} permissões</Text>
          <View style={[styles.statusBadge, { backgroundColor: role.active ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.statusBadgeText, { color: role.active ? '#065F46' : '#991B1B' }]}>
              {role.active ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.roleActions}>
        <TouchableOpacity onPress={onEdit} style={styles.iconAction} accessibilityLabel={`Editar ${role.name}`}>
          <SlidersHorizontal size={16} color={theme.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onToggle}
          disabled={role.system}
          style={[styles.iconAction, role.system && styles.disabledAction]}
          accessibilityLabel={`Alternar ${role.name}`}
        >
          {role.system ? (
            <LockKeyhole size={15} color={theme.textMuted} />
          ) : (
            <Power size={16} color={role.active ? theme.danger : theme.success} />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function Field({
  label,
  theme,
  ...props
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.fieldInput,
          { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
          props.multiline && styles.multilineInput,
        ]}
      />
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
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 2 },
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 18, maxWidth: 500 },
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
  systemPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 },
  systemPillText: { color: '#92400E', fontSize: 10, fontWeight: '700' },
  permissionCard: { overflow: 'hidden' },
  permissionGroup: { borderBottomWidth: 1 },
  permissionGroupHeader: { minHeight: 59, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  moduleIcon: { width: 31, height: 31, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  moduleTitleWrap: { flex: 1 },
  moduleTitle: { fontSize: 13, fontWeight: '800' },
  moduleMeta: { fontSize: 10, marginTop: 2 },
  permissionRow: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9 },
  permissionToggle: { width: 21, height: 21, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  permissionLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  scopeButtons: { flexDirection: 'row', gap: 4 },
  scopeButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 5 },
  scopeText: { fontSize: 9, fontWeight: '700' },
  disabledScope: { opacity: 0.45 },
  permissionFooter: { minHeight: 64, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, gap: 10 },
  permissionFooterText: { fontSize: 11, fontWeight: '600' },
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