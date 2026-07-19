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

  // Create profile and settings (trigger was removed; create manually)
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: fullName }, { onConflict: 'id' });
  if (profileErr) return { error: profileErr.message };

  const { error: settingsErr } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
  if (settingsErr) console.warn('user_settings insert failed', settingsErr.message);

  const { error: mfaErr } = await supabase
    .from('configuracoes_usuario')
    .upsert({ usuario_id: userId }, { onConflict: 'usuario_id' });
  if (mfaErr) console.warn('configuracoes_usuario insert failed', mfaErr.message);

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
    .from('institutions')
    .insert({ name: institutionName, slug })
    .select()
    .single();
  if (instErr || !inst) return { error: instErr?.message ?? 'Falha ao criar instituição.' };

  const { error: roleErr } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, institution_id: inst.id, role: 'admin' });
  if (roleErr) return { error: roleErr.message };

  return { error: null };
}

export async function getUserRoles(userId: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*, institution:institutions(*)')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserActiveContext(userId: string) {
  const { data, error } = await supabase
    .from('user_active_context')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function setUserActiveContext(
  userId: string,
  institutionId: string | null,
  role: UserRole | null,
  profileId: string | null
) {
  const { error } = await supabase.from('user_active_context').upsert(
    {
      user_id: userId,
      institution_id: institutionId,
      role: role,
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateUserSettings(userId: string, settings: Partial<Record<string, unknown>>) {
  const { error } = await supabase.from('user_settings').update(settings).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function registerSession(userId: string) {
  const device = getDeviceInfo();
  const { error } = await supabase.from('user_sessions').insert({
    user_id: userId,
    device_name: device.name,
    device_type: device.type,
    os: device.os,
  });
  if (error) console.warn('session register failed', error.message);
}

export async function getUserSessions(userId: string) {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('last_active_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function revokeSession(sessionId: string) {
  const { error } = await supabase.from('user_sessions').delete().eq('id', sessionId);
  if (error) throw new Error(error.message);
}

export async function revokeAllOtherSessions(userId: string, currentSessionId: string) {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
    .neq('id', currentSessionId);
  if (error) throw new Error(error.message);
}
