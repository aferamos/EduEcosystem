import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import { getDeviceInfo } from './session';
import type { UserRole } from '@/lib/types';

export interface SignInResult {
  error: string | null;
}

export interface SignUpResult {
  error: string | null;
}

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOutAll(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOutCurrent(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) return { error: error.message };
  return { error: null };
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${Platform.OS === 'web' ? window.location.origin : 'eduone://'}update-password`,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signUpWithInstitution(
  email: string,
  password: string,
  fullName: string,
  institutionName: string
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Falha ao criar usuário.' };

  const userId = data.user.id;

  // Cria perfil
  const { error: profileErr } = await supabase
    .from('perfis')
    .upsert({ id: userId, nome_completo: fullName }, { onConflict: 'id' });
  if (profileErr) return { error: profileErr.message };

  // Cria configurações padrão
  const { error: settingsErr } = await supabase
    .from('configuracoes_usuario')
    .upsert({ usuario_id: userId }, { onConflict: 'usuario_id' });
  if (settingsErr) console.warn('configuracoes_usuario insert failed', settingsErr.message);

  // Cria instituição
  const slug =
    institutionName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Date.now();

  const { data: inst, error: instErr } = await supabase
    .from('instituicoes')
    .insert({ nome: institutionName, slug })
    .select()
    .single();
  if (instErr || !inst) return { error: instErr?.message ?? 'Falha ao criar instituição.' };

  // Atribui papel de admin
  const { error: roleErr } = await supabase
    .from('perfis_usuario')
    .insert({ usuario_id: userId, instituicao_id: inst.id, perfil: 'admin' });
  if (roleErr) return { error: roleErr.message };

  return { error: null };
}

export async function getUserRoles(userId: string) {
  const { data, error } = await supabase
    .from('perfis_usuario')
    .select('*, instituicao:instituicoes(*)')
    .eq('usuario_id', userId)
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  // Normaliza para o formato esperado pelo restante do app
  return (data ?? []).map((r: any) => ({
    id: r.id,
    user_id: r.usuario_id,
    institution_id: r.instituicao_id,
    role: r.perfil,
    is_active: r.ativo,
    created_at: r.criado_em,
    institution: r.instituicao
      ? {
          id: r.instituicao.id,
          name: r.instituicao.nome,
          slug: r.instituicao.slug,
          logo_url: r.instituicao.logo_url,
          primary_color: r.instituicao.cor_primaria,
          secondary_color: r.instituicao.cor_secundaria,
          address: r.instituicao.endereco,
          city: r.instituicao.cidade,
          phone: r.instituicao.telefone,
          email: r.instituicao.email,
          active: r.instituicao.ativo,
          created_at: r.instituicao.criado_em,
          updated_at: r.instituicao.atualizado_em,
        }
      : null,
  }));
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    full_name: data.nome_completo ?? '',
    avatar_url: data.avatar_url,
    phone: data.telefone,
    birth_date: data.data_nascimento,
    created_at: data.criado_em,
    updated_at: data.atualizado_em,
  };
}

export async function getUserActiveContext(userId: string) {
  const { data, error } = await supabase
    .from('contexto_ativo')
    .select('*')
    .eq('usuario_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    user_id: data.usuario_id,
    institution_id: data.instituicao_id,
    role: data.perfil,
    profile_id: data.perfil_id,
    updated_at: data.atualizado_em,
  };
}

export async function setUserActiveContext(
  userId: string,
  institutionId: string | null,
  role: UserRole | null,
  profileId: string | null
) {
  // perfil_id referencia perfis.id — só passa se o perfil existe no banco
  // para evitar violação de FK, verificamos se o perfil existe
  let safePerfil_id: string | null = null;
  if (profileId) {
    const { data: perfil } = await supabase
      .from('perfis')
      .select('id')
      .eq('id', profileId)
      .maybeSingle();
    safePerfil_id = perfil?.id ?? null;
  }

  const { error } = await supabase.from('contexto_ativo').upsert(
    {
      usuario_id: userId,
      instituicao_id: institutionId,
      perfil: role,
      perfil_id: safePerfil_id,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'usuario_id' }
  );
  if (error) throw new Error(error.message);
}

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('configuracoes_usuario')
    .select('*')
    .eq('usuario_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    user_id: data.usuario_id,
    email_notifications: data.notif_email,
    push_notifications: data.notif_push,
    sms_notifications: data.notif_sms,
    language: data.idioma,
    theme: data.tema,
    timezone: data.fuso_horario,
    biometric_login: data.login_biometrico,
    updated_at: data.atualizado_em,
  };
}

export async function updateUserSettings(userId: string, settings: Partial<Record<string, unknown>>) {
  // Traduz chaves EN → PT se necessário
  const ptSettings: Record<string, unknown> = {};
  const keyMap: Record<string, string> = {
    email_notifications: 'notif_email',
    push_notifications: 'notif_push',
    sms_notifications: 'notif_sms',
    language: 'idioma',
    theme: 'tema',
    timezone: 'fuso_horario',
    biometric_login: 'login_biometrico',
  };
  for (const [k, v] of Object.entries(settings)) {
    ptSettings[keyMap[k] ?? k] = v;
  }
  const { error } = await supabase
    .from('configuracoes_usuario')
    .update(ptSettings)
    .eq('usuario_id', userId);
  if (error) throw new Error(error.message);
}

export async function registerSession(userId: string) {
  const device = getDeviceInfo();
  const { error } = await supabase.from('sessoes_usuario').insert({
    usuario_id: userId,
    nome_dispositivo: device.name,
    tipo_dispositivo: device.type,
    sistema: device.os,
  });
  if (error) console.warn('session register failed', error.message);
}

export async function getUserSessions(userId: string) {
  const { data, error } = await supabase
    .from('sessoes_usuario')
    .select('*')
    .eq('usuario_id', userId)
    .order('ultimo_acesso', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s: any) => ({
    id: s.id,
    user_id: s.usuario_id,
    device_name: s.nome_dispositivo,
    device_type: s.tipo_dispositivo,
    os: s.sistema,
    ip_address: s.ip,
    last_active_at: s.ultimo_acesso,
    created_at: s.criado_em,
    expires_at: s.expira_em,
  }));
}

export async function revokeSession(sessionId: string) {
  const { error } = await supabase.from('sessoes_usuario').delete().eq('id', sessionId);
  if (error) throw new Error(error.message);
}

export async function revokeAllOtherSessions(userId: string, currentSessionId: string) {
  const { error } = await supabase
    .from('sessoes_usuario')
    .delete()
    .eq('usuario_id', userId)
    .neq('id', currentSessionId);
  if (error) throw new Error(error.message);
}
