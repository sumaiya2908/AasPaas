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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BackLink, Chip, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { getCity } from '@/data/cities';
import { STORY_PROMPT_OPTIONS } from '@/data/moments';
import { VIBE_TAG_OPTIONS, VibeTag } from '@/data/community';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { createPost } from '@/services/aaspaasApi';
import { useAppStore } from '@/store/useAppStore';

/**
 * Share a moment — story-first contribution, not a review form.
 */
export default function ShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isAvoid = mode === 'avoid';
  const cityId = useAppStore((s) => s.selectedCityId) ?? 'jaipur';
  const customCities = useAppStore((s) => s.customCities);
  const isGuest = useAppStore((s) => s.isGuest);
  const user = useAppStore((s) => s.user);
  const accessToken = useAppStore((s) => s.accessToken);
  const city = getCity(cityId, customCities);

  const [text, setText] = useState('');
  const [place, setPlace] = useState('');
  const [prompt, setPrompt] = useState<string>(STORY_PROMPT_OPTIONS[0].prompt);
  const [tags, setTags] = useState<VibeTag[]>(isAvoid ? ['avoid'] : ['local']);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canPost = Boolean(user) && !isGuest;

  const toggle = (id: VibeTag) => {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!canPost || !text.trim()) return;
    setLoading(true);
    setError(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (accessToken) {
      try {
        await createPost(accessToken, {
          type: isAvoid ? 'avoid' : 'experience',
          text: text.trim(),
          cityId,
          cityName: city.name,
          neighborhood: place.trim() || undefined,
          vibeTags: tags,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not publish. Try again.');
        setLoading(false);
        return;
      }
    }

    setDone(true);
    setLoading(false);
  };

  if (!canPost) {
    return (
      <Screen>
        <View style={[styles.content, { paddingTop: 12 }]}>
          <BackLink label="Back" onPress={() => router.back()} />
          <Title style={{ marginTop: spacing.md }}>Sign in to contribute</Title>
          <Muted style={{ marginTop: 8 }}>
            Guests can explore {city.name}. Sharing needs an account.
          </Muted>
          <PrimaryButton
            label="Sign in"
            onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })}
            style={{ marginTop: spacing.xl }}
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
            styles.content,
            { paddingTop: 12, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <BackLink label="Back" onPress={() => router.back()} />
          <Title style={{ marginTop: spacing.md }}>
            {isAvoid ? 'What should people skip?' : 'Share a moment'}
          </Title>
          <Muted style={{ marginTop: 8 }}>
            {isAvoid
              ? `${city.name} · keep travelers safe and honest`
              : `${city.name} · a memory, feeling, or little place that made it feel alive`}
          </Muted>

          {done ? (
            <View style={styles.doneCard}>
              <Text style={styles.doneText}>
                Thank you. Stories like yours help someone feel {city.name} through people — not ratings.
              </Text>
              <PrimaryButton label="Back to Explore" onPress={() => router.replace('/(tabs)')} style={{ marginTop: spacing.md }} />
            </View>
          ) : (
            <>
              {!isAvoid ? (
                <>
                  <Text style={styles.label}>Start from a feeling</Text>
                  <View style={styles.tags}>
                    {STORY_PROMPT_OPTIONS.map((p) => (
                      <Chip
                        key={p.id}
                        label={p.label}
                        selected={prompt === p.prompt}
                        onPress={() => setPrompt(p.prompt)}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>{isAvoid ? 'What to skip' : 'Your story'}</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={
                  isAvoid
                    ? 'e.g. Amer Fort parking after 4pm is rough today'
                    : `${prompt} Tell it like you’d tell a friend visiting for the first time.`
                }
                placeholderTextColor={colors.textDim}
                multiline
                style={styles.input}
              />

              <Text style={styles.label}>Neighborhood or spot (optional)</Text>
              <TextInput
                value={place}
                onChangeText={setPlace}
                placeholder="Area or place — not an exact pin"
                placeholderTextColor={colors.textDim}
                style={styles.single}
              />

              <Text style={styles.label}>Vibe tags</Text>
              <View style={styles.tags}>
                {VIBE_TAG_OPTIONS.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    selected={tags.includes(t.id)}
                    onPress={() => toggle(t.id)}
                  />
                ))}
              </View>

              <PrimaryButton
                label={isAvoid ? 'Post warning' : 'Share this moment'}
                onPress={submit}
                disabled={!text.trim()}
                loading={loading}
                style={{ marginTop: spacing.xl }}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  label: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  input: {
    minHeight: 140,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.cream,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
    textAlignVertical: 'top',
  },
  single: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 48,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  doneCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
});
