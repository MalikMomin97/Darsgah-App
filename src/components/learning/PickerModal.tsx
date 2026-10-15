import React from 'react';
import { View, Text, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
  Fonts,
  Shadows,
  arabicAware,
  isArabicText,
} from '../../config/theme';
import { FadeInView, PressableScale, haptic } from '../common/Motion';

export interface PickerOption {
  id: string;
  label: string;
  hint?: string;
  /** Shows a check mark, e.g. surah already memorized. */
  done?: boolean;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedId?: string | null;
  emptyText?: string;
  onSelect: (option: PickerOption) => void;
  onClose: () => void;
  onBack?: () => void;
}

/** Splits a "12. Title" label into its number and title so the number can sit in a badge. */
function splitNumbered(label: string): { num: string | null; text: string } {
  const m = /^(\d+)\.\s+([\s\S]*)$/.exec(label);
  return m ? { num: m[1], text: m[2] } : { num: null, text: label };
}

export const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selectedId,
  emptyText = 'Nothing to choose yet. Add items from the Curriculum tab.',
  onSelect,
  onClose,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Spacing.lg + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {onBack ? (
              <PressableScale
                onPress={onBack}
                style={styles.headerBtn}
                pressedScale={0.9}
                hitSlop={8}
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </PressableScale>
            ) : null}
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {options.length > 0 ? (
                <Text style={styles.count}>
                  {options.length} {options.length === 1 ? 'option' : 'options'}
                </Text>
              ) : null}
            </View>
            <PressableScale
              onPress={onClose}
              style={styles.headerBtn}
              pressedScale={0.9}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </PressableScale>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="file-tray-outline" size={26} color={Colors.primary} />
                </View>
                <Text style={styles.empty}>{emptyText}</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const selected = item.id === selectedId;
              const { num, text } = splitNumbered(item.label);
              const arabic = isArabicText(text);
              const isCurrentHint = item.hint === 'current';
              return (
                <FadeInView index={index}>
                  <PressableScale
                    style={[styles.option, selected && styles.optionSelected]}
                    pressedScale={0.98}
                    onPress={() => {
                      haptic.select();
                      onSelect(item);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.numBadge,
                        item.done && styles.numBadgeDone,
                        selected && styles.numBadgeSelected,
                      ]}
                    >
                      {num ? (
                        <Text
                          style={[
                            styles.numText,
                            item.done && { color: Colors.success },
                            selected && { color: Colors.textInverse },
                          ]}
                        >
                          {num}
                        </Text>
                      ) : (
                        <Ionicons
                          name="book-outline"
                          size={16}
                          color={selected ? Colors.textInverse : Colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.optionText}>
                      <Text
                        style={[
                          styles.optionLabel,
                          selected && styles.optionLabelSelected,
                          arabicAware(text, 15),
                          arabic && styles.rtl,
                        ]}
                      >
                        {text}
                      </Text>
                      {item.hint ? (
                        isCurrentHint ? (
                          <View style={[styles.currentPill, arabic && styles.selfEnd]}>
                            <Text style={styles.currentPillText}>Current</Text>
                          </View>
                        ) : (
                          <Text style={[styles.optionHint, arabic && styles.rtl]}>{item.hint}</Text>
                        )
                      ) : null}
                    </View>
                    {selected ? (
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={15} color={Colors.textInverse} />
                      </View>
                    ) : item.done ? (
                      <Ionicons name="checkmark-done" size={19} color={Colors.success} />
                    ) : null}
                  </PressableScale>
                </FadeInView>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '78%',
    ...Shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.borderDark,
    marginTop: Spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...Typography.titleMedium,
  },
  count: {
    ...Typography.caption,
    marginTop: 1,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryLight,
  },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeDone: {
    backgroundColor: Colors.successLight,
  },
  numBadgeSelected: {
    backgroundColor: Colors.primary,
  },
  numText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...Typography.bodyLarge,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  optionLabelSelected: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  selfEnd: {
    alignSelf: 'flex-end',
  },
  optionHint: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  currentPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentLight,
  },
  currentPillText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    letterSpacing: 0.4,
    color: Colors.accentDark,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
