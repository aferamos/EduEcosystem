import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  Check,
  Mail,
  MessageSquareText,
  Smartphone,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface InstitutionNotificationSettings {
  alertas_email: boolean;
  alertas_push: boolean;
  alertas_sms: boolean;
  comunicados_email: boolean;
  comunicados_push: boolean;
  comunicados_sms: boolean;
}

const DEFAULT_SETTINGS: InstitutionNotificationSettings = {
  alertas_email: true,
  alertas_push: true,
  alertas_sms: false,
  comunicados_email: true,
  comunicados_push: true,
  comunicados_sms: false,
};

export default function NotificationsSettingsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const institutionId = user?.currentInstitution?.id ?? null;
  const canEdit = user?.currentRole === 'admin' || user?.currentRole === 'super_admin';

  const [settings, setSettings] = useState<InstitutionNotificationSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<InstitutionNotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    if (!institutionId) {
      setError('Não há uma instituição vinculada a este usuário.');
      if (showLoading) setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('configuracoes_notificacoes_instituicao')
        .select('*')
        .eq('instituicao_id', institutionId)
        .maybeSingle();

      if (queryError) throw new Error(queryError.message);

      const loadedSettings: InstitutionNotificationSettings = data
        ? {
            alertas_email: data.alertas_email,
            alertas_push: data.alertas_push,
            alertas_sms: data.alertas_sms,
            comunicados_email: data.comunicados_email,
            comunicados_push: data.comunicados_push,
            comunicados_sms: data.comunicados_sms,
          }
        : { ...DEFAULT_SETTINGS };

      setSettings(loadedSettings);
      setSavedSettings(loadedSettings);
      setSaved(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as configurações.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSettings(false);
    } finally {
      setRefreshing(false);
    }
  };

  const hasChanges = Object.keys(DEFAULT_SETTINGS).some((key) => {
    const settingKey = key as keyof InstitutionNotificationSettings;
    return settings[settingKey] !== savedSettings[settingKey];
  });

  const updateChannel = (key: keyof InstitutionNotificationSettings, value: boolean) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const saveSettings = async () => {
    if (!institutionId || !user?.id || !canEdit || !hasChanges) return;
    setSaving(true);
    setError('');

    try {
      const { data, error: saveError } = await supabase
        .from('configuracoes_notificacoes_instituicao')
        .upsert({
          instituicao_id: institutionId,
          ...settings,
          atualizado_por: user.id,
          atualizado_em: new Date().toISOString(),
        }, { onConflict: 'instituicao_id' })
        .select('*')
        .maybeSingle();

      if (saveError) throw new Error(saveError.message);
      if (!data) throw new Error('Nenhuma configuração foi salva. Verifique se sua conta é administradora da instituição.');

      const persisted: InstitutionNotificationSettings = {
        alertas_email: data.alertas_email,
        alertas_push: data.alertas_push,
        alertas_sms: data.alertas_sms,
        comunicados_email: data.comunicados_email,
        comunicados_push: data.comunicados_push,
        comunicados_sms: data.comunicados_sms,
      };
      setSettings(persisted);
      setSavedSettings(persisted);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: Math.max(insets.top, 18) + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Voltar">
            <ArrowLeft size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Notificações</Text>
            <Text style={styles.headerSubtitle}>{user?.currentInstitution?.name ?? 'Instituição atual'}</Text>
          </View>
          <View style={styles.headerIcon}><Bell size={22} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.headerDescription}>
          Defina como alertas e comunicados da instituição podem ser enviados.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 34 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {error ? (
          <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        {saved ? (
          <View style={styles.successBanner}>
            <Check size={16} color="#065F46" />
            <Text style={styles.successText}>Configurações institucionais salvas.</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Carregando configurações...</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.intro, { color: theme.textMuted }]}>
              Os canais abaixo são regras gerais da instituição. As preferências pessoais continuam sendo controladas por cada usuário.
            </Text>

            <ChannelSection
              title="Alertas"
              description="Avisos importantes sobre atividades e ocorrências."
              theme={theme}
              rows={[
                { label: 'E-mail', description: 'Enviar alertas por e-mail.', icon: <Mail size={18} color={theme.primary} />, key: 'alertas_email' },
                { label: 'Notificação push', description: 'Exibir alertas no aplicativo.', icon: <Bell size={18} color={theme.primary} />, key: 'alertas_push' },
                { label: 'SMS', description: 'Enviar alertas por mensagem de texto.', icon: <Smartphone size={18} color={theme.primary} />, key: 'alertas_sms' },
              ]}
              values={settings}
              canEdit={canEdit}
              onChange={updateChannel}
            />

            <ChannelSection
              title="Comunicados"
              description="Distribuição de comunicados institucionais."
              theme={theme}
              rows={[
                { label: 'E-mail', description: 'Enviar comunicados por e-mail.', icon: <Mail size={18} color={theme.secondary} />, key: 'comunicados_email' },
                { label: 'Notificação push', description: 'Exibir comunicados no aplicativo.', icon: <MessageSquareText size={18} color={theme.secondary} />, key: 'comunicados_push' },
                { label: 'SMS', description: 'Enviar comunicados por mensagem de texto.', icon: <Smartphone size={18} color={theme.secondary} />, key: 'comunicados_sms' },
              ]}
              values={settings}
              canEdit={canEdit}
              onChange={updateChannel}
            />

            {canEdit ? (
              <Button
                title="Salvar configurações"
                onPress={saveSettings}
                loading={saving}
                disabled={!hasChanges || loading}
                size="lg"
                color={theme.primary}
              />
            ) : (
              <Text style={[styles.readOnlyHint, { color: theme.textMuted }]}>
                Somente administradores podem alterar as regras de notificação da instituição.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ChannelSection({
  title,
  description,
  theme,
  rows,
  values,
  canEdit,
  onChange,
}: {
  title: string;
  description: string;
  theme: ReturnType<typeof useTheme>;
  rows: {
    label: string;
    description: string;
    icon: React.ReactNode;
    key: keyof InstitutionNotificationSettings;
  }[];
  values: InstitutionNotificationSettings;
  canEdit: boolean;
  onChange: (key: keyof InstitutionNotificationSettings, value: boolean) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleBlock}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>{description}</Text>
      </View>
      <Card style={[styles.channelCard, { backgroundColor: theme.surface, borderColor: theme.border }]} padding={0}>
        {rows.map((row, index) => (
          <View
            key={row.key}
            style={[
              styles.channelRow,
              index === rows.length - 1 ? styles.channelRowLast : { borderBottomColor: theme.border },
            ]}
          >
            <View style={[styles.channelIcon, { backgroundColor: theme.surfaceAlt }]}>{row.icon}</View>
            <View style={styles.channelInfo}>
              <Text style={[styles.channelLabel, { color: theme.text }]}>{row.label}</Text>
              <Text style={[styles.channelDescription, { color: theme.textMuted }]}>{row.description}</Text>
            </View>
            <Switch
              value={values[row.key]}
              onValueChange={(value) => onChange(row.key, value)}
              disabled={!canEdit}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerInfo: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 2 },
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)' },
  headerDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 18 },
  content: { padding: 16, gap: 16 },
  intro: { fontSize: 12, lineHeight: 18 },
  section: { gap: 9 },
  sectionTitleBlock: { gap: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionDescription: { fontSize: 12, lineHeight: 17 },
  channelCard: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 13 },
  channelRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  channelRowLast: { borderBottomWidth: 0 },
  channelIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  channelInfo: { flex: 1, gap: 3 },
  channelLabel: { fontSize: 13, fontWeight: '700' },
  channelDescription: { fontSize: 11, lineHeight: 15 },
  loading: { paddingVertical: 40, alignItems: 'center', gap: 11 },
  loadingText: { fontSize: 13 },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12 },
  errorText: { color: '#991B1B', fontSize: 12, lineHeight: 17 },
  successBanner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12 },
  successText: { color: '#065F46', fontSize: 13, fontWeight: '600' },
  readOnlyHint: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});