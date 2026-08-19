import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '@/constants/theme';

export type ContributeAction = 'experience' | 'ask' | 'avoid';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: ContributeAction) => void;
};

const ACTIONS: { id: ContributeAction; title: string; sub: string }[] = [
  {
    id: 'experience',
    title: 'Share an experience',
    sub: 'A memory, feeling, or place that made the city feel alive',
  },
  {
    id: 'ask',
    title: 'Ask a local',
    sub: 'Where do people go after a hard day? What’s worth feeling?',
  },
  {
    id: 'avoid',
    title: 'What should I skip?',
    sub: 'Crowds, delays, or places that lost their magic today',
  },
];

export function ContributeSheet({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>What do you want to share?</Text>
          <Text style={styles.sub}>
            Travelers aren’t looking for ratings — they’re looking for stories.
          </Text>

          {ACTIONS.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => {
                onClose();
                onSelect(a.id);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowTitle}>{a.title}</Text>
              <Text style={styles.rowSub}>{a.sub}</Text>
            </Pressable>
          ))}

          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    color: colors.text,
  },
  sub: {
    marginTop: 6,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  row: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  pressed: {
    opacity: 0.7,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  rowSub: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  cancel: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
});
