import { supabase } from '@/lib/supabase';
import type { RolePermission, UserRole } from '@/lib/types';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage' | 'export';

export interface Permission {
  resource: string;
  action: Action;
  scope: 'own' | 'institution' | 'all';
}

export async function getRolePermissions(role: UserRole, institutionId?: string): Promise<RolePermission[]> {
  if (institutionId) {
    const { data: institutionalRole, error: roleError } = await supabase
      .from('papeis')
      .select('id, ativo')
      .eq('instituicao_id', institutionId)
      .eq('chave', role)
      .maybeSingle();

    if (!roleError && institutionalRole?.id) {
      if (!institutionalRole.ativo) return [];

      const { data: institutionalPermissions, error: permissionError } = await supabase
        .from('permissoes_papel')
        .select('id, recurso, acao, escopo, criado_em')
        .eq('papel_id', institutionalRole.id);

      if (!permissionError) {
        return (institutionalPermissions ?? []).map((r) => ({
          id: r.id,
          role,
          resource: r.recurso,
          action: r.acao as Action,
          scope: r.escopo as 'own' | 'institution' | 'all',
          created_at: r.criado_em,
        }));
      }
    }
  }

  const { data, error } = await supabase
    .from('permissoes_perfil')
    .select('id, recurso, acao, escopo, criado_em')
    .eq('perfil', role);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    role,
    resource: r.recurso,
    action: r.acao as Action,
    scope: r.escopo as 'own' | 'institution' | 'all',
    created_at: r.criado_em,
  }));
}

export function hasPermission(
  permissions: Permission[],
  resource: string,
  action: Action,
  minScope?: 'own' | 'institution' | 'all'
): boolean {
  const matched = permissions.find((p) => p.resource === resource && p.action === action);
  if (!matched) return false;
  if (!minScope) return true;
  const scopeRank = { own: 1, institution: 2, all: 3 };
  return scopeRank[matched.scope] >= scopeRank[minScope];
}

export function hasAnyPermission(
  permissions: Permission[],
  resource: string,
  actions: Action[]
): boolean {
  return actions.some((action) => hasPermission(permissions, resource, action));
}

export function hasAllPermissions(
  permissions: Permission[],
  checks: { resource: string; action: Action }[]
): boolean {
  return checks.every((c) => hasPermission(permissions, c.resource, c.action));
}

export function isAdminRole(role: UserRole | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'coordenador';
}

export function isTeacherRole(role: UserRole | null): boolean {
  return role === 'professor';
}

export function isStudentRole(role: UserRole | null): boolean {
  return role === 'aluno' || role === 'responsavel';
}
