import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { searchCities, type ApiCity } from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: ApiCity) => void;
  popular?: ApiCity[];
};

export function CitySearchSheet({ visible, onClose, onSelect, popular = [] }: Props) {
  const insets = useSafeAreaInsets();
  const recentCities = useAppStore((s) => s.recentCities);
  const clearRecentCities = useAppStore((s) => s.clearRecentCities);
  const customCities = useAppStore((s) => s.customCities);

  const [q, setQ] = useState('');
  const [results, setResults] = useState<ApiCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQ('');
      setResults([]);
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      searchCities(query, 10)
        .then((rows) => {
          setResults(rows.filter((c) => c.status !== 'COMING_SOON'));
          setError(null);
        })
        .catch(() => {
          setResults([]);
          setError("Couldn't load cities right now.");
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q, visible]);

  const recentAsApi = useMemo(() => {
    return recentCities.slice(0, 4).map((r) => {
      const cached = customCities.find((c) => c.id === r.id);
      return {
        id: r.id,
        slug: r.slug,
        dbId: r.id,
        name: r.name,
        state: r.state || cached?.state || '',
        country: r.country || cached?.country || '',
        weather: cached?.weather || '',
        tempC: cached?.tempC ?? 0,
        mood: cached?.mood || [],
        briefing: cached?.briefing || '',
      } satisfies ApiCity;
    });
  }, [recentCities, customCities]);

  const showBrowse = q.trim().length < 2;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topRow}>
          <Text style={styles.kicker}>Where should we take you?</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <TextInput
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder="Search your city..."
          placeholderTextColor={colors.textDim}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : null}
        {error ? (
          <Text style={styles.error}>
            {error}{' '}
            <Text style={styles.retry} onPress={() => setQ((v) => v + ' ')}>
              Try again
            </Text>
          </Text>
        ) : null}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {!showBrowse && results.length > 0 ? (
            <View style={styles.block}>
              {results.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onSelect(c)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowMeta}>
                    {[c.stateObj?.name || c.state, c.countryObj?.name || c.country]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!showBrowse && !loading && q.trim().length >= 2 && results.length === 0 && !error ? (
            <Text style={styles.empty}>No cities match that search.</Text>
          ) : null}

          {showBrowse && recentAsApi.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.sectionHead}>
                <Text style={styles.section}>Recent</Text>
                <Pressable onPress={clearRecentCities} hitSlop={8}>
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              </View>
              {recentAsApi.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onSelect(c)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowMeta}>
                    {[c.state, c.country].filter(Boolean).join(', ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {showBrowse && popular.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.section}>Popular</Text>
              {popular.slice(0, 6).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onSelect(c)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowMeta}>
                    {[c.stateObj?.name || c.state, c.countryObj?.name || c.country]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  kicker: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text,
    flex: 1,
    paddingRight: 12,
  },
  close: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.primary,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  block: {
    marginTop: spacing.xl,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: spacing.sm,
  },
  clear: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.text,
  },
  rowMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  empty: {
    marginTop: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  error: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.accent,
  },
  retry: {
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },
});
