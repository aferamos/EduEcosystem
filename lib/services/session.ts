import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface DeviceInfo {
  name: string;
  type: 'mobile' | 'tablet' | 'desktop' | 'web';
  os: string;
}

export function getDeviceInfo(): DeviceInfo {
  if (Platform.OS === 'web') {
    return {
      name: navigator.userAgent?.split(' ')[0] ?? 'Browser',
      type: 'web',
      os: navigator.platform ?? 'Web',
    };
  }
  const deviceName = Constants.deviceName ?? 'Mobile Device';
  const os = Platform.OS === 'ios' ? 'iOS' : 'Android';
  return {
    name: deviceName,
    type: 'mobile',
    os,
  };
}

export function getClientIP(): string | null {
  if (Platform.OS === 'web') {
    return null;
  }
  return null;
}
