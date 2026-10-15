import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../common/Button';
import { IconCircle } from '../common/IconCircle';
import { FadeInView, PressableScale, haptic } from '../common/Motion';
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
import { LessonEntry, Rating } from '../../types';
import { LearningService } from '../../services/learningService';
import { formatDateDisplay, getTodayDateString, shiftDateString } from '../../utils/dateUtils';
import { RatingBadge, RatingChips, RATING_COLORS } from './RatingChips';

interface ChapterRatingModalProps {
  /** null hides the modal. */
  target: {
    studentId: string;
    bookId: string;
    bookTitle: string;
    chapterId: string;
    chapterTitle: string;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Records one day's rating for a chapter and shows the chapter's past ratings.
 * The parent should give it a `key` per chapter so form state resets between chapters.
 */
export const ChapterRatingModal: React.FC<ChapterRatingModalProps> = ({
  target,
  onClose,
  onSaved,
}) => {
  const [date, setDate] = useState(getTodayDateString());
  const [rating, setRating] = useState<Rating | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [history, setHistory] = useState<LessonEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  // Load this chapter's history once per target
  useEffect(() => {
    if (!target) return;
    let active = true;
    (async () => {
      const entries = await LearningService.getChapterHistory(target.studentId, target.chapterId);
      if (active) setHistory(entries);
    })();
    return () => {
      active = false;
    };
  }, [target]);

  const existing = history?.find((h) => h.date === date) || null;

  // Prefill the form from an existing entry when the selected date has one
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const prefillKey = history ? `${date}|${existing?.id ?? 'new'}` : null;
  if (prefillKey && prefillKey !== prefilledFor) {
    setPrefilledFor(prefillKey);
    setRating(existing?.rating ?? null);
    setIsCompleted(existing?.isCompleted ?? false);
    setRemarks(existing?.remarks ?? '');
  }

  if (!target) return null;

  const today = getTodayDateString();

  const handleSave = async () => {
    if (!rating) {
      Alert.alert('Choose a rating', 'Select Excellent, Good, Needs Improvement or Bad.');
      return;
    }
    try {
      setSaving(true);
      await LearningService.recordLesson(target.studentId, date, {
        bookId: target.bookId,
        chapterId: target.chapterId,
        rating,
        isCompleted,
        remarks,
      });
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save rating.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this entry?', `${formatDateDisplay(date)} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await LearningService.deleteLesson(target.studentId, target.chapterId, date);
          onSaved();
        },
      },
    ]);
  };

  const arabicTitle = isArabicText(target.chapterTitle);
  const canGoForward = date < today;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <IconCircle icon="bookmark" size={42} square />
            <View style={styles.headerText}>
              <Text style={styles.subtitle} numberOfLines={1}>
                {target.bookTitle}
              </Text>
              <Text
                style={[
                  styles.title,
                  arabicAware(target.chapterTitle, 18),
                  arabicTitle && styles.rtl,
                ]}
              >
                {target.chapterTitle}
              </Text>
            </View>
            <PressableScale
              onPress={onClose}
              style={styles.closeBtn}
              pressedScale={0.9}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </PressableScale>
          </View>

          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: Spacing.xxxl + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dateRow}>
              <PressableScale
                onPress={() => {
                  haptic.select();
                  setDate(shiftDateString(date, -1));
                }}
                style={styles.dateBtn}
                pressedScale={0.9}
                accessibilityLabel="Previous day"
              >
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </PressableScale>
              <View style={styles.dateCenter}>
                <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
                <Text style={styles.dateText}>
                  {date === today ? 'Today' : formatDateDisplay(date)}
                </Text>
              </View>
              <PressableScale
                onPress={() => {
                  haptic.select();
                  setDate(shiftDateString(date, 1));
                }}
                disabled={!canGoForward}
                style={[styles.dateBtn, !canGoForward && styles.dateBtnDisabled]}
                pressedScale={0.9}
                accessibilityLabel="Next day"
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={canGoForward ? Colors.primary : Colors.borderDark}
                />
              </PressableScale>
            </View>

            <Text style={styles.label}>How did the student do?</Text>
            <RatingChips value={rating} onChange={setRating} />

            <PressableScale
              style={[styles.checkRow, isCompleted && styles.checkRowOn]}
              pressedScale={0.98}
              onPress={() => {
                haptic.select();
                setIsCompleted((v) => !v);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCompleted }}
            >
              <View style={[styles.checkbox, isCompleted && styles.checkboxOn]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={15} color={Colors.textInverse} />
                ) : null}
              </View>
              <Text style={[styles.checkLabel, isCompleted && styles.checkLabelOn]}>
                Chapter completed (move to next chapter)
              </Text>
            </PressableScale>

            <TextInput
              style={styles.note}
              placeholder="Teacher remarks (optional)"
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.primary}
              cursorColor={Colors.primary}
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />

            <View style={styles.buttons}>
              {existing ? (
                <Button
                  title="Delete"
                  variant="secondary"
                  icon="trash-outline"
                  onPress={handleDelete}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Button
                title={existing ? 'Update' : 'Save'}
                icon="checkmark"
                onPress={handleSave}
                loading={saving}
                style={{ flex: 2 }}
              />
            </View>

            <View style={styles.historyHeader}>
              <Text style={styles.overline}>History</Text>
              {history && history.length > 0 ? (
                <View style={styles.historyCount}>
                  <Text style={styles.historyCountText}>{history.length}</Text>
                </View>
              ) : null}
            </View>
            {history === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : history.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
                <Text style={styles.empty}>No ratings yet for this chapter.</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.map((h, i) => (
                  <FadeInView key={h.id} index={i}>
                    <PressableScale
                      style={[
                        styles.historyRow,
                        i > 0 && styles.historyRowBorder,
                        h.date === date && styles.historyRowActive,
                      ]}
                      pressedScale={0.98}
                      onPress={() => {
                        haptic.select();
                        setDate(h.date);
                      }}
                    >
                      <View
                        style={[styles.historyDot, { backgroundColor: RATING_COLORS[h.rating].fg }]}
                      />
                      <Text style={styles.historyDate}>{formatDateDisplay(h.date)}</Text>
                      <RatingBadge rating={h.rating} />
                      {h.isCompleted ? (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      ) : null}
                      {h.remarks ? (
                        <Text style={styles.historyRemarks} numberOfLines={1}>
                          {h.remarks}
                        </Text>
                      ) : null}
                    </PressableScale>
                  </FadeInView>
                ))}
              </View>
            )}
          </ScrollView>
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
    maxHeight: '88%',
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
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.titleMedium,
  },
  subtitle: {
    ...Typography.overline,
    color: Colors.accentDark,
    marginBottom: 2,
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
  },
  dateBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  dateBtnDisabled: {
    backgroundColor: Colors.surfaceSubtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Typography.titleSmall,
    fontFamily: Fonts.bold,
    color: Colors.primaryDark,
  },
  label: {
    ...Typography.titleSmall,
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  checkRowOn: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.medium,
    flex: 1,
  },
  checkLabelOn: {
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  note: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.medium,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceRaised,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  overline: {
    ...Typography.overline,
  },
  historyCount: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  historyCountText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    color: Colors.primary,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
  },
  empty: {
    ...Typography.bodySmall,
  },
  historyList: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  historyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  historyRowActive: {
    backgroundColor: Colors.primarySoft,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  historyDate: {
    ...Typography.bodySmall,
    fontFamily: Fonts.semibold,
    color: Colors.text,
    width: 92,
  },
  historyRemarks: {
    ...Typography.caption,
    flex: 1,
  },
});
