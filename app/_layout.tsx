import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import LoadingScreen from '@/components/ui/LoadingScreen';

function RootNavigator() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const inTeacher = segments[0] === '(teacher)';
    const inStudent = segments[0] === '(student)';

    if (!user) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    const role = user.currentRole;
    if (!role) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    const alreadyOnCorrectPortal =
      (role === 'admin' || role === 'super_admin' || role === 'coordenador') && inAdmin ||
      role === 'professor' && inTeacher ||
      (role === 'aluno' || role === 'responsavel') && inStudent;

    if (!alreadyOnCorrectPortal && !inAuth) {
      if (role === 'admin' || role === 'super_admin' || role === 'coordenador') {
        router.replace('/(admin)');
      } else if (role === 'professor') {
        router.replace('/(teacher)');
      } else {
        router.replace('/(student)');
      }
    } else if (!alreadyOnCorrectPortal && inAuth) {
      if (role === 'admin' || role === 'super_admin' || role === 'coordenador') {
        router.replace('/(admin)');
      } else if (role === 'professor') {
        router.replace('/(teacher)');
      } else {
        router.replace('/(student)');
      }
    }
  }, [user, loading, segments]);

  if (loading) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeWrapper />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function ThemeWrapper() {
  const { user } = useAuth();
  return (
    <ThemeProvider institution={user?.currentInstitution ?? null}>
      <RootNavigator />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
