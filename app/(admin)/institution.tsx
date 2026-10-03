import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Building2,
  Check,
  CircleHelp,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { Institution } from '@/lib/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface InstitutionDraft {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

function toDraft(institution: Institution | null): InstitutionDraft {
  return {
    name: institution?.name ?? '',
    email: institution?.email ?? '',
    phone: institution?.phone ?? '',
    address: institution?.address ?? '',
    city: institution?.city ?? '',
  };
}

function mapInstitution(row: any): Institution {
  return {
    id: row.id,
    name: row.nome,
    slug: row.slug,
    logo_url: row.logo_url ?? null,
    primary_color: row.cor_primaria ?? '#1A56DB',
    secondary_color: row.cor_secundaria ?? '#0694A2',
    address: row.endereco ?? null,
    city: row.cidade ?? null,
    phone: row.telefone ?? null,
    email: row.email ?? null,
    active: row.ativo,
    created_at: row.criado_em,
    updated_at: row.atualizado_em,
  };
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function InstitutionScreen() {
  const { user, refreshUser } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const institutionId = user?.currentInstitution?.id ?? null;
  const canEdit = user?.currentRole === 'admin' || user?.currentRole === 'super_admin';

  const [institution, setInstitution] = useState<Institution | null>(user?.currentInstitution ?? null);
  const [draft, setDraft] = useState<InstitutionDraft>(() => toDraft(user?.currentInstitution ?? null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const loadInstitution = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    if (!institutionId) {
      setError('Não há uma instituição vinculada a este usuário.');
      if (showLoading) setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('instituicoes')
        .select('*')
        .eq('id', institutionId)
        .maybeSingle();

      if (queryError) {
        setError(`Não foi possível carregar os dados da instituição: ${queryError.message}`);
        return;
      }

      if (!data) {
        setError('A instituição vinculada não foi encontrada.');
        return;
      }

      const nextInstitution = mapInstitution(data);
      setInstitution(nextInstitution);
      setDraft(toDraft(nextInstitution));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados da instituição.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadInstitution();
  }, [loadInstitution]);

  const refreshInstitution = useCallback(async () => {
    setRefreshing(true);
    await loadInstitution(false);
    setRefreshing(false);
  }, [loadInstitution]);

  const hasChanges = Boolean(
    institution &&
    (
      draft.name.trim() !== institution.name ||
      draft.email.trim() !== (institution.email ?? '') ||
      draft.phone.trim() !== (institution.phone ?? '') ||
      draft.address.trim() !== (institution.address ?? '') ||
      draft.city.trim() !== (institution.city ?? '')
    ),
  );

  const beginEdit = () => {
    if (!canEdit || !institution) return;
    setDraft(toDraft(institution));
    setError('');
    setSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(toDraft(institution));
    setError('');
    setEditing(false);
  };

  const saveInstitution = async () => {
    if (!institution || !canEdit) return;

    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) {
      setError('Informe o nome da instituição.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail institucional válido.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data, error: updateError } = await supabase
        .from('instituicoes')
        .update({
          nome: name,
          email: email || null,
          telefone: draft.phone.trim() || null,
          endereco: draft.address.trim() || null,
          cidade: draft.city.trim() || null,
        })
        .eq('id', institution.id)
        .select('*')
        .maybeSingle();

      if (updateError) {
        setError(`Não foi possível salvar as informações: ${updateError.message}`);
        return;
      }

      if (!data) {
        setError('Nenhuma alteração foi salva. Verifique se sua conta tem permissão de administrador nesta instituição.');
        return;
      }

      const updatedInstitution = mapInstitution(data);
      setInstitution(updatedInstitution);
      setDraft(toDraft(updatedInstitution));
      setEditing(false);
      setSaved(true);
      await refreshUser();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar os dados da instituição.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !institution) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando dados da instituição...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: Math.max(insets.top, 18) + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Voltar">
            <ArrowLeft size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Dados da Instituição</Text>
            <Text style={styles.headerSubtitle}>{institution?.name ?? 'Instituição atual'}</Text>
          </View>
          <View style={styles.headerIcon}><Building2 size={22} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.headerDescription}>
          Consulte e atualize as informações principais da sua instituição.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: 44 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshInstitution} tintColor={theme.primary} />
        }
      >
        {error ? (
          <View style={styles.warningBanner}>
            <CircleHelp size={18} color="#92400E" />
            <Text style={styles.warningText}>{error}</Text>
          </View>
        ) : null}

        {institution ? (
          <>
            <Card style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]} padding={15}>
              <View style={[styles.heroIcon, { backgroundColor: theme.primary + '14' }]}>
                <Building2 size={23} color={theme.primary} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={2}>{institution.name}</Text>
                <Text style={[styles.heroMeta, { color: theme.textMuted }]}>
                  {institution.city || 'Cidade não informada'} · {institution.slug}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: institution.active ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: institution.active ? '#065F46' : '#991B1B' }]}>
                  {institution.active ? 'Ativa' : 'Inativa'}
                </Text>
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderMain}>
                <View style={[styles.sectionIcon, { backgroundColor: theme.surface }]}>
                  <Building2 size={19} color={theme.primary} />
                </View>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações da instituição</Text>
                  <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                    Identificação, contato e localização.
                  </Text>
                </View>
              </View>
              {!editing && canEdit ? (
                <TouchableOpacity
                  onPress={beginEdit}
                  style={[styles.editAction, { backgroundColor: theme.primary }]}
                  accessibilityLabel="Editar dados da instituição"
                >
                  <Pencil size={15} color="#FFFFFF" />
                  <Text style={styles.editActionText}>Editar</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {editing ? (
              <Card style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]} padding={16}>
                <FormField
                  label="Nome da instituição *"
                  value={draft.name}
                  onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
                  placeholder="Nome da escola ou instituição"
                  theme={theme}
                />
                <FormField
                  label="E-mail institucional"
                  value={draft.email}
                  onChangeText={(email) => setDraft((current) => ({ ...current, email }))}
                  placeholder="contato@instituicao.com.br"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  theme={theme}
                />
                <FormField
                  label="Telefone"
                  value={draft.phone}
                  onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))}
                  placeholder="(00) 00000-0000"
                  keyboardType="phone-pad"
                  theme={theme}
                />
                <FormField
                  label="Endereço"
                  value={draft.address}
                  onChangeText={(address) => setDraft((current) => ({ ...current, address }))}
                  placeholder="Rua, número e complemento"
                  theme={theme}
                />
                <FormField
                  label="Cidade"
                  value={draft.city}
                  onChangeText={(city) => setDraft((current) => ({ ...current, city }))}
                  placeholder="Cidade"
                  theme={theme}
                />

                <View style={styles.formActions}>
                  <Button
                    title="Cancelar"
                    onPress={cancelEdit}
                    variant="outline"
                    color={theme.textMuted}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Salvar alterações"
                    onPress={saveInstitution}
                    loading={saving}
                    disabled={!hasChanges}
                    color={theme.primary}
                    style={styles.actionButton}
                  />
                </View>
              </Card>
            ) : (
              <>
                <InfoSection title="Identificação" theme={theme}>
                  <InfoRow label="Nome" value={institution.name} theme={theme} />
                  <InfoRow label="Código da instituição" value={institution.slug} theme={theme} />
                  <InfoRow label="Cadastrada em" value={formatDate(institution.created_at)} theme={theme} last />
                </InfoSection>

                <InfoSection title="Contato e localização" theme={theme}>
                  <InfoRow
                    label="E-mail institucional"
                    value={institution.email || 'Não informado'}
                    icon={<Mail size={15} color={theme.textMuted} />}
                    theme={theme}
                  />
                  <InfoRow
                    label="Telefone"
                    value={institution.phone || 'Não informado'}
                    icon={<Phone size={15} color={theme.textMuted} />}
                    theme={theme}
                  />
                  <InfoRow
                    label="Endereço"
                    value={institution.address || 'Não informado'}
                    icon={<MapPin size={15} color={theme.textMuted} />}
                    theme={theme}
                  />
                  <InfoRow label="Cidade" value={institution.city || 'Não informada'} theme={theme} last />
                </InfoSection>

                {canEdit ? (
                  <Text style={[styles.editHint, { color: theme.textMuted }]}>
                    Os dados podem ser atualizados por um administrador da instituição.
                  </Text>
                ) : (
                  <Text style={[styles.editHint, { color: theme.textMuted }]}>
                    Visualização somente leitura. Apenas administradores podem alterar estes dados.
                  </Text>
                )}
              </>
            )}
          </>
        ) : (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Building2 size={27} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Instituição indisponível</Text>
            <Text style={[styles.emptyDescription, { color: theme.textMuted }]}>
              Não foi possível localizar uma instituição vinculada à sua conta.
            </Text>
            <Button title="Tentar novamente" onPress={() => void loadInstitution()} color={theme.primary} />
          </Card>
        )}

        {saved ? (
          <View style={styles.savedBanner}>
            <Check size={16} color="#065F46" />
            <Text style={styles.savedText}>Dados da instituição salvos com sucesso.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoSection({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoSection}>
      <Text style={[styles.infoSectionTitle, { color: theme.text }]}>{title}</Text>
      <Card style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]} padding={0}>
        {children}
      </Card>
    </View>
  );
}

