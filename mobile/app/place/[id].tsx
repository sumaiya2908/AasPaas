import { useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, BackLink, GhostButton, Muted, PrimaryButton, Screen, SectionLabel } from '@/components/ui';
import { getPlace } from '@/data/places';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const typeMeta: Record<string, { label: string; color: string }> = {
  recommendation: { label: 'Recommendation', color: colors.mint },
  hidden_gem: { label: 'Hidden Gem', color: colors.gold },
  warning: { label: 'Warning', color: colors.danger },
  question: { label: 'Question', color: colors.accent },
  photo: { label: 'Photo', color: colors.textMuted },
};

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isGuest = useAppStore((s) => s.isGuest);
  const place = getPlace(id);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fade]);

  if (!place) {
    return (
      <Screen>
        <View style={[styles.missing, { paddingTop: 40 }]}>
          <Text style={styles.name}>Place not found</Text>
          <GhostButton label="Back to Pulse" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const openMaps = () => {
    const q = encodeURIComponent(`${place.name}, ${place.area}`);
    Linking.openURL(`https://maps.apple.com/?q=${q}`);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackLink label="Pulse" onPress={() => router.back()} />

        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.brand}>AasPaas</Text>
          <Text style={styles.name}>{place.name}</Text>
          <Muted>
            {place.area} · {place.category} · Best {place.bestTime}
          </Muted>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={styles.score}>{place.livingScore}</Text>
              <Text style={styles.scoreLabel}>How alive</Text>
            </View>
            <View style={styles.vibeWrap}>
              {place.vibe.map((v) => (
                <View key={v} style={styles.vibe}>
                  <Text style={styles.vibeText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <SectionLabel>What people are feeling</SectionLabel>
          <Body style={{ marginBottom: spacing.lg }}>{place.aiSummary}</Body>

          <SectionLabel>Stories from people</SectionLabel>
          {place.experiences.map((exp) => {
            const meta = typeMeta[exp.type];
            return (
              <View key={exp.id} style={styles.expCard}>
                <View style={styles.expTop}>
                  <Text style={[styles.expType, { color: meta.color }]}>{meta.label}</Text>
                  <Muted>{exp.ago}</Muted>
                </View>
                <Text style={styles.expTitle}>{exp.title}</Text>
                <Body style={{ marginTop: 6 }}>{exp.body}</Body>
                <View style={styles.expMeta}>
                  <Text style={styles.author}>
                    {exp.author}
                    {exp.badge ? ` · ${exp.badge}` : ''}
                  </Text>
                  <Text style={styles.helpful}>♥ {exp.helpful}</Text>
                </View>
              </View>
            );
          })}

          <PrimaryButton
            label={isGuest ? 'Sign in to ask about this place' : 'Ask a question about this place'}
            onPress={() =>
              isGuest
                ? router.push({ pathname: '/auth', params: { mode: 'signin' } })
                : router.push({ pathname: '/ask', params: { placeId: place.id, placeName: place.name } })
            }
            style={{ marginTop: spacing.md }}
          />
          <GhostButton
            label="Open in Maps"
            onPress={openMaps}
            style={{ marginTop: spacing.sm }}
          />
          <GhostButton
            label="Build My Journey"
            onPress={() => router.push('/journey/build')}
            style={{ marginTop: spacing.sm }}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  missing: {
    paddingHorizontal: spacing.lg,
    gap: 16,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1.5,
    color: colors.gold,
  },
  name: {
    marginTop: 6,
    fontFamily: fonts.displayMedium,
    fontSize: 34,
    color: colors.text,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: spacing.lg,
    alignItems: 'center',
  },
  scoreBox: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.mint,
  },
  scoreLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textDim,
    textTransform: 'uppercase',
  },
  vibeWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibe: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vibeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text,
  },
  expCard: {
    marginBottom: 12,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  expType: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  expTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.text,
  },
  expMeta: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  author: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  helpful: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.accent,
  },
});
