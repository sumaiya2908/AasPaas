import { useMemo, useState } from 'react';
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
import { Chip, Muted, PrimaryButton, Screen, Title } from '@/components/ui';
import { CitySearchField } from '@/components/CitySearchField';
import { createCityShell } from '@/data/cities';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import {
  createCityStory,
  type ApiCity,
} from '@/services/aaspaasApi';
import { saveProfileWithApi, useAppStore } from '@/store/useAppStore';

const INTERESTS = [
  'Food',
  'Heritage',
  'Nightlife',
  'Nature',
  'Budget',
  'Photography',
  'Cafés',
  'Markets',
  'Art',
  'Family',
];

const STYLES = ['Backpacker', 'Foodie', 'Relaxed', 'Local explorer'];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const accessToken = useAppStore((s) => s.accessToken);
  const upsertCustomCity = useAppStore((s) => s.upsertCustomCity);

  const [homeCity, setHomeCity] = useState<ApiCity | null>(null);
  const [interests, setInterests] = useState<string[]>(['Food']);
  const [travelStyle, setTravelStyle] = useState(STYLES[0]);
  const [aboutCity, setAboutCity] = useState('');
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(
    () => Boolean(homeCity?.id) && interests.length > 0 && Boolean(travelStyle),
    [homeCity, interests.length, travelStyle]
  );

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const finish = async () => {
    if (!canContinue || !homeCity) return;
    setLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const shell = createCityShell({
      id: homeCity.id,
      slug: homeCity.slug,
      name: homeCity.name,
      state: homeCity.stateObj?.name || homeCity.state,
      country: homeCity.countryObj?.name || homeCity.country,
    });
    upsertCustomCity({
      ...shell,
      weather: homeCity.weather || shell.weather,
      tempC: homeCity.tempC ?? shell.tempC,
      mood: homeCity.mood?.length ? homeCity.mood : shell.mood,
      briefing: homeCity.briefing || shell.briefing,
    });

    await saveProfileWithApi({
      homeCityId: homeCity.id,
      homeCity: homeCity.name,
      interests,
      travelStyle,
      aboutCity: aboutCity.trim(),
      completed: true,
    });

    if (accessToken && aboutCity.trim().length >= 8) {
      await createCityStory(accessToken, {
        cityId: homeCity.id,
        content: aboutCity.trim(),
        source: 'ONBOARDING',
      }).catch(() => undefined);
    }

    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <Screen atmosphere>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: 24, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.kicker}>
            Almost there{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </Text>
          <Title>Where are you from?</Title>
          <Muted style={{ marginTop: 8 }}>
            Search and select your city. We never create cities from free text.
          </Muted>

          <Text style={styles.label}>Your home city</Text>
          <CitySearchField
            selected={homeCity}
            onSelect={setHomeCity}
            onClear={() => setHomeCity(null)}
          />

          {homeCity ? (
            <>
              <Text style={styles.label}>What does {homeCity.name} feel like to you?</Text>
              <Muted style={{ marginBottom: spacing.sm }}>
                Tell us about a moment, place, food, person, or feeling that makes your city special.
              </Muted>
              <TextInput
                value={aboutCity}
                onChangeText={setAboutCity}
                placeholder="Chaotic, colorful and full of little surprises. I love..."
                placeholderTextColor={colors.textDim}
                multiline
                style={styles.about}
              />
            </>
          ) : null}

          <Text style={styles.label}>What do you love?</Text>
          <View style={styles.wrap}>
            {INTERESTS.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={interests.includes(item)}
                onPress={() => toggleInterest(item)}
              />
            ))}
          </View>

          <Text style={styles.label}>Travel style</Text>
          <View style={styles.wrap}>
            {STYLES.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={travelStyle === item}
                onPress={() => setTravelStyle(item)}
              />
            ))}
          </View>

          <PrimaryButton
            label="Continue"
            onPress={finish}
            disabled={!canContinue}
            loading={loading}
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: spacing.sm,
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
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  about: {
    minHeight: 110,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
