import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Bell, CheckCheck, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { Notification, Communication } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

type Tab = 'notifications' | 'communications';

const notifTypeConfig: Record<string, { variant: 'info' | 'warning' | 'success' | 'danger' | 'neutral'; label: string }> = {
  info: { variant: 'info', label: 'Informação' },
  warning: { variant: 'warning', label: 'Atenção' },
  success: { variant: 'success', label: 'Sucesso' },
  alert: { variant: 'danger', label: 'Alerta' },
  grade: { variant: 'info', label: 'Nota' },
  attendance: { variant: 'warning', label: 'Frequência' },
  occurrence: { variant: 'danger', label: 'Ocorrência' },
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const institutionId = user?.currentInstitution?.id;

  const loadData = async () => {
    if (!user?.id || !institutionId) return;
    const [notifRes, commRes] = await Promise.all([
      supabase.from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('communications')
        .select('*, sender:profiles!sender_id(full_name)')
        .eq('institution_id', institutionId)
        .order('published_at', { ascending: false })
        .limit(30),
    ]);
    setNotifications(notifRes.data ?? []);
    setCommunications(commRes.data ?? []);
  };

  useEffect(() => { loadData(); }, [user?.id, institutionId]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('recipient_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Avisos e Notificações</Text>
          {tab === 'notifications' && unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <CheckCheck size={16} color="#FFFFFF" />
              <Text style={styles.markAllText}>Marcar lidas</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.tabs}>
          {(['notifications', 'communications'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'notifications' ? `Notificações${unreadCount > 0 ? ` (${unreadCount})` : ''}` : 'Comunicados'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'notifications' ? (
          notifications.length === 0 ? (
            <EmptyState
              icon={<Bell size={28} color="#9CA3AF" />}
              title="Nenhuma notificação"
              description="Você receberá alertas sobre notas, frequência e ocorrências aqui."
            />
          ) : (
            notifications.map(n => {
              const cfg = notifTypeConfig[n.type] ?? notifTypeConfig.info;
              return (
                <TouchableOpacity key={n.id} onPress={() => !n.read && markRead(n.id)}>
                  <Card style={[styles.notifCard, !n.read && styles.notifUnread]} padding={14}>
                    {!n.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                    <View style={styles.notifHeader}>
                      <Badge label={cfg.label} variant={cfg.variant} />
                      <Text style={styles.notifTime}>
                        {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>
                      {n.title}
                    </Text>
                    <Text style={styles.notifMsg}>{n.message}</Text>
                  </Card>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          communications.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={28} color="#9CA3AF" />}
              title="Nenhum comunicado"
              description="Comunicados da escola e professores aparecerão aqui."
            />
          ) : (
            communications.map(comm => (
              <Card key={comm.id} style={styles.commCard} padding={14}>
                {comm.pinned && (
                  <View style={styles.pinnedBadge}>
                    <Badge label="Fixado" variant="warning" />
                  </View>
                )}
                <Text style={styles.commTitle}>{comm.title}</Text>
                <Text style={styles.commMsg}>{comm.message}</Text>
                <View style={styles.commFooter}>
                  <Text style={styles.commSender}>
                    {(comm as any).sender?.full_name ?? 'Escola'}
                  </Text>
                  <Text style={styles.commDate}>
                    {new Date(comm.published_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </Card>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 12, paddingHorizontal: 20, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  markAllText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 4 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  notifCard: { position: 'relative', gap: 6 },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: '#1A56DB' },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  notifTitleUnread: { color: '#111827', fontWeight: '700' },
  notifMsg: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  commCard: { gap: 8 },
  pinnedBadge: { marginBottom: 2 },
  commTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  commMsg: { fontSize: 13, color: '#374151', lineHeight: 20 },
  commFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginTop: 4 },
  commSender: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  commDate: { fontSize: 12, color: '#9CA3AF' },
});
