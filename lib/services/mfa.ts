import { supabase } from '@/lib/supabase';

export interface MFAState {
  totpEnabled: boolean;
  methodPreference: 'none' | 'totp' | 'sms' | 'email';
  verifiedAt: string | null;
}

// MFA não implementado no schema atual – retorna estado padrão desativado
export async function getMFAState(_userId: string): Promise<MFAState | null> {
  return {
    totpEnabled: false,
    methodPreference: 'none',
    verifiedAt: null,
  };
}

export async function setupTOTP(_userId: string): Promise<{ secret: string; uri: string } | null> {
  return null;
}

export async function verifyAndEnableTOTP(_userId: string, _code: string): Promise<boolean> {
  return false;
}

export async function disableMFA(_userId: string): Promise<void> {
  // não implementado
}

export async function setMFAPreference(_userId: string, _method: 'none' | 'totp' | 'sms' | 'email'): Promise<void> {
  // não implementado
}