function InfoRow({
  label,
  value,
  theme,
  icon,
  last = false,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
  icon?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }, last && styles.infoRowLast]}>
      <View style={styles.infoLabelRow}>
        {icon}
        <Text style={[styles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  multiline = false,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: ReturnType<typeof useTheme>;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        accessibilityLabel={label}
        style={[
          styles.fieldInput,
          { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
          multiline && styles.multilineInput,
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerTitles: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 2 },
  headerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19, marginTop: 18 },
  content: { padding: 16, gap: 15 },
  warningBanner: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 11, padding: 12 },
  warningText: { flex: 1, color: '#92400E', fontSize: 12, lineHeight: 17 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14 },
  heroIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  heroInfo: { flex: 1, minWidth: 0, gap: 4 },
  heroName: { fontSize: 16, fontWeight: '800' },
  heroMeta: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 3 },
  sectionHeaderMain: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionDescription: { fontSize: 12, marginTop: 2 },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 },
  editActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  infoSection: { gap: 9 },
  infoSectionTitle: { fontSize: 14, fontWeight: '800' },
  infoCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13 },
  infoRow: { minHeight: 51, justifyContent: 'center', gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  formCard: { borderWidth: 1, borderRadius: 13, gap: 15 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  fieldInput: { minHeight: 46, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  multilineInput: { minHeight: 82, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 9, marginTop: 4 },
  actionButton: { flex: 1 },
  editHint: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 10 },
  savedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 10 },
  savedText: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  emptyCard: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});