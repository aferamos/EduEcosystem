import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
if (Platform.OS !== 'web') {
  try {
    LocalAuthentication = require('expo-local-authentication');
  } catch {
    LocalAuthentication = null;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!LocalAuthentication) return false;
  const available = await LocalAuthentication.hasHardwareAsync();
  if (!available) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateBiometric(
  promptMessage = 'Autenticar com biometria'
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!LocalAuthentication) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Usar senha',
    cancelLabel: 'Cancelar',
  });
  return result.success;
}

export async function isBiometricEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('biometric_login')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return !!data.biometric_login;
}

export async function setBiometricEnabled(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({ biometric_login: enabled })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
