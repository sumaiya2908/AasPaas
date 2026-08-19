import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Chip, GhostButton, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { getCity } from '@/data/cities';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { createPost } from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';

const TAGS = ['Budget', 'Food', 'Hidden Gem', 'Photography', 'Nightlife', 'Family'];

type AskFormProps = {
  embedded?: boolean;
  placeId?: string;
  placeName?: string;
  prefill?: string;
};

export function AskForm({ embedded, placeId, placeName, prefill }: AskFormProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cityId = useAppStore((s) => s.selectedCityId) ?? 'jaipur';
  const customCities = useAppStore((s) => s.customCities);
  const isGuest = useAppStore((s) => s.isGuest);
  const user = useAppStore((s) => s.user);
  const accessToken = useAppStore((s) => s.accessToken);
  const addQuestion = useAppStore((s) => s.addQuestion);
  const questions = useAppStore((s) => s.questions);
  const city = getCity(cityId, customCities);
  const canAsk = Boolean(user) && !isGuest;

  const [text, setText] = useState(
    prefill?.trim() ||
      (placeName ? `Any local tips for ${placeName}?` : ''),
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(['Food']);
  const [posted, setPosted] = useState(false);

  const cityQuestions = questions.filter((q) => q.cityId === cityId).slice(0, 5);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const goAuth = () => {
    router.push({ pathname: '/auth', params: { mode: 'signin' } });
  };

  const submit = async () => {
    if (!canAsk || !text.trim()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ok = addQuestion({
      cityId,
      placeId,
      text: text.trim(),
      tags: selectedTags,
    });
    if (accessToken) {
      try {
        await createPost(accessToken, {
          type: 'question',
          text: text.trim(),
          cityId,
          cityName: city.name,
          vibeTags: selectedTags,
        });
      } catch {
        // local question already saved
      }
    }
    if (ok) {
      setPosted(true);
      setText('');
    }
  };

  const topPad = embedded ? 20 : 16;

  if (!canAsk) {
    return (
      <Screen>
        <View style={[styles.container, { paddingTop: topPad, paddingBottom: insets.bottom + 24 }]}>
          {!embedded ? (
            <GhostButton
              label="Close"
              onPress={() => router.back()}
              style={{ alignSelf: 'flex-start', marginBottom: spacing.md }}
            />
          ) : null}
          <Title>Ask locals</Title>
          <Muted style={{ marginTop: 8 }}>
            Sign in to ask about the sunsets, tea stalls, and quiet streets that make {city.name} feel alive.
          </Muted>
          <View style={styles.gateCard}>
            <Text style={styles.gateTitle}>What you unlock</Text>
            <Text style={styles.gateItem}>· Ask for moments, not just places</Text>
            <Text style={styles.gateItem}>· Share stories travelers can’t Google</Text>
            <Text style={styles.gateItem}>· Journeys shaped by community memory</Text>
          </View>
          <View style={{ flex: 1 }} />
          <PrimaryButton label="Sign in" onPress={goAuth} />
          <GhostButton
            label="Create account"
            onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: topPad, paddingBottom: insets.bottom + (embedded ? 120 : 28) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {!embedded ? (
            <GhostButton
              label="Close"
              onPress={() => router.back()}
              style={{ alignSelf: 'flex-start', marginBottom: spacing.md }}
            />
          ) : null}

          <Text style={styles.kicker}>Primary · Ask</Text>
          <Title>Ask locals</Title>
          <Muted style={{ marginTop: 8 }}>
            {city.name}
            {placeName ? ` · ${placeName}` : ''} · usually under 20 seconds
          </Muted>

          {posted ? (
            <View style={styles.postedCard}>
              <Text style={styles.postedText}>Posted — locals in {city.name} can answer now.</Text>
            </View>
          ) : null}

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Where do locals go after a hard day? Best tea stall that isn’t in guides?"
            placeholderTextColor={colors.textDim}
            multiline
            style={styles.input}
          />

          <Text style={styles.label}>Tags</Text>
          <View style={styles.tags}>
            {TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>

          <PrimaryButton
            label="Post question"
            onPress={submit}
            disabled={!text.trim()}
            style={{ marginTop: spacing.lg }}
          />

          {cityQuestions.length > 0 ? (
            <>
              <Text style={[styles.label, { marginTop: spacing.xl }]}>Recent in {city.name}</Text>
              {cityQuestions.map((q) => (
                <View key={q.id} style={styles.qCard}>
                  <Text style={styles.qText}>{q.text}</Text>
                  <Muted style={{ marginTop: 6 }}>{q.tags.join(' · ')}</Muted>
                </View>
              ))}
            </>
          ) : null}

          <GhostButton
            label="Generate AI itinerary"
            onPress={() => router.push('/journey/build')}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accentBright,
    marginBottom: spacing.sm,
  },
  gateCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gateTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  gateItem: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  input: {
    marginTop: spacing.lg,
    minHeight: 140,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  label: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyBold,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  postedCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  postedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  qCard: {
    marginBottom: 10,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});
