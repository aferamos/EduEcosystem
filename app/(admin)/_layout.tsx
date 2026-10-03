import { Tabs } from 'expo-router';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import { useTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: -2,
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingHorizontal: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Principal',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuários',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="academic"
        options={{
          title: 'Acadêmico',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="access-control"
        options={{
          href: null,
          title: 'Controle de Acesso',
        }}
      />
      <Tabs.Screen
        name="institution"
        options={{
          href: null,
          title: 'Dados da Instituição',
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Notificações',
        }}
      />
    </Tabs>
  );
}
