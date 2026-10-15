import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../../config/theme';
import { LessonEntry, Rating } from '../../types';
import { LearningService } from '../../services/learningService';
import { formatDateDisplay, getTodayDateString, shiftDateString } from '../../utils/dateUtils';
import { RatingBadge, RatingChips } from './RatingChips';

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

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{target.chapterTitle}</Text>
              <Text style={styles.subtitle}>{target.bookTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => setDate(shiftDateString(date, -1))} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.dateText}>
                {date === today ? 'Today' : formatDateDisplay(date)}
              </Text>
              <TouchableOpacity
                onPress={() => setDate(shiftDateString(date, 1))}
                disabled={date >= today}
                style={styles.iconBtn}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={date >= today ? Colors.border : Colors.primary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>How did the student do?</Text>
            <RatingChips value={rating} onChange={setRating} />

            <TouchableOpacity style={styles.checkRow} onPress={() => setIsCompleted((v) => !v)}>
              <Ionicons
                name={isCompleted ? 'checkbox' : 'square-outline'}
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.checkLabel}>Chapter completed (move to next chapter)</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.note}
              placeholder="Teacher remarks (optional)"
              placeholderTextColor={Colors.textMuted}
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

            <Text style={[styles.label, { marginTop: Spacing.lg }]}>History</Text>
            {history === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : history.length === 0 ? (
              <Text style={styles.empty}>No ratings yet for this chapter.</Text>
            ) : (
              history.map((h) => (
                <TouchableOpacity key={h.id} style={styles.historyRow} onPress={() => setDate(h.date)}>
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
                </TouchableOpacity>
              ))
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
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.titleSmall,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  body: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.sm,
  },
  dateText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  label: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checkLabel: {
    ...Typography.bodyMedium,
  },
  note: {
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    minHeight: 44,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  empty: {
    ...Typography.bodySmall,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
  },
  historyDate: {
    ...Typography.bodySmall,
    width: 96,
  },
  historyRemarks: {
    ...Typography.caption,
    flex: 1,
  },
});
