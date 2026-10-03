import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Building2,
  Palette,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import RoleBadge from '@/components/RoleBadge';

const PRESET_COLORS = [
  { primary: '#1A56DB', secondary: '#0694A2', label: 'Azul Padrão' },
  { primary: '#057A55', secondary: '#0694A2', label: 'Verde' },
  { primary: '#C27803', secondary: '#B45309', label: 'Âmbar' },
  { primary: '#C81E1E', secondary: '#B91C1C', label: 'Vermelho' },
  { primary: '#7C3AED', secondary: '#6D28D9', label: 'Roxo' },
  { primary: '#0C4A6E', secondary: '#075985', label: 'Azul Escuro' },
];

export default function SettingsScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const theme = useTheme();
  const [institution, setInstitution] = useState(user?.currentInstitution);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInstitution(user?.currentInstitution);
    const presetIndex = PRESET_COLORS.findIndex(
      (preset) => preset.primary === user?.currentInstitution?.primary_color,
    );
    setSelectedColor(presetIndex >= 0 ? presetIndex : 0);
  }, [user?.currentInstitution]);

  const handleSaveBranding = async () => {
    if (!institution) return;
    setSaving(true);
    const preset = PRESET_COLORS[selectedColor];
    const { error } = await supabase.from('instituicoes').update({
      cor_primaria: preset.primary,
      cor_secundaria: preset.secondary,
    }).eq('id', institution.id);
    setSaving(false);
    if (error) {
      Alert.alert('Não foi possível salvar a identidade visual', error.message);
      return;
    }
    await refreshUser();
    setSaved(true);
    setShowBrandingModal(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const menuItems = [
    {
      icon: <Building2 size={20} color={theme.primary} />,
      label: 'Dados da Instituição',
      desc: institution?.name ?? 'Configurar',
      onPress: () => router.push('/(admin)/institution'),
    },
    {
      icon: <Palette size={20} color={theme.secondary} />,
      label: 'Identidade Visual',
      desc: 'Cores e branding',
      onPress: () => setShowBrandingModal(true),
    },
    {
      icon: <Shield size={20} color={theme.success} />,
      label: 'Controle de Acesso',
      desc: 'Gerenciar papéis e usuários autorizados',
      onPress: () => router.push('/(admin)/access-control'),
    },
    {
      icon: <Bell size={20} color={theme.warning} />,
      label: 'Notificações',
      desc: 'Configurar alertas e comunicados',
      onPress: () => {},
    },
  ];

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {user?.profile.full_name?.[0]?.toUpperCase() ?? 'A'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.profile.full_name ?? 'Administrador'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {user?.currentRole && <RoleBadge role={user.currentRole} />}
          </View>
        </Card>

        <View style={styles.institutionInfo}>
          <Building2 size={16} color={theme.textMuted} />
          <Text style={styles.institutionName}>{institution?.name ?? 'Sem instituição'}</Text>
        </View>

        <Text style={styles.sectionLabel}>Configurações do Sistema</Text>
        {menuItems.map(item => (
          <Card key={item.label} style={styles.menuCard} padding={16}>
            <TouchableOpacity style={styles.menuRow} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: theme.bg }]}>
                {item.icon}
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </Card>
        ))}

        {saved && (
          <View style={styles.savedBanner}>
            <Check size={16} color={theme.success} />
            <Text style={styles.savedText}>Alterações salvas com sucesso!</Text>
          </View>
        )}

        <Button
          title="Sair da Conta"
          onPress={signOut}
          variant="outline"
          color={theme.danger}
          icon={<LogOut size={18} color={theme.danger} />}
          style={styles.logoutBtn}
        />
      </ScrollView>

      <Modal visible={showBrandingModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Identidade Visual</Text>
            <TouchableOpacity onPress={() => setShowBrandingModal(false)}>
              <X size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.colorLabel}>Paleta de Cores</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedColor(idx)}
                  style={[
                    styles.colorItem,
                    selectedColor === idx && styles.colorItemSelected,
                  ]}
                >
                  <View style={styles.colorPreview}>
                    <View style={[styles.colorSwatch, { backgroundColor: preset.primary }]} />
                    <View style={[styles.colorSwatch, { backgroundColor: preset.secondary }]} />
                  </View>
                  <Text style={styles.colorLabel2}>{preset.label}</Text>
                  {selectedColor === idx && (
                    <View style={styles.colorCheck}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title="Salvar Configurações"
              onPress={handleSaveBranding}
              loading={saving}
              size="lg"
              color={theme.primary}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6B7280' },
  institutionInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  institutionName: { fontSize: 13, color: '#6B7280' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 4 },
  menuCard: {},
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  menuDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 10, justifyContent: 'center' },
  savedText: { fontSize: 14, color: '#065F46', fontWeight: '600' },
  logoutBtn: { marginTop: 8 },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, gap: 16 },
  colorLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorItem: { width: '30%', padding: 10, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', gap: 6, position: 'relative' },
  colorItemSelected: { borderColor: '#1A56DB', backgroundColor: '#EFF6FF' },
  colorPreview: { flexDirection: 'row', gap: 4 },
  colorSwatch: { width: 22, height: 22, borderRadius: 11 },
  colorLabel2: { fontSize: 10, color: '#374151', fontWeight: '600', textAlign: 'center' },
  colorCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#1A56DB', justifyContent: 'center', alignItems: 'center' },
});
