import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { IconCircle } from '../../components/common/IconCircle';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FadeInView, PressableScale } from '../../components/common/Motion';
import { PickerModal } from '../../components/learning/PickerModal';
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
import { Book, Chapter } from '../../types';
import { BookService } from '../../services/bookService';
import { useAppNavigation, useAppRoute } from '../../navigation/appNavigation';

const NO_NEXT_BOOK = '__none__';

type EditorState =
  | { kind: 'book'; title: string; description: string }
  | { kind: 'addChapters'; text: string }
  | { kind: 'renameChapter'; chapterId: string; title: string };

export const BookDetailScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { bookId } = useAppRoute<'BookDetail'>().params;

  const [book, setBook] = useState<Book | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [nextPickerVisible, setNextPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, books, ch] = await Promise.all([
        BookService.getBookById(bookId),
        BookService.getBooks(false),
        BookService.getChapters(bookId),
      ]);
      setBook(b);
      setAllBooks(books);
      setChapters(ch);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load book.');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (action: () => Promise<void>) => {
    try {
      setSaving(true);
      await action();
      setEditor(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditor = () => {
    if (!editor || !book) return;
    if (editor.kind === 'book') {
      if (!editor.title.trim()) return Alert.alert('Validation', 'Book name is required.');
      return run(() =>
        BookService.updateBook(book.id, {
          title: editor.title,
          description: editor.description,
          nextBookId: book.nextBookId,
        })
      );
    }
    if (editor.kind === 'addChapters') {
      // One chapter per line, in the order typed
      const titles = editor.text
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);
      if (titles.length === 0) return Alert.alert('Validation', 'Enter at least one chapter.');
      return run(async () => {
        for (const t of titles) await BookService.addChapter(book.id, t);
      });
    }
    if (!editor.title.trim()) return Alert.alert('Validation', 'Chapter name is required.');
    return run(() => BookService.renameChapter(editor.chapterId, editor.title));
  };

  const handleSetNextBook = (nextId: string) => {
    if (!book) return;
    setNextPickerVisible(false);
    run(() =>
      BookService.updateBook(book.id, {
        title: book.title,
        description: book.description,
        nextBookId: nextId === NO_NEXT_BOOK ? null : nextId,
      })
    );
  };

  const handleRemoveChapter = (chapter: Chapter) => {
    Alert.alert(
      `Remove "${chapter.title}"?`,
      'It will be hidden for all students. Ratings already given are kept in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => run(() => BookService.archiveChapter(chapter.id)),
        },
      ]
    );
  };

  const handleToggleArchiveBook = () => {
    if (!book) return;
    if (book.isArchived) {
      run(() => BookService.unarchiveBook(book.id));
      return;
    }
    Alert.alert(
      `Remove "${book.title}"?`,
      'It can no longer be assigned. Students who already have it keep it and their history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await BookService.archiveBook(book.id);
              navigation.goBack();
            }),
        },
      ]
    );
  };

  if (loading) return <LoadingScreen message="Loading book..." />;

  if (!book) {
    return (
      <View style={styles.container}>
        <Header title="Book" onBack={navigation.goBack} />
        <EmptyState
          icon="alert-circle-outline"
          title="Book not found"
          description="It may have been deleted."
        />
      </View>
    );
  }

  const editorIcon =
    editor?.kind === 'book'
      ? 'create-outline'
      : editor?.kind === 'addChapters'
        ? 'list-outline'
        : 'pencil-outline';

  const header = (
    <View style={styles.headerBlock}>
      <FadeInView>
        <Card padding="xl" elevation="md">
          <View style={styles.bookTop}>
            <IconCircle
              icon={book.isArchived ? 'archive-outline' : 'book'}
              color={book.isArchived ? Colors.textMuted : Colors.primary}
              bg={book.isArchived ? Colors.surfaceSubtle : Colors.primaryLight}
              size={56}
              square
            />
            <View style={styles.bookTitleCol}>
              <Text style={[styles.bookTitle, arabicAware(book.title, 19)]}>{book.title}</Text>
              {book.description ? <Text style={styles.meta}>{book.description}</Text> : null}
              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Ionicons name="layers-outline" size={12} color={Colors.primary} />
                  <Text style={styles.statText}>
                    {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
                  </Text>
                </View>
                {book.isArchived ? (
                  <View style={[styles.statPill, styles.removedPill]}>
                    <Text style={[styles.statText, { color: Colors.danger }]}>Removed</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <PressableScale
              onPress={() =>
                setEditor({ kind: 'book', title: book.title, description: book.description || '' })
              }
              style={styles.editBtn}
              pressedScale={0.9}
              hapticOnPress
              accessibilityLabel="Edit book"
            >
              <Ionicons name="create-outline" size={19} color={Colors.primary} />
            </PressableScale>
          </View>

          <PressableScale
            style={styles.nextRow}
            onPress={() => setNextPickerVisible(true)}
            pressedScale={0.98}
            hapticOnPress
          >
            <IconCircle
              icon="arrow-forward-circle-outline"
              color={Colors.accentDark}
              bg={Colors.surface}
              size={36}
            />
            <View style={styles.nextTextCol}>
              <Text style={styles.label}>Next book after completion</Text>
              <Text style={[styles.nextValue, arabicAware(book.nextBookTitle, 14)]}>
                {book.nextBookTitle || 'None'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.accentDark} />
          </PressableScale>
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.hint}>
              When a student completes every chapter, you can promote them to the next book.
            </Text>
          </View>
        </Card>
      </FadeInView>

      <FadeInView index={1}>
        <SectionHeader
          title="Chapters"
          meta={`(${chapters.length})`}
          actionLabel="Add chapters"
          onAction={() => setEditor({ kind: 'addChapters', text: '' })}
          style={styles.sectionHeader}
        />
      </FadeInView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={book.title}
        subtitle={book.isArchived ? 'Removed book' : 'Book'}
        onBack={navigation.goBack}
        rightAction={{
          icon: book.isArchived ? 'refresh-outline' : 'trash-outline',
          label: book.isArchived ? 'Restore' : 'Remove',
          color: book.isArchived ? Colors.primary : Colors.danger,
          onPress: handleToggleArchiveBook,
        }}
      />

      <FlatList
        data={chapters}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="list-outline"
            title="No chapters yet"
            description="Add the chapters of this book in teaching order."
            actionTitle="Add chapters"
            onActionPress={() => setEditor({ kind: 'addChapters', text: '' })}
          />
        }
        renderItem={({ item, index }) => {
          const arabic = isArabicText(item.title);
          return (
            <FadeInView index={index + 2}>
              <Card padding="sm" style={styles.chapterCard}>
                <View style={styles.row}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.index}>{index + 1}</Text>
                  </View>
                  <Text
                    style={[
                      styles.chapterTitle,
                      arabicAware(item.title, 15),
                      arabic && styles.chapterTitleArabic,
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.actions}>
                    <IconBtn
                      icon="chevron-up"
                      disabled={index === 0}
                      onPress={() => run(() => BookService.moveChapter(book.id, item.id, 'up'))}
                    />
                    <IconBtn
                      icon="chevron-down"
                      disabled={index === chapters.length - 1}
                      onPress={() => run(() => BookService.moveChapter(book.id, item.id, 'down'))}
                    />
                    <IconBtn
                      icon="create-outline"
                      onPress={() =>
                        setEditor({ kind: 'renameChapter', chapterId: item.id, title: item.title })
                      }
                    />
                    <IconBtn
                      icon="trash-outline"
                      color={Colors.danger}
                      bg={Colors.dangerLight}
                      onPress={() => handleRemoveChapter(item)}
                    />
                  </View>
                </View>
              </Card>
            </FadeInView>
          );
        }}
      />

      <PickerModal
        visible={nextPickerVisible}
        title="Next book"
        selectedId={book.nextBookId || NO_NEXT_BOOK}
        options={[
          { id: NO_NEXT_BOOK, label: 'None' },
          ...allBooks
            .filter((b) => b.id !== book.id)
            .map((b) => ({ id: b.id, label: b.title, hint: `${b.chapterCount ?? 0} chapters` })),
        ]}
        onSelect={(o) => handleSetNextBook(o.id)}
        onClose={() => setNextPickerVisible(false)}
      />

      <Modal
        visible={editor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditor(null)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FadeInView style={[styles.sheet, { paddingBottom: Spacing.xl + insets.bottom }]}>
            <View style={styles.sheetHandle} />
            {editor ? (
              <View style={styles.sheetHeader}>
                <IconCircle
                  icon={editorIcon}
                  color={Colors.primary}
                  bg={Colors.primaryLight}
                  size={44}
                />
                <View style={styles.sheetHeaderText}>
                  <Text style={styles.modalTitle}>
                    {editor.kind === 'book'
                      ? 'Edit Book'
                      : editor.kind === 'addChapters'
                        ? 'Add Chapters'
                        : 'Rename Chapter'}
                  </Text>
                  <Text style={[styles.modalSub, arabicAware(book.title, 12)]} numberOfLines={1}>
                    {book.title}
                  </Text>
                </View>
              </View>
            ) : null}
            {editor?.kind === 'book' ? (
              <>
                <Input
                  label="Book name"
                  required
                  value={editor.title}
                  onChangeText={(t) => setEditor({ ...editor, title: t })}
                />
                <Input
                  label="Description"
                  value={editor.description}
                  onChangeText={(t) => setEditor({ ...editor, description: t })}
                  placeholder="Optional"
                />
              </>
            ) : editor?.kind === 'addChapters' ? (
              <>
                <Input
                  label="One chapter per line"
                  value={editor.text}
                  onChangeText={(t) => setEditor({ ...editor, text: t })}
                  placeholder={'Chapter 1\nChapter 2\nChapter 3'}
                  multiline
                  numberOfLines={6}
                  autoFocus
                />
              </>
            ) : editor?.kind === 'renameChapter' ? (
              <>
                <Input
                  label="Chapter name"
                  required
                  value={editor.title}
                  onChangeText={(t) => setEditor({ ...editor, title: t })}
                  autoFocus
                />
              </>
            ) : null}
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setEditor(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Save"
                icon="checkmark"
                onPress={handleSaveEditor}
                loading={saving}
                style={styles.modalBtn}
              />
            </View>
          </FadeInView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const IconBtn: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  bg?: string;
}> = ({ icon, onPress, disabled, color = Colors.textSecondary, bg = Colors.surfaceRaised }) => (
  <PressableScale
    onPress={onPress}
    disabled={disabled}
    style={[styles.iconBtn, { backgroundColor: disabled ? Colors.surface : bg }]}
    pressedScale={0.86}
    hapticOnPress
    hitSlop={3}
  >
    <Ionicons name={icon} size={16} color={disabled ? Colors.border : color} />
  </PressableScale>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  headerBlock: {
    gap: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Book header card
  bookTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  bookTitleCol: {
    flex: 1,
  },
  bookTitle: {
    ...Typography.titleMedium,
  },
  meta: {
    ...Typography.bodySmall,
    marginTop: 3,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  removedPill: {
    backgroundColor: Colors.dangerLight,
  },
  statText: {
    ...Typography.caption,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentLight,
  },
  nextTextCol: {
    flex: 1,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  nextValue: {
    ...Typography.bodyMedium,
    fontFamily: Fonts.bold,
    color: Colors.accentDark,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
  },
  hint: {
    ...Typography.caption,
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },

  // Chapter rows
  chapterCard: {
    paddingHorizontal: Spacing.md,
  },
  indexBadge: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  chapterTitle: {
    ...Typography.bodyLarge,
    fontFamily: Fonts.semibold,
    fontSize: 15,
    flex: 1,
  },
  chapterTitleArabic: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Editor sheet
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.borderDark,
    marginBottom: Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sheetHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.titleMedium,
  },
  modalSub: {
    ...Typography.bodySmall,
    marginTop: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  modalBtn: {
    flex: 1,
  },
});
