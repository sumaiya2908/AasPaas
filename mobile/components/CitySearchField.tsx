import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { searchCities, type ApiCity } from '@/services/aaspaasApi';

type Props = {
  placeholder?: string;
  selected: ApiCity | null;
  onSelect: (city: ApiCity) => void;
  onClear: () => void;
  /** When false, COMING_SOON cities are not selectable */
  allowComingSoon?: boolean;
};

/**
 * Canonical city search — user must SELECT a result.
 * Debounced API search; no free-text city creation.
 */
export function CitySearchField({
  placeholder = 'Search your city...',
  selected,
  onSelect,
  onClear,
  allowComingSoon = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return;
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      searchCities(q, 8)
        .then((rows) => {
          setResults(rows);
          setError(null);
        })
        .catch(() => {
          setResults([]);
          setError('Could not search cities. Is the API running?');
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, selected]);

  if (selected) {
    const region = [selected.stateObj?.name || selected.state, selected.countryObj?.name || selected.country]
      .filter(Boolean)
      .join(', ');
    return (
      <View style={styles.selectedBox}>
        <Text style={styles.selectedLabel}>Selected</Text>
        <Text style={styles.selectedValue}>{selected.name}</Text>
        <Text style={styles.meta}>{region}</Text>
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
      />
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.list}>
        {results.map((c) => {
          const region = [c.stateObj?.name || c.state, c.countryObj?.name || c.country]
            .filter(Boolean)
            .join(', ');
          const disabled = c.status === 'COMING_SOON' && !allowComingSoon;
          return (
            <Pressable
              key={c.id}
              disabled={disabled}
              onPress={() => {
                onSelect(c);
                setQuery('');
                setResults([]);
              }}
              style={({ pressed }) => [
                styles.row,
                disabled && styles.rowDisabled,
                pressed && !disabled && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>{region}</Text>
              {c.status === 'COMING_SOON' ? (
                <Text style={styles.soon}>Coming soon</Text>
              ) : null}
            </Pressable>
          );
        })}
        {!loading && query.trim().length >= 2 && results.length === 0 && !error ? (
          <Text style={styles.empty}>No matching cities. Try another spelling.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  list: {
    marginTop: 8,
    gap: 6,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  name: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  soon: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.gold,
  },
  empty: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textDim,
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
  },
  selectedBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
  },
  selectedLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.mint,
  },
  selectedValue: {
    marginTop: 4,
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.text,
  },
  change: {
    marginTop: 8,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
});
