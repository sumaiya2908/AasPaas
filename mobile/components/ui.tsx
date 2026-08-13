import { ReactNode, useRef, useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  TextProps,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, elevation, fonts, hit, radii, spacing, type } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
  /** Soft orbs — welcome / auth */
  atmosphere?: boolean;
  /** Gentle mist wash — Pulse and content homes */
  mist?: boolean;
  /**
   * Keep content clear of system chrome.
   * Top is always inset so scroll never goes under the status bar.
   */
  edges?: Edge[];
};

export function Screen({
  children,
  style,
  atmosphere = false,
  mist = false,
  edges = ['top'],
}: ScreenProps) {
  return (
    <View style={[styles.screen, style]}>
      {atmosphere ? (
        <>
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.orbOne, { backgroundColor: colors.orbAccent }]} />
          <View style={[styles.orbTwo, { backgroundColor: colors.orbTeal }]} />
          <View style={[styles.orbThree, { backgroundColor: colors.goldSoft }]} />
        </>
      ) : mist ? (
        <>
          <LinearGradient
            colors={colors.mistGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.mistBlob, { backgroundColor: colors.orbTeal }]} />
          <View style={[styles.mistBlobSun, { backgroundColor: colors.orbAccent }]} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}
      {/* Fixed inset: scroll content cannot slide under status bar / clock */}
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const titleSize = size === 'lg' ? 36 : size === 'sm' ? 18 : 24;
  return (
    <View>
      <Text style={[styles.brand, { fontSize: titleSize, letterSpacing: size === 'lg' ? -1 : -0.5 }]}>
        AasPaas
      </Text>
      {size !== 'sm' && <Text style={styles.tagline}>Stories · moments · people</Text>}
    </View>
  );
}

export function StepDots({ step, total = 2 }: { step: number; total?: number }) {
  return (
    <View
      style={styles.dots}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: step, min: 1, max: total }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i + 1 === step && styles.dotActive, i + 1 < step && styles.dotDone]}
        />
      ))}
    </View>
  );
}

export function BackLink({
  label = 'Back',
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.backHit, pressed && styles.pressed]}
    >
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryBtnOuter,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.accent, colors.accentBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryBtn}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryBtnText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ghostBtn, pressed && styles.btnPressed, style]}
    >
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.btnPressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SoftNudge({
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.nudge}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nudgeTitle}>{title}</Text>
        <Text style={styles.nudgeBody}>{body}</Text>
        <Pressable onPress={onAction} hitSlop={8} style={styles.nudgeAction}>
          <Text style={styles.nudgeActionText}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Pressable onPress={onDismiss} hitSlop={12} accessibilityLabel="Dismiss">
        <Text style={styles.nudgeDismiss}>Close</Text>
      </Pressable>
    </View>
  );
}

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 520, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 520, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, y]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>{children}</Animated.View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Body({
  children,
  style,
  ...rest
}: { children: ReactNode; style?: TextStyle } & Omit<TextProps, 'style' | 'children'>) {
  return (
    <Text style={[styles.body, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  orbOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -100,
    right: -90,
  },
  orbTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: 40,
    left: -100,
  },
  orbThree: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: '42%',
    right: -40,
  },
  mistBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    right: -60,
  },
  mistBlobSun: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: 120,
    left: -70,
  },
  brand: {
    fontFamily: fonts.serifBold,
    color: colors.text,
  },
  tagline: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    color: colors.textDim,
    fontSize: type.overline.fontSize,
    letterSpacing: 0.8,
    textTransform: 'none',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accent,
  },
  dotDone: {
    backgroundColor: colors.primary,
  },
  backHit: {
    minHeight: hit.min,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingRight: 12,
  },
  backText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontFamily: fonts.bodyMedium,
    color: colors.textDim,
    fontSize: type.overline.fontSize,
    letterSpacing: type.overline.letterSpacing,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtnOuter: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  primaryBtn: {
    minHeight: hit.comfortable,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.white,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ghostBtn: {
    borderRadius: radii.md,
    minHeight: hit.min,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  ghostBtnText: {
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  pressed: {
    opacity: 0.65,
  },
  chip: {
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    fontSize: 13,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    ...elevation.soft,
  },
  nudge: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  nudgeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  nudgeBody: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  nudgeAction: {
    marginTop: 10,
    minHeight: 28,
    justifyContent: 'center',
  },
  nudgeActionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent,
  },
  nudgeDismiss: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textDim,
    padding: 4,
  },
  title: {
    fontFamily: fonts.serif,
    color: colors.text,
    fontSize: type.title.fontSize,
    lineHeight: type.title.lineHeight,
    letterSpacing: type.title.letterSpacing,
  },
  body: {
    fontFamily: fonts.body,
    color: colors.text,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
  },
  muted: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
  },
});
