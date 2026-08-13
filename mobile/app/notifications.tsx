import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackLink, GhostButton, Muted, Screen, Title } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import {
  listNotifications,
  markNotificationsRead,
  type ApiNotification,
} from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAppStore((s) => s.accessToken);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Sign in to see notifications.');
      return;
    }
    try {
      const res = await listNotifications(token);
      setItems(res.items);
      setUnread(res.unread);
      setError(null);
    } catch {
      setError('Could not load notifications.');
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const markAll = async () => {
    if (!token) return;
    await markNotificationsRead(token);
    await load();
  };

  const openItem = async (n: ApiNotification) => {
    if (token && !n.readAt) {
      await markNotificationsRead(token, n.id);
    }
    if (n.citySlug) {
      useAppStore.getState().setSelectedCityId(n.citySlug);
    }
    if (n.type === 'city_question') {
      router.replace({
        pathname: '/city/[id]',
        params: { id: n.citySlug || useAppStore.getState().selectedCityId || 'jaipur' },
      });
      return;
    }
    if (n.citySlug) {
      router.replace({ pathname: '/city/[id]', params: { id: n.citySlug } });
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <Screen mist>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 8, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <BackLink label="Back" onPress={() => router.back()} />
        <View style={styles.head}>
          <Title>Notifications</Title>
          {unread > 0 ? (
            <GhostButton label="Mark all read" onPress={markAll} style={{ marginTop: 0 }} />
          ) : null}
        </View>
        <Muted style={{ marginTop: 8 }}>
          Locals hear city questions. People exploring a city hear local updates.
        </Muted>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!error && items.length === 0 ? (
          <Text style={styles.empty}>Nothing yet.</Text>
        ) : null}

        <View style={styles.list}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openItem(n)}
              style={[styles.card, !n.readAt && styles.cardUnread]}
            >
              <Text style={styles.type}>{labelFor(n.type)}</Text>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.body} numberOfLines={3}>
                {n.body}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function labelFor(type: string) {
  if (type === 'city_question') return 'Question';
  if (type === 'city_avoid') return 'Avoid';
  if (type === 'city_update') return 'Update';
  return 'Note';
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  head: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  error: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodyMedium,
    color: colors.accent,
  },
  empty: {
    marginTop: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  list: {
    marginTop: spacing.lg,
    gap: 10,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  cardUnread: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  type: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.mint,
  },
  title: {
    marginTop: 6,
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: colors.text,
  },
  body: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
