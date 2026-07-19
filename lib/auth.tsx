import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuthUser, Institution, UserRole, UserRoleRecord, Profile, RolePermission, UserSettings, UserMFA, UserSession } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';
import {
  signInWithPassword,
  signOutCurrent,
  signOutAll,
  resetPassword,
  updatePassword,
  signUpWithInstitution,
  getUserRoles,
  getUserProfile,
  getUserActiveContext,
  setUserActiveContext,
  getUserSettings,
  updateUserSettings,
  registerSession,
  getUserSessions,
  revokeAllOtherSessions,
} from '@/lib/services/auth-service';
import { getRolePermissions } from '@/lib/services/rbac';
import { getMFAState } from '@/lib/services/mfa';
import { isBiometricAvailable, authenticateBiometric } from '@/lib/services/biometric';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithBiometric: () => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, institutionName: string) => Promise<{ error: string | null }>;
  signOut: (all?: boolean) => Promise<void>;
  recoverPassword: (email: string) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  switchInstitution: (institution: Institution, role: UserRole) => Promise<void>;
  switchProfile: (profile: Profile) => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (resource: string, action: 'read' | 'create' | 'update' | 'delete' | 'manage' | 'export') => boolean;
  updateSettings: (settings: Partial<Record<string, unknown>>) => Promise<void>;
  getSessions: () => Promise<UserSession[]>;
  revokeOtherSessions: () => Promise<void>;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const loadUserData = useCallback(async (sess: Session) => {
    const userId = sess.user.id;

    const [profile, roles, activeContext, settings, permissions, mfaState, sessionsList] = await Promise.all([
      getUserProfile(userId),
      getUserRoles(userId),
      getUserActiveContext(userId),
      getUserSettings(userId),
      getRolePermissions('student'),
      getMFAState(userId),
      getUserSessions(userId),
    ]);

    const activeRoles: UserRoleRecord[] = roles || [];

    let currentInstitution: Institution | null = null;
    let currentRole: UserRole | null = null;

    if (activeContext && activeContext.institution_id && activeContext.role) {
      const matchingRole = activeRoles.find(
        (r) => r.institution_id === activeContext.institution_id && r.role === activeContext.role
      );
      if (matchingRole) {
        currentInstitution = matchingRole.institution ?? null;
        currentRole = matchingRole.role;
      }
    }

    if (!currentInstitution && activeRoles.length > 0) {
      const firstRole = activeRoles[0];
      currentInstitution = firstRole.institution ?? null;
      currentRole = firstRole.role;
      if (currentInstitution) {
        await setUserActiveContext(userId, currentInstitution.id, currentRole, profile?.id ?? null);
      }
    }

    if (currentInstitution && currentRole) {
      const perms = await getRolePermissions(currentRole);
      setUser({
        id: userId,
        email: sess.user.email!,
        profile: profile ?? { id: userId, full_name: '', avatar_url: null, phone: null, birth_date: null, created_at: '', updated_at: '' },
        roles: activeRoles,
        currentInstitution,
        currentRole,
        permissions: perms,
        settings: settings ?? null,
        mfa: mfaState as UserMFA ?? null,
        sessions: sessionsList,
      });
    } else {
      setUser({
        id: userId,
        email: sess.user.email!,
        profile: profile ?? { id: userId, full_name: '', avatar_url: null, phone: null, birth_date: null, created_at: '', updated_at: '' },
        roles: activeRoles,
        currentInstitution: null,
        currentRole: null,
        permissions: [],
        settings: settings ?? null,
        mfa: mfaState as UserMFA ?? null,
        sessions: sessionsList,
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(s);
      if (s) {
        await loadUserData(s);
        await registerSession(s.user.id);
        const bioAvailable = await isBiometricAvailable();
        setBiometricAvailable(bioAvailable);
        if (bioAvailable) {
          const settings = await getUserSettings(s.user.id);
          setBiometricEnabled(!!settings?.biometric_login);
        }
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) {
        (async () => {
          await loadUserData(s);
          await registerSession(s.user.id);
          setLoading(false);
        })();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithPassword(email, password);
    return result;
  };

  const signInWithBiometric = async () => {
    const success = await authenticateBiometric();
    if (!success) return { error: 'Falha na autenticação biométrica.' };
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, institutionName: string) => {
    const result = await signUpWithInstitution(email, password, fullName, institutionName);
    return result;
  };

  const signOut = async (all = false) => {
    if (all) {
      await signOutAll();
    } else {
      await signOutCurrent();
    }
  };

  const recoverPassword = async (email: string) => {
    return await resetPassword(email);
  };

  const changePassword = async (newPassword: string) => {
    return await updatePassword(newPassword);
  };

  const switchInstitution = async (institution: Institution, role: UserRole) => {
    if (!user) return;
    const perms = await getRolePermissions(role);
    await setUserActiveContext(user.id, institution.id, role, user.profile.id);
    setUser({
      ...user,
      currentInstitution: institution,
      currentRole: role,
      permissions: perms,
    });
  };

  const switchProfile = async (profile: Profile) => {
    if (!user || !user.currentInstitution || !user.currentRole) return;
    await setUserActiveContext(user.id, user.currentInstitution.id, user.currentRole, profile.id);
    setUser({ ...user, profile });
  };

  const refreshUser = async () => {
    if (session) await loadUserData(session);
  };

  const can = (resource: string, action: 'read' | 'create' | 'update' | 'delete' | 'manage' | 'export') => {
    if (!user) return false;
    return user.permissions.some((p: RolePermission) => p.resource === resource && p.action === action);
  };

  const updateSettings = async (settings: Partial<Record<string, unknown>>) => {
    if (!user) return;
    await updateUserSettings(user.id, settings);
    const updated = await getUserSettings(user.id);
    setUser({ ...user, settings: updated ?? null });
  };

  const getSessions = async () => {
    if (!user) return [];
    return await getUserSessions(user.id);
  };

  const revokeOtherSessions = async () => {
    if (!user || !user.sessions.length) return;
    const current = user.sessions[0];
    await revokeAllOtherSessions(user.id, current.id);
    const list = await getUserSessions(user.id);
    setUser({ ...user, sessions: list });
  };

  const setBiometricEnabledState = (enabled: boolean) => {
    setBiometricEnabled(enabled);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signInWithBiometric,
        signUp,
        signOut,
        recoverPassword,
        changePassword,
        switchInstitution,
        switchProfile,
        refreshUser,
        can,
        updateSettings,
        getSessions,
        revokeOtherSessions,
        biometricAvailable,
        biometricEnabled,
        setBiometricEnabled: setBiometricEnabledState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
