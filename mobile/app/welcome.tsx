import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, FadeIn, GhostButton, PrimaryButton, Screen } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

const STORY_TILES = [
  { label: 'Sunset after a hard day', tint: colors.sun, accent: colors.accent },
  { label: 'Tea stall locals never leave', tint: colors.dusk, accent: colors.primary },
  { label: 'Street that softens after rain', tint: colors.cream, accent: colors.mint },
  { label: 'Noodle cart guides never list', tint: colors.goldSoft, accent: colors.gold },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const continueAsGuest = useAppStore((s) => s.continueAsGuest);

  const getStarted = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <Screen atmosphere>
      <View
        style={[
          styles.container,
          { paddingTop: 32, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <FadeIn>
          <BrandMark size="lg" />

          <Text style={styles.headline}>
            Not just places.{'\n'}
            <Text style={styles.headlineAccent}>Stories & moments.</Text>
          </Text>
          <Text style={styles.sub}>
            Feel a city through memories — not ratings.
          </Text>

          <View style={styles.tileGrid}>
            {STORY_TILES.map((tile) => (
              <View key={tile.label} style={[styles.tile, { backgroundColor: tile.tint }]}>
                <View style={[styles.tileDot, { backgroundColor: tile.accent }]} />
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={120}>
          <PrimaryButton label="Feel a city" onPress={getStarted} />
          <GhostButton
            label="Sign in"
            onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })}
            style={{ marginTop: spacing.sm }}
          />
          <Pressable
            onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
            hitSlop={10}
            style={styles.accountHit}
          >
            <Text style={styles.accountText}>Create account</Text>
          </Pressable>
        </FadeIn>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  headline: {
    marginTop: spacing.xl,
    fontFamily: fonts.serifBold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: colors.text,
    maxWidth: 340,
  },
  headlineAccent: {
    color: colors.primary,
  },
  sub: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    maxWidth: 280,
  },
  tileGrid: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47%',
    minHeight: 88,
    borderRadius: radii.lg,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tileLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  accountHit: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 10,
  },
  accountText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textDim,
  },
});
